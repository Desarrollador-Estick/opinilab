// Corrección de automatización de producción (una sola vez).
//
// 1) Actualiza la config `automation_emails_config`: activa todas las
//    automatizaciones (auto-contacto, reseñas, borradores IA, informes) y fija
//    la cadencia de seguimiento de leads en 3 días (antes 7).
//
// 2) Reprograma `next_follow_up_at` de los leads ya contactados: los que
//    recibieron outbound_1 / followup_1 y aún no han completado la secuencia
//    pasan a tener next_follow_up_at = ahora, de modo que el próximo run del
//    cron (o el scraper de las 07:00) les envíe followup_1 / followup_2 ya,
//    en lugar de esperar los 7 días programados originalmente.
//
// Uso: node scripts/fix-automations.mjs [--verify]

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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const DAY_MS = 24 * 60 * 60 * 1000
const OUTREACH_TEMPLATES = ["outbound_1", "followup_1", "followup_2"]
const OUTREACH_STATUSES = ["contacted", "interested", "proposal_sent", "negotiation"]

async function main() {
  const now = new Date()

  // ── 1) Config de automatización ────────────────────────────────────────────
  const { data: settings } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "automation_emails_config")
    .maybeSingle()

  const stored =
    settings?.value && typeof settings.value === "object"
      ? settings.value
      : {}

  const nextConfig = {
    ...stored,
    review_request_enabled: true,
    review_auto_response_enabled: true,
    report_auto_send_enabled: true,
    report_send_delay_hours: 0,
    lead_auto_outreach_enabled: true,
    lead_outreach_next_days: 3,
  }

  console.log("Config actual `automation_emails_config`:", JSON.stringify(stored, null, 2))
  if (!VERIFY) {
    const { error } = await supabase.from("settings").upsert(
      {
        key: "automation_emails_config",
        value: nextConfig,
        category: "automation",
        description:
          "Configuración de automatizaciones de email: auto-contacto de leads del scraper, solicitudes de reseñas, borradores IA e informes mensuales",
        updated_at: now.toISOString(),
      },
      { onConflict: "key" }
    )
    if (error) {
      console.error("Error guardando config:", error.message)
      process.exit(1)
    }
    console.log("Config actualizada:", JSON.stringify(nextConfig))
  }

  // ── 2) Reprogramar next_follow_up_at de leads ya contactados ──────────────
  const since = new Date(now.getTime() - 90 * DAY_MS).toISOString()

  const { data: leads, error: leadsErr } = await supabase
    .from("leads")
    .select("id, business_name, email, status, next_follow_up_at")
    .in("status", OUTREACH_STATUSES)
    .not("email", "is", null)

  if (leadsErr) {
    console.error("Error consultando leads:", leadsErr.message)
    process.exit(1)
  }
  if (!leads || leads.length === 0) {
    console.log("No hay leads contactados con email.")
    return
  }

  const leadIds = leads.map((l) => l.id)

  const { data: sends } = await supabase
    .from("email_sends")
    .select("lead_id, template, status")
    .in("lead_id", leadIds)
    .in("template", OUTREACH_TEMPLATES)
    .gte("created_at", since)
    .eq("status", "sent")

  const sendCountByLead = new Map()
  for (const s of sends || []) {
    const k = s.lead_id
    const cur = sendCountByLead.get(k) || { out: 0, skipped: 0 }
    if (s.status === "skipped") cur.skipped++
    else cur.out++
    sendCountByLead.set(k, cur)
  }

  // La secuencia necesita = n.º de toques enviados. Se reprograma para disparar
  // el siguiente toque ya, salvo que la secuencia esté completa o el lead se
  // haya dado de baja.
  const toUpdate = []
  for (const lead of leads) {
    const counts = sendCountByLead.get(lead.id) || { out: 0, skipped: 0 }
    if (counts.out < 1 || counts.out > 2) continue // sin arrancar o ya completa
    if (counts.skipped > 0) continue // dado de baja
    const wasFuture =
      lead.next_follow_up_at === null || lead.next_follow_up_at > now.toISOString()

    if (wasFuture) {
      const nextTpl = counts.out === 1 ? "followup_1" : "followup_2"
      toUpdate.push({ lead, nextTpl })
    }
  }

  if (toUpdate.length === 0) {
    console.log("No hay leads que reprogramar.")
  } else {
    console.log(
      `\nReprogramando ${toUpdate.length} leads (siguiente toque inmediato):`
    )
    for (const { lead, nextTpl } of toUpdate) {
      console.log(`  → ${lead.business_name} (${lead.status}): ${nextTpl}`)
      if (!VERIFY) {
        await supabase
          .from("leads")
          .update({ next_follow_up_at: now.toISOString(), updated_at: now.toISOString() })
          .eq("id", lead.id)
      }
    }
  }

  console.log(VERIFY ? "\n(SOLO VERIFICACIÓN: no se escribió nada)" : "\nListo.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})