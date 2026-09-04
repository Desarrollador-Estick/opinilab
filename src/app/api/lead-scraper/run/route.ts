import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient } from "@/lib/supabase/admin"
import type { Database, Json } from "@/types/database"

const OVERPASS_URL = "https://overpass-api.de/api/interpreter"

// Mapeo de categorías del admin a tags de OpenStreetMap
const CATEGORY_TO_OSM: Record<string, string[]> = {
  restaurant: ["amenity=restaurant", "amenity=fast_food", "amenity=cafe"],
  dentist: ["amenity=dentist", "healthcare=dentist"],
  hairdresser: ["shop=hairdresser"],
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
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`)
  }

  const data = await response.json()
  return data.elements || []
}

function extractLeadFromElement(el: OverpassElement) {
  const tags = el.tags || {}
  const name = tags.name || tags["name:es"] || null
  if (!name) return null

  const phone = tags.phone || tags["contact:phone"] || tags["phone:mobile"] || null
  const website = tags.website || tags["contact:website"] || null
  const email = tags.email || tags["contact:email"] || null
  const street = tags["addr:street"] || ""
  const housenumber = tags["addr:housenumber"] || ""
  const city = tags["addr:city"] || ""
  const address = [street, housenumber, city].filter(Boolean).join(", ") || null

  // Rating y reviews de OpenStreetMap (no siempre disponibles)
  const rating = tags.stars ? Number(tags.stars) : null
  const reviews = tags.reviews ? Number(tags.reviews) : null

  return {
    business_name: name,
    phone,
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
  }
}

export async function POST() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // 1. Obtener configuración
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "lead_scraper_config")
      .single()

    const config = settingsRow?.value as Record<string, unknown> | null

    if (!config?.enabled) {
      return NextResponse.json({
        ok: true,
        message: "Lead scraper desactivado",
        leads_created: 0,
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

    if (remaining <= 0) {
      return NextResponse.json({
        ok: true,
        message: "Límite diario alcanzado",
        leads_created: 0,
        remaining: 0,
      })
    }

    // 3. Construir query Overpass
    const categories = (config.categories as string[]) || ["restaurant"]
    const cities = (config.cities as string[]) || ["Madrid"]
    const radius = Number(config.search_radius_m) || 5000

    const query = buildOverpassQuery(categories, cities, radius)
    const elements = await queryOverpass(query)

    // 4. Convertir a leads y deduplicar
    const leads = elements
      .map(extractLeadFromElement)
      .filter(Boolean) as Array<ReturnType<typeof extractLeadFromElement> & {}>

    let created = 0
    let skipped = 0
    const errors: string[] = []

    const adminSupabase = await createServerAdminClient()

    for (const lead of leads.slice(0, remaining)) {
      if (!lead) continue

      // Deduplicar por business_name + city
      const { data: existing } = await adminSupabase
        .from("leads")
        .select("id")
        .eq("business_name", lead.business_name)
        .eq("city", lead.city || "")
        .limit(1)

      if (existing && existing.length > 0) {
        skipped++
        continue
      }

      // Calcular score basado en datos disponibles
      let score = 50
      if (lead.website) score += 10
      if (lead.phone) score += 5
      if (lead.email) score += 10
      if (lead.rating && lead.rating >= 4) score += 10
      if (lead.reviews && lead.reviews >= 20) score += 10
      if (lead.reviews && lead.reviews >= 50) score += 5
      score = Math.min(score, 100)

      // Crear lead
      const { error } = await adminSupabase.from("leads").insert({
        business_name: lead.business_name,
        contact_name: null,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        city: lead.city,
        industry: null,
        source: "auto_scraped",
        status: "new",
        score,
        notes: [
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

    // 5. Log de la ejecución
    const duration = Date.now() - startTime
    await adminSupabase.from("lead_scraper_log").insert({
      leads_found: leads.length,
      leads_created: created,
      leads_skipped: skipped,
      errors: errors.length > 0 ? errors.join("\n") : null,
      config_snapshot: config as unknown as Json,
      duration_ms: duration,
    })

    return NextResponse.json({
      ok: true,
      message: "Lead scraper completado",
      leads_found: leads.length,
      leads_created: created,
      leads_skipped: skipped,
      remaining: remaining - created,
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
