// Empuje puntual de la automatización recién desplegada (una sola vez).
// Reproduce exactamente la fase 2 (seguimiento rotativo) y fase 1 (primer toque)
// de src/lib/automation/lead-outreach.ts contra PRODUCCIÓN, para que los 42
// leads reprogramados por fix-automations.mjs reciban su follow-up YA, sin
// esperar al cron de las 07:00.
//
// Uso: node scripts/kick-automation.mjs

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

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
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const DAY_MS = 24 * 60 * 60 * 1000
const OUTREACH_TEMPLATES = ["outbound_1", "followup_1", "followup_2"]

async function getDbTemplate(key, vars) {
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle()
  if (!data) return null
  const fill = (s) => {
    let out = s || ""
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v ?? ""))
    }
    return out.trim()
  }
  return { subject: fill(data.subject), body: fill(data.body) }
}

async function isSuppressed(email) {
  const { data } = await supabase
    .from("unsubscribes")
    .select("id")
    .eq("email", email)
    .limit(1)
  return data && data.length > 0
}

function fallbackTemplate(tplKey, leadName, business) {
  const company = "OpiniLab"
  if (tplKey === "outbound_1") {
    return {
      subject: `Reseñas y visibilidad para ${business} (oferta 49€/mes)`,
      html: `<p>Hola <strong>${leadName}</strong>:</p>
<p>Hola de nuevo.</p>`,
    }
  }
  if (tplKey === "followup_1") {
    return {
      subject: `¿Podemos ayudarte con tu marketing? - ${company}`,
      html: `<p>Hola <strong>${leadName}</strong>:</p>
<p>Te escribimos de nuevo sobre ${business}.</p>`,
    }
  }
  return {
    subject: `Último aviso: 49€/mes para ${business}`,
    html: `<p>Hola <strong>${leadName}</strong>:</p>
<p>Última comunicación sobre ${business}.</p>`,
  }
}

async function sendEmailExact({ to, template, subject, html, leadId, from }) {
  const resend = new Resend(env.RESEND_API_KEY)
  if (await isSuppressed(to)) {
    await supabase.from("email_sends").insert({
      to, from, subject, template, lead_id: leadId, status: "skipped",
    })
    return "skipped"
  }
  const footer = `<div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb;"><p style="margin:0; font-size:11px; color:#9ca3af; text-align:center;">Recibes este correo porque contactamos contigo tras ver tu negocio en Google.</p><a href="https://www.opinilab.com/api/email/unsubscribe?email=${encodeURIComponent(to)}" style="color:#6b7280;">darse de baja aquí</a></div>`
  try {
    const res = await resend.emails.send({
      from, to: [to], subject,
      html: html + footer,
    })
    const ok = !res.error
    await supabase.from("email_sends").insert({
      to, from, subject, template, lead_id: leadId, resend_id: res.data?.id || null,
      status: ok ? "sent" : "failed",
    })
    return ok ? "sent" : "failed"
  } catch {
    return "failed"
  }
}

async function main() {
  const now = new Date()
  const startOfDay = new Date(now.toDateString()).toISOString()
  const from = env.EMAIL_FROM || "hola@opinilab.com"
  const { data: cfgRow } = await supabase
    .from("settings").select("value").eq("key", "automation_emails_config").maybeSingle()
  const cfg = { ...(cfgRow?.value && typeof cfgRow.value === "object" ? cfgRow.value : {}) }
  const nextDays = Math.max(Number(cfg.lead_outreach_next_days) || 3, 1)

  // FASE 1: primer toque a leads nuevos con email
  if (cfg.lead_auto_outreach_enabled !== false) {
    const { data: coldLeads } = await supabase
      .from("leads")
      .select("id, contact_name, business_name, email")
      .eq("source", "auto_scraped").eq("status", "new")
      .not("email", "is", null).limit(50)
    for (const lead of coldLeads || []) {
      const { data: prior } = await supabase
        .from("email_sends").select("id").eq("to", lead.email)
        .in("template", [...OUTREACH_TEMPLATES, "lead_contact", "followUp", "promo_1"]).limit(1)
      if (prior && prior.length > 0) continue
      const vars = { name: lead.contact_name || lead.business_name, business: lead.business_name, company: "OpiniLab" }
      const t = (await getDbTemplate("outbound_1", vars)) || fallbackTemplate("outbound_1", vars.name, vars.business)
      const r = await sendEmailExact({ to: lead.email, template: "outbound_1", subject: t.subject, html: t.html, leadId: lead.id, from })
      if (r === "sent") {
        await supabase.from("leads").update({
          status: "contacted",
          next_follow_up_at: new Date(now.getTime() + nextDays * DAY_MS).toISOString(),
          last_contact_at: now.toISOString(), updated_at: now.toISOString(),
        }).eq("id", lead.id)
      }
      console.log(`OUTBOUND  ${lead.business_name} (${lead.email}): ${r}`)
    }
  }

  // FASE 2: seguimiento rotativo
  const { data: followUpLeads } = await supabase
    .from("leads")
    .select("id, contact_name, business_name, email, status")
    .in("status", ["contacted", "interested", "proposal_sent", "negotiation"])
    .lte("next_follow_up_at", now.toISOString())
    .not("email", "is", null).limit(100)

  let sentCount = 0
  for (const lead of followUpLeads || []) {
    const { data: sentToday } = await supabase
      .from("email_sends").select("id").eq("to", lead.email)
      .in("template", OUTREACH_TEMPLATES).gte("created_at", startOfDay).limit(1)
    if (sentToday && sentToday.length > 0) continue

    const since = new Date(now.getTime() - 90 * DAY_MS).toISOString()
    const { data: priorSends } = await supabase
      .from("email_sends").select("template").eq("to", lead.email)
      .in("template", OUTREACH_TEMPLATES).gte("created_at", since).limit(50)
    const count = priorSends?.length ?? 0

    let tplKey = null
    if (count <= 0) tplKey = "outbound_1"
    else if (count === 1) tplKey = "followup_1"
    else if (count === 2) tplKey = "followup_2"
    else tplKey = null

    if (!tplKey) {
      await supabase.from("leads").update({ next_follow_up_at: null, updated_at: now.toISOString() }).eq("id", lead.id)
      continue
    }

    const name = lead.contact_name || lead.business_name
    const vars = { name, business: lead.business_name, company: "OpiniLab" }
    const t = (await getDbTemplate(tplKey, vars)) || fallbackTemplate(tplKey, name, lead.business_name)
    const r = await sendEmailExact({ to: lead.email, template: tplKey, subject: t.subject, html: t.html, leadId: lead.id, from })

    if (r === "skipped") {
      await supabase.from("leads").update({ next_follow_up_at: null, updated_at: now.toISOString() }).eq("id", lead.id)
    } else if (r === "sent") {
      const next = tplKey === "followup_2" ? null : new Date(now.getTime() + nextDays * DAY_MS).toISOString()
      await supabase.from("leads").update({
        next_follow_up_at: next, last_contact_at: now.toISOString(), updated_at: now.toISOString(),
      }).eq("id", lead.id)
      sentCount++
    }
    console.log(`FOLLOWUP  ${lead.business_name} (${lead.email}): ${r}`)
  }

  console.log(`\nFollow-ups enviados: ${sentCount}`)
}

main().catch((e) => { console.error(e); process.exit(1) })