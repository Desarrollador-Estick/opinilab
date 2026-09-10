import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { isCronRequestAuthorized, unauthorizedResponse } from "@/lib/cron-auth"
import {
  autoLeadOutreach,
  getAutomationEmailsConfig,
} from "@/lib/automation/lead-outreach"
import type { Json } from "@/types/database"

// El endpoint principal rechaza con 406 las peticiones sin User-Agent
// identificativo (reglas anti-bots de overpass-api.de). Se intentan espejos
// si el principal responde 406/429/5xx.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
]

const USER_AGENT = "OpiniLab-LeadScraper/1.0 (https://opinilab.com; cron lead-scraper)"

// Mapeo de categorías del admin a tags de OpenStreetMap
const CATEGORY_TO_OSM: Record<string, string[]> = {
  restaurant: ["amenity=restaurant", "amenity=fast_food", "amenity=cafe"],
  dentist: ["amenity=dentist", "healthcare=dentist"],
  hairdresser: ["shop=hairdresser"],
  beauty: ["shop=beauty", "shop=cosmetics", "shop=beautician"],
  spa: ["amenity=spa", "leisure=spa"],
  gym: ["leisure=fitness_centre", "amenity=gym"],
  clinic: ["amenity=clinic", "healthcare=clinic"],
  pharmacy: ["amenity=pharmacy"],
  bakery: ["shop=bakery"],
  hotel: ["tourism=hotel", "tourism=hostel"],
  mechanic: ["shop=car_repair"],
  lawyer: ["office=lawyer"],
  architect: ["office=architect"],
  accountant: ["office=accountant"],
  "real estate": ["office=estate_agent"],
  florist: ["shop=florist"],
  photographer: ["shop=photo"],
}

// Coordenadas de ciudades españolas (centro + radio)
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  madrid: { lat: 40.4168, lon: -3.7038 },
  barcelona: { lat: 41.3874, lon: 2.1686 },
  valencia: { lat: 39.4699, lon: -0.3763 },
  sevilla: { lat: 37.3891, lon: -5.9845 },
  bilbao: { lat: 43.263, lon: -2.935 },
  zaragoza: { lat: 41.6488, lon: -0.8891 },
  malaga: { lat: 36.7213, lon: -4.4214 },
  murcia: { lat: 37.987, lon: -1.13 },
  palma: { lat: 39.5696, lon: 2.6502 },
  "las palmas": { lat: 28.1235, lon: -15.4363 },
  alicante: { lat: 38.3452, lon: -0.481 },
  cordoba: { lat: 37.8882, lon: -4.7794 },
  valladolid: { lat: 41.6523, lon: -4.7245 },
  vigo: { lat: 42.2406, lon: -8.7207 },
  gijon: { lat: 43.5322, lon: -5.6611 },
  granada: { lat: 37.1773, lon: -3.5986 },
  "a coruna": { lat: 43.3713, lon: -8.396 },
  santander: { lat: 43.4623, lon: -3.81 },
  "san sebastian": { lat: 43.3183, lon: -1.9812 },
}

// Tags de OpenStreetMap para redes sociales
const SOCIAL_TAG_KEYS: Record<string, string[]> = {
  facebook: ["contact:facebook", "facebook", "contact:facebook_id", "facebook_id"],
  instagram: ["contact:instagram", "instagram"],
  twitter: ["contact:twitter", "twitter", "contact:twitter_id"],
  linkedin: ["contact:linkedin", "linkedin"],
  youtube: ["contact:youtube", "youtube"],
  tiktok: ["contact:tiktok", "tiktok"],
  whatsapp: ["contact:whatsapp", "whatsapp"],
  telegram: ["contact:telegram", "telegram"],
  pinterest: ["contact:pinterest", "pinterest"],
}

// Patrones de redes sociales para encontrar enlaces en el HTML de la web
const SOCIAL_URL_PATTERNS: Record<string, string[]> = {
  facebook: ["facebook.com/", "fb.com/"],
  instagram: ["instagram.com/"],
  twitter: ["twitter.com/", "x.com/"],
  linkedin: ["linkedin.com/company/", "linkedin.com/in/"],
  youtube: ["youtube.com/", "youtu.be/"],
  tiktok: ["tiktok.com/"],
  pinterest: ["pinterest.com/"],
  whatsapp: ["wa.me/", "whatsapp.com/"],
}

const IMG_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "css", "js", "ico"])

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
}

function buildOverpassQuery(
  categories: string[],
  cities: string[],
  radius: number
): string {
  const queries: string[] = []

  for (const city of cities) {
    const coords = CITY_COORDS[city.toLowerCase()]
    if (!coords) continue

    const tagsForCity: string[] = []
    for (const cat of categories) {
      const osmTags = CATEGORY_TO_OSM[cat.toLowerCase()] || [`amenity=${cat}`]
      for (const tag of osmTags) {
        const [key, value] = tag.split("=")
        if (value) {
          tagsForCity.push(
            `node["${key}"="${value}"](around:${radius},${coords.lat},${coords.lon});`
          )
          tagsForCity.push(
            `way["${key}"="${value}"](around:${radius},${coords.lat},${coords.lon});`
          )
        }
      }
    }

    if (tagsForCity.length > 0) {
      queries.push(`(${tagsForCity.join("\n")}\n);`)
    }
  }

  return `
    [out:json][timeout:30];
    ${queries.join("\n")}
    out center body;
  `
}

async function queryOverpass(query: string): Promise<OverpassElement[]> {
  const errors: string[] = []

  for (const url of OVERPASS_ENDPOINTS) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (response.ok) {
      const data = await response.json()
      return data.elements || []
    }

    errors.push(`${new URL(url).host}: ${response.status}`)
    if (response.status === 400) break
  }

  throw new Error(`Overpass API error: ${errors.join(", ")}`)
}

function extractSocialsFromTags(tags: Record<string, string>): Record<string, string> {
  const socials: Record<string, string> = {}
  for (const [key, tagKeys] of Object.entries(SOCIAL_TAG_KEYS)) {
    for (const tagKey of tagKeys) {
      const raw = tags[tagKey]
      if (!raw) continue
      socials[key] = raw.startsWith("http") ? raw : `https://${raw}`
      break
    }
  }
  return socials
}

function extractLeadFromElement(el: OverpassElement) {
  const tags = el.tags || {}
  const name = tags.name || tags["name:es"] || null
  if (!name) return null

  const website = tags.website || tags["contact:website"] || tags["url"] || null
  const email = tags.email || tags["contact:email"] || null
  const street = tags["addr:street"] || ""
  const housenumber = tags["addr:housenumber"] || ""
  const city = tags["addr:city"] || ""
  const address = [street, housenumber, city].filter(Boolean).join(", ") || null

  // Rating y reviews de OpenStreetMap (no siempre disponibles)
  const rating = tags.stars ? Number(tags.stars) : null
  const reviews = tags.reviews ? Number(tags.reviews) : null

  const social_media = extractSocialsFromTags(tags)

  return {
    business_name: name,
    website,
    email,
    city: city || null,
    industry: null,
    address,
    rating,
    reviews,
    lat: el.lat || null,
    lon: el.lon || null,
    osm_id: el.id,
    osm_type: el.type,
    social_media,
  }
}

// ---------------------------------------------------------------------------
// Cálculo de prioridad: se prefiere capturar negocios con email y redes
// sociales, pero los negocios SIN email también se crean para luego hacerles
// un seguimiento (búsqueda del email).
// ---------------------------------------------------------------------------
function leadPriority(lead: {
  email?: string | null
  social_media?: Record<string, string> | null
  website?: string | null
  reviews?: number | null
}): number {
  let p = 0
  if (lead.email) p += 3
  if (lead.social_media && Object.keys(lead.social_media).length > 0) p += 2
  if (lead.website) p += 1
  if (lead.reviews) p += 1
  return p
}

// ---------------------------------------------------------------------------
// Seguimiento: búsqueda de emails y redes en la web de negocios sin email
// ---------------------------------------------------------------------------
function isValidEmail(email: string): boolean {
  const domain = email.split("@").pop()?.toLowerCase() ?? ""
  if (!domain.includes(".")) return false
  const [name, ext] = domain.split(".").slice(-2)
  if (!/[a-z]/.test(name || "")) return false
  if (IMG_EXTENSIONS.has(ext)) return false
  return true
}

function extractEmailsFromText(text: string): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const m of text.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase().replace(/[.,;:)]+$/, "")
    if (!isValidEmail(email)) continue
    if (seen.has(email)) continue
    seen.add(email)
    result.push(email)
  }
  return result
}

function extractSocialUrlsFromText(text: string): Record<string, string> {
  const socials: Record<string, string> = {}
  for (const m of text.matchAll(/href=["']([^"']+)["']/g)) {
    const raw = m[1]
    const url = raw.startsWith("http") ? raw : raw.startsWith("//") ? `https:${raw}` : null
    if (!url) continue
    const lower = url.toLowerCase()
    for (const [name, patterns] of Object.entries(SOCIAL_URL_PATTERNS)) {
      if (socials[name]) continue
      if (patterns.some((p) => lower.includes(p))) {
        socials[name] = url
        break
      }
    }
  }
  return socials
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const text = await res.text()
    return text.length > 500_000 ? text.slice(0, 500_000) : text
  } catch {
    return null
  }
}

function buildCandidateUrls(website: string): string[] {
  const base = website.trim()
  const normalized = base.startsWith("http") ? base : `https://${base}`
  const candidates = [normalized]
  const lower = normalized.toLowerCase()
  for (const path of ["/contact", "/contacto", "/contact-us", "/contactus", "/about", "/sobre-nosotros", "/quienes-somos"]) {
    if (!lower.endsWith(path)) candidates.push(`${normalized}${path}`)
  }
  return [...new Set(candidates)]
}

async function bingSearch(
  query: string
): Promise<{ emails: string[]; urls: string[] }> {
  const html = await fetchText(
    `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=es&count=5`,
    10000
  )
  if (!html) return { emails: [], urls: [] }

  const emails = extractEmailsFromText(html)
  const urls: string[] = []
  for (const m of html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/g)) {
    const url = m[1]
    if (/bing\.com|microsoft\.com|bing\.net|msn\.com/.test(url)) continue
    if (urls.includes(url)) continue
    urls.push(url)
    if (urls.length >= 8) break
  }
  return { emails, urls }
}

interface LeadForEnrichment {
  id: string
  business_name: string
  email: string | null
  website: string | null
  city: string | null
  score: number | null
  social_media: Json | null
  notes: string | null
}

async function enrichSingleLead(
  client: Awaited<ReturnType<typeof createServerAdminClient>>,
  lead: LeadForEnrichment
): Promise<boolean> {
  const today = new Date().toISOString()
  const emailSeen = new Set<string>()
  const emails: string[] = []
  const socials: Record<string, string> =
    lead.social_media && typeof lead.social_media === "object"
      ? { ...(lead.social_media as Record<string, string>) }
      : {}

  const candidateUrls: string[] = lead.website
    ? buildCandidateUrls(lead.website)
    : []

  // Sin web: búsqueda en Bing como seguimiento para localizar email/redes
  if (candidateUrls.length === 0) {
    const query = `${lead.business_name} ${lead.city || ""} contacto email`.trim()
    const search = await bingSearch(query)
    candidateUrls.push(...search.urls.slice(0, 5))
    for (const email of search.emails) {
      if (!emailSeen.has(email)) {
        emailSeen.add(email)
        emails.push(email)
      }
    }
  }

  for (const url of candidateUrls) {
    const text = await fetchText(url)
    if (!text) continue
    for (const email of extractEmailsFromText(text)) {
      if (!emailSeen.has(email)) {
        emailSeen.add(email)
        emails.push(email)
      }
    }
    Object.assign(socials, extractSocialUrlsFromText(text))
  }

  const socialCount = Object.keys(socials).length
  const emailFound = emails.length > 0

  // Actualizar siempre la marca de intento; solo se cambia email/redes si hay éxito
  const updatePayload: {
    email_last_attempt_at: string
    email?: string
    social_media?: Json
    notes?: string
    score?: number
  } = { email_last_attempt_at: today }

  if (emailFound) {
    updatePayload.email = emails[0]
    updatePayload.notes = lead.notes
      ? `${lead.notes} | Email encontrado (seguimiento): ${emails.slice(0, 3).join(", ")}`
      : `Email encontrado (seguimiento): ${emails.slice(0, 3).join(", ")}`
    updatePayload.score = Math.min((lead.score ?? 50) + 10, 100)
    if (socialCount > 0) {
      updatePayload.social_media = socials as Json
      updatePayload.score = Math.min((lead.score ?? 50) + 20, 100)
    }
  } else if (socialCount > 0) {
    updatePayload.social_media = socials as Json
  }

  await client.from("leads").update(updatePayload).eq("id", lead.id)

  return emailFound
}

async function enrichLeadsWithoutEmail(
  client: Awaited<ReturnType<typeof createServerAdminClient>>,
  limit: number
): Promise<number> {
  // No re-intentar antes de 7 días para evitar golpear webs repetidamente
  const retryAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: leads, error } = await client
    .from("leads")
    .select("id, business_name, email, website, city, score, social_media, notes")
    .eq("source", "auto_scraped")
    .is("email", null)
    .or(`email_last_attempt_at.is.null,email_last_attempt_at.lt.${retryAfter}`)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("[lead-scraper] enrichLeadsWithoutEmail error:", error.message)
    return 0
  }
  if (!leads || leads.length === 0) return 0

  let enriched = 0
  for (const lead of leads as LeadForEnrichment[]) {
    const found = await enrichSingleLead(client, lead)
    if (found) enriched++
  }
  return enriched
}

async function runLeadScraper(forced = false) {
  const startTime = Date.now()

  try {
    // Cron (GET) no tiene sesión de usuario: usamos la service role cuando está
    // configurada (omite RLS). Para el botón del dashboard (POST) con sesión,
    // si no hay service role usamos el cliente de servidor normal.
    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await createClient()

    // 1. Obtener configuración
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "lead_scraper_config")
      .single()

    const config = (settingsRow?.value as Record<string, unknown> | null) ?? {}

    // El cron diario solo se ejecuta si está activado. El botón "Ejecutar Ahora"
    // (forced) hace una ejecución manual aunque el programa diario esté apagado.
    if (!forced && !config.enabled) {
      return NextResponse.json({
        ok: true,
        message: "Lead scraper desactivado",
        leads_created: 0,
        leads_enriched: 0,
      })
    }

    // 2. Verificar límite diario
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: todayLeads } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("source", "auto_scraped")
      .gte("created_at", today.toISOString())

    const dailyLimit = Number(config.daily_limit) || 20
    const remaining = dailyLimit - (todayLeads || 0)

    // 3. Construir query Overpass
    const categories = (config.categories as string[]) || ["beauty", "hairdresser", "spa"]
    const cities = (config.cities as string[]) || ["Madrid"]
    const radius = Number(config.search_radius_m) || 5000
    const thresholdRating = Number(config.min_rating) || 0
    const thresholdReviews = Number(config.min_reviews) || 0
    const excludeWithoutWebsite = Boolean(config.exclude_without_website)

    const query = buildOverpassQuery(categories, cities, radius)
    const elements = await queryOverpass(query)

    // 4. Convertir a leads, filtrar y priorizar (con email/redes primero)
    const candidates = elements
      .map(extractLeadFromElement)
      .filter(Boolean) as Array<ReturnType<typeof extractLeadFromElement> & {}>

    const filtered = candidates.filter((lead) => {
      if (lead.rating !== null && thresholdRating > 0 && lead.rating < thresholdRating) {
        return false
      }
      if (lead.reviews !== null && thresholdReviews > 0 && lead.reviews < thresholdReviews) {
        return false
      }
      if (excludeWithoutWebsite && !lead.website) {
        return false
      }
      return true
    })

    const priorityLeads = [...filtered].sort(
      (a, b) => leadPriority(b) - leadPriority(a)
    )

    let created = 0
    let skipped = 0
    const errors: string[] = []

    const adminSupabase = await createServerAdminClient()

    for (const lead of priorityLeads.slice(0, Math.max(remaining, 0))) {
      if (!lead) continue

      // Deduplicar por business_name + city (normalizado para evitar duplicados
      // por variaciones de mayúsculas/espacios). Se usa ilike (insensible a
      // mayúsculas). Si la ciudad es null/"" se busca solo por nombre, porque
      // ilike(null) nunca coincide en PostgreSQL.
      const normalizedName = ((lead.business_name || "").toString().trim())
        .replace(/[%_\\]/g, (ch) => "\\" + ch)
      const normalizedCity = (lead.city || "").toString().trim()

      let dedupQuery = adminSupabase
        .from("leads")
        .select("id")
        .ilike("business_name", normalizedName)
      if (normalizedCity) {
        dedupQuery = dedupQuery.ilike("city", normalizedCity)
      } else {
        dedupQuery = dedupQuery.or("city.is.null,city.eq.''")
      }
      const { data: existing } = await dedupQuery.limit(1)

      if (existing && existing.length > 0) {
        skipped++
        continue
      }

      // Calcular score basado en datos disponibles
      const socialCount = lead.social_media ? Object.keys(lead.social_media).length : 0
      let score = 50
      if (lead.website) score += 10
      if (lead.email) score += 15
      if (socialCount > 0) score += Math.min(socialCount, 2) * 10
      if (lead.rating && lead.rating >= 4) score += 10
      if (lead.reviews && lead.reviews >= 20) score += 10
      if (lead.reviews && lead.reviews >= 50) score += 5
      score = Math.min(score, 100)

      const socialMediaJson = lead.social_media && socialCount > 0 ? lead.social_media : {}

      const { error } = await adminSupabase.from("leads").insert({
        business_name: lead.business_name,
        contact_name: null,
        email: lead.email,
        website: lead.website,
        city: lead.city,
        industry: null,
        source: "auto_scraped",
        status: "new",
        score,
        social_media: socialMediaJson as Json,
        notes: [
          socialCount > 0
            ? `Redes: ${Object.entries(lead.social_media || {})
                .map(([k, v]) => `${k} (${v})`)
                .join(", ")}`
            : null,
          lead.email ? "Email en ficha OSM" : "Sin email: se buscará email automáticamente",
          lead.rating ? `Rating: ${lead.rating}/5` : null,
          lead.reviews ? `${lead.reviews} reseñas` : null,
          lead.address ? `Dirección: ${lead.address}` : null,
          lead.osm_id ? `OSM: ${lead.osm_type}/${lead.osm_id}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      })

      if (error) {
        errors.push(`${lead.business_name}: ${error.message}`)
      } else {
        created++
      }
    }

    // 5. Seguimiento: buscar emails de leads capturados sin email
    //    (se ejecuta aunque se haya alcanzado el límite diario de creación)
    let enriched = 0
    if (config.enrich_without_email !== false) {
      const enrichLimit = Number(config.enrich_limit) || 15
      try {
        enriched = await enrichLeadsWithoutEmail(adminSupabase, enrichLimit)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        errors.push(`enrichment: ${msg}`)
      }
    }

    // 5b. AUTO-CONTACTO INMEDIATO: nada más haber leads con email (recién
    //     capturados o enriquecidos en esta ejecución), se lanza la campaña
    //     automáticamente (outbound_1). No espera al cron de las 09:00 ni al
    //     botón manual. El envío real solo ocurre si "Auto-contacto de leads"
    //     está activado en Configuración → Automatización.
    let leadsOutreached = 0
    try {
      const automationConfig = await getAutomationEmailsConfig(adminSupabase)
      const outreachLogs: Array<{
        action: string
        details: string
        timestamp: string
      }> = []
      await autoLeadOutreach(adminSupabase, automationConfig, new Date(), outreachLogs)
      leadsOutreached = outreachLogs.filter(
        (l) => l.action === "lead_outbound" && l.details.includes("success")
      ).length
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      errors.push(`outreach: ${msg}`)
    }

    // 6. Log de la ejecución
    const duration = Date.now() - startTime
    await adminSupabase.from("lead_scraper_log").insert({
      leads_found: filtered.length,
      leads_created: created,
      leads_skipped: skipped,
      leads_enriched: enriched,
      leads_outreached: leadsOutreached,
      errors: errors.length > 0 ? errors.join("\n") : null,
      config_snapshot: config as unknown as Json,
      duration_ms: duration,
    })

    return NextResponse.json({
      ok: true,
      message: "Lead scraper completado",
      leads_found: filtered.length,
      leads_created: created,
      leads_skipped: skipped,
      leads_enriched: enriched,
      leads_outreached: leadsOutreached,
      remaining: Math.max(remaining - created, 0),
      duration_ms: duration,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Intentar logear el error
    try {
      const adminSupabase = await createServerAdminClient()
      await adminSupabase.from("lead_scraper_log").insert({
        leads_found: 0,
        leads_created: 0,
        leads_skipped: 0,
        leads_enriched: 0,
        errors: errorMessage,
        config_snapshot: {},
        duration_ms: duration,
      })
    } catch {}

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST() {
  // Botón "Ejecutar Ahora" del dashboard: ejecución manual (no depende de que
  // el programa diario esté activado).
  return runLeadScraper(true)
}

// Perfil del cron de Vercel: se invoca con GET y lleva el header de autorización
// (Bearer CRON_SECRET) que Vercel añade automáticamente. Solo corre si el
// scraper está activado en la configuración.
export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return unauthorizedResponse()
  }
  return runLeadScraper(false)
}