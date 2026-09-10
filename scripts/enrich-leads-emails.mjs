// Enriquecimiento de email y teléfono para leads sin esos datos.
// Busca email/teléfono de cada lead en su web (y páginas de contacto) y en Bing.
// Actualiza en Supabase los datos encontrados.
//
// Uso: node scripts/enrich-leads-emails.mjs [--limit 10] [--verify]
//
// --verify  no actualiza la BD, solo muestra lo que se encontraría.

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnv(filePath) {
  const env = {}
  if (!fs.existsSync(filePath)) return env
  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let value = m[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const env = loadEnv(path.resolve(process.cwd(), ".env.local"))

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}

const VERIFY = process.argv.includes("--verify")
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const USER_AGENT = "OpiniLab-LeadEnricher/1.0 (https://opinilab.com)"
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const IMG_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "css", "js", "ico"])
const PHONE_RE = /(?<![\d+])(?:\+?34[\s.-]?|0034[\s.-]?)?[6789]\d{2}(?:[\s.-]?\d{3}){2}(?!\d)/g

function normalizePhone(raw) {
  let digits = (raw || "").replace(/\D/g, "")
  if (digits.startsWith("0034")) digits = digits.slice(4)
  else if (digits.startsWith("34") && digits.length === 11) digits = digits.slice(2)
  if (digits.length !== 9 || !/^[6789]/.test(digits)) return null
  return `+34 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
}

function extractPhonesFromText(text) {
  const seen = new Set()
  const result = []
  for (const m of text.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    const phone = normalizePhone(m[1])
    if (phone && !seen.has(phone)) {
      seen.add(phone)
      result.push(phone)
    }
  }
  for (const m of text.matchAll(PHONE_RE)) {
    const phone = normalizePhone(m[0])
    if (phone && !seen.has(phone)) {
      seen.add(phone)
      result.push(phone)
    }
  }
  return result
}

const SOCIAL_URL_PATTERNS = {
  facebook: ["facebook.com/", "fb.com/"],
  instagram: ["instagram.com/"],
  twitter: ["twitter.com/", "x.com/"],
  linkedin: ["linkedin.com/company/", "linkedin.com/in/"],
  youtube: ["youtube.com/", "youtu.be/"],
  tiktok: ["tiktok.com/"],
  pinterest: ["pinterest.com/"],
  whatsapp: ["wa.me/", "whatsapp.com/"],
}

function isValidEmail(email) {
  const domain = email.split("@").pop()?.toLowerCase() ?? ""
  if (!domain.includes(".")) return false
  const [name, ext] = domain.split(".").slice(-2)
  if (!/[a-z]/.test(name || "")) return false
  if (IMG_EXTENSIONS.has(ext)) return false
  return true
}

function extractEmailsFromText(text) {
  const result = []
  const seen = new Set()
  for (const m of text.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase().replace(/[.,;:)]+$/, "")
    if (!isValidEmail(email)) continue
    if (seen.has(email)) continue
    seen.add(email)
    result.push(email)
  }
  return result
}

function extractSocialUrlsFromText(text) {
  const socials = {}
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

async function fetchText(url, timeoutMs = 10000) {
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

function buildCandidateUrls(website) {
  const base = website.trim()
  const normalized = base.startsWith("http") ? base : `https://${base}`
  const candidates = [normalized]
  const lower = normalized.toLowerCase()
  for (const p of ["/contact", "/contacto", "/contact-us", "/contactus", "/about", "/sobre-nosotros", "/quienes-somos"]) {
    if (!lower.endsWith(p)) candidates.push(`${normalized}${p}`)
  }
  return [...new Set(candidates)]
}

async function bingSearch(query) {
  const html = await fetchText(
    `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=es&count=5`,
    12000
  )
  if (!html) return { emails: [], urls: [] }
  const emails = extractEmailsFromText(html)
  const urls = []
  for (const m of html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/g)) {
    const url = m[1]
    if (/bing\.com|microsoft\.com|bing\.net|msn\.com/.test(url)) continue
    if (urls.includes(url)) continue
    urls.push(url)
    if (urls.length >= 8) break
  }
  return { emails, urls }
}

// Tokens significativos del nombre del negocio (>=3 letras, sin palabras de uso común).
function nameTokens(businessName) {
  const stop = new Set([
    "hotel", "hostal", "bar", "cafe", "restaurante", "taberna", "cerveceria",
    "restaurant", "los", "las", "el", "la", "del", "de", "san", "don", "dona",
    "casa", "farm", "farmacia", "oficina", "se", "sl", "grupo",
  ])
  return (businessName || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stop.has(t))
}

// ¿El email menciona el negocio? Solo vale para dominios con tokens propios
// (no gmail/hotmail/outlook genéricos).
function emailMentionsBusiness(email, tokens) {
  if (tokens.length === 0) return true // sin tokens, no podemos juzgar
  const local = email.split("@")[0]?.toLowerCase() ?? ""
  const domain = email.split("@").pop()?.toLowerCase() ?? ""
  const top = domain.split(".").slice(-2).join(".")
  const generic = new Set(["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "btconnect.com", "live.com"])
  if (generic.has(top)) return false
  return tokens.some((t) => local.includes(t) || domain.includes(t))
}

async function enrichLead(lead) {
  const emailSeen = new Set()
  const emails = []
  const phoneSeen = new Set()
  const phones = []
  const socials =
    lead.social_media && typeof lead.social_media === "object"
      ? { ...lead.social_media }
      : {}
  const tokens = nameTokens(lead.business_name)

  // Los teléfonos solo se aceptan desde la web oficial del negocio:
  // páginas de directorios devueltas por Bing repiten números de otros
  // negocios y contaminarían la BD.
  const ownHost = lead.website
    ? (() => {
        try {
          return new URL(
            lead.website.startsWith("http") ? lead.website : `https://${lead.website}`
          ).hostname.replace(/^www\./, "")
        } catch {
          return null
        }
      })()
    : null

  const candidateUrls = lead.website ? buildCandidateUrls(lead.website) : []

  if (candidateUrls.length === 0) {
    // Entrecomillar el nombre acota los resultados de Bing al negocio real.
    const query = `"${lead.business_name}" ${lead.city || ""} email contacto`.trim()
    const search = await bingSearch(query)
    candidateUrls.push(...search.urls.slice(0, 5))
    // Los emails de snippets de Bing solo se aceptan si mencionan el negocio.
    // Los teléfonos de snippets NO se usan: no se pueden atribuir al negocio
    // (se vio repetido el mismo número en muchos negocios distintos).
    for (const email of search.emails) {
      if (emailMentionsBusiness(email, tokens) && !emailSeen.has(email)) {
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
    const urlOwn = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "")
      } catch {
        return null
      }
    })()
    if (ownHost && urlOwn === ownHost) {
      for (const phone of extractPhonesFromText(text)) {
        if (!phoneSeen.has(phone)) {
          phoneSeen.add(phone)
          phones.push(phone)
        }
      }
    }
    Object.assign(socials, extractSocialUrlsFromText(text))
  }

  return { emails, phones, socials }
}

async function main() {
  let query = supabase
    .from("leads")
    .select("id, business_name, email, phone, website, city, score, social_media, notes")
    .eq("source", "auto_scraped")
    .or("email.is.null,phone.is.null")
    .not("status", "in", '("won","lost")')
    .order("created_at", { ascending: true })

  if (LIMIT > 0) query = query.limit(LIMIT)

  const { data: leads, error } = await query

  if (error) {
    console.error("Error consultando leads:", error.message)
    process.exit(1)
  }
  if (!leads || leads.length === 0) {
    console.log("No hay leads sin email.")
    return
  }

  console.log(`Procesando ${leads.length} leads sin email o teléfono (${VERIFY ? "SOLO VERIFICACIÓN" : "CON ACTUALIZACIÓN"}):`)

  const start = Date.now()

  // Fase 1: recopilar resultados de cada lead (sin escribir)
  const results = []
  for (const lead of leads) {
    const { emails, phones, socials } = await enrichLead(lead)
    results.push({ lead, emails, phones, socials })
    await new Promise((r) => setTimeout(r, 300))
  }

  // Fase 2: descartar teléfonos que aparecen en ≥3 negocios distintos
  // (se repite un número sospechoso de páginas de directorios o snippets).
  const phoneCount = new Map()
  for (const r of results) {
    for (const p of new Set(r.phones)) {
      phoneCount.set(p, (phoneCount.get(p) || 0) + 1)
    }
  }
  const phoneSuspicious = new Set(
    [...phoneCount.entries()].filter(([, c]) => c >= 3).map(([p]) => p)
  )
  if (phoneSuspicious.size > 0) {
    console.log(
      `\nTeléfonos sospechosos descartados (repetidos en varios negocios): ${[...phoneSuspicious].join(", ")}`
    )
  }

  let found = 0
  let failed = 0

  for (const { lead, emails, phones, socials } of results) {
    const cleanPhones = phones.filter((p) => !phoneSuspicious.has(p))
    const socialCount = Object.keys(socials).length
    const emailFound = emails.length > 0
    const phoneFound = cleanPhones.length > 0
    const tag = emailFound || phoneFound ? "✅" : "❌"
    const detail = [
      emailFound ? `📧 ${emails.slice(0, 3).join(", ")}` : null,
      phoneFound ? `📞 ${cleanPhones[0]}` : null,
      !emailFound && !phoneFound && socialCount > 0 ? "redes actualizadas" : null,
    ].filter(Boolean).join(" · ")

    if (VERIFY) {
      console.log(`${tag} ${lead.business_name}: ${detail || "no encontrado"}`)
    } else if (emailFound || phoneFound || socialCount > 0) {
      const payload = { email_last_attempt_at: new Date().toISOString() }
      if (emailFound) {
        payload.email = emails[0]
        payload.notes = lead.notes
          ? `${lead.notes} | Email encontrado (seguimiento): ${emails.slice(0, 3).join(", ")}`
          : `Email encontrado (seguimiento): ${emails.slice(0, 3).join(", ")}`
        payload.score = Math.min((lead.score ?? 50) + 10, 100)
      }
      if (phoneFound && !lead.phone) {
        payload.phone = cleanPhones[0]
        if (!emailFound) {
          payload.notes = lead.notes
            ? `${lead.notes} | Teléfono encontrado (seguimiento): ${cleanPhones.join(", ")}`
            : `Teléfono encontrado (seguimiento): ${cleanPhones.join(", ")}`
          payload.score = Math.min((lead.score ?? 50) + 5, 100)
        }
      }
      if (socialCount > 0) {
        payload.social_media = socials
        payload.score = Math.min((lead.score ?? 50) + 20, 100)
      }
      const { error: updErr } = await supabase.from("leads").update(payload).eq("id", lead.id)
      if (updErr) {
        console.error(`⚠️  ${lead.business_name}: error actualizando: ${updErr.message}`)
        failed++
        continue
      }
      console.log(`${tag} ${lead.business_name}: ${detail || "redes actualizadas"}`)
    } else {
      await supabase.from("leads").update({ email_last_attempt_at: new Date().toISOString() }).eq("id", lead.id)
      console.log(`${tag} ${lead.business_name}: no encontrado`)
    }

    if (emailFound || phoneFound) found++
  }

  console.log(`\nResumen: ${leads.length} leads, ${found} con datos, ${failed} errores, ${((Date.now() - start) / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})