import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { getAutomationEmailsConfig } from "@/lib/automation/lead-outreach"
import {
  classifyLeadReply,
  buildAgentReply,
  insertIncomingReply,
  normalizeEmail,
  stripQuotedEmail,
  type InboundPayload,
} from "@/lib/email/replies"
import { sendEmail } from "@/lib/email/send"
import { addEmailSuppression } from "@/lib/email/unsubscribe"
import { salesAgentAdminNotify } from "@/lib/email/templates"

// Webhook de RESEND INBOUND: recibe las réplicas de leads/clients a los
// emails de campaña (Reply-To → INBOUND_REPLY_TO) y el agente de ventas IA las
// clasifica y responde, con puerta de aprobación humana para el cierre.
//
// SETUP (pendiente, requiere DNS):
//   1. Resend → Domains → `inbound.opinilab.com` (receiving enabled) y añadir
//      en el DNS las registros TXT/MX/CNAME que Resend indica (incluido el MX
//      `inbound` → inbound-smtp.us-east-1.amazonaws.com).
//   2. Resend → Webhooks → webhook tipo `email.received` con la URL
//      https://www.opinilab.com/api/email/inbound
//   3. En Vercel: INBOUND_REPLY_TO = responde@inbound.opinilab.com. Desde ese
//      momento los emails de campaña llevan Reply-To → las réplicas vuelven aquí.

const OFFER = "49€/mes + 30€ de alta (solo el primer mes)"

/**
 * Verifica la firma Svix de un webhook de Resend. Devuelve `true` si es válido.
 * Si no hay secreto configurado, se acepta el evento (modo compatible).
 */
function verifyWebhookSignature(
  rawBody: string,
  headers: Headers,
  secret: string | undefined
): "valid" | "invalid" | "unconfigured" {
  if (!secret) return "unconfigured"
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const signature = headers.get("svix-signature")
  if (!id || !timestamp || !signature) return "invalid"

  // Antirreplay: rechazar firma con más de 10 minutos de antigüedad.
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 600) {
    return "invalid"
  }

  const secretBytes = Buffer.from(
    secret.replace(/^whsec_/, ""),
    "base64"
  )
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const computed = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64")

  const provided = (signature || "")
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3))
  return provided.some((sig) => {
    if (!sig) return false
    const a = Buffer.from(computed)
    const b = Buffer.from(sig)
    return a.length === b.length && timingSafeEqual(a, b)
  })
    ? "valid"
    : "invalid"
}

interface RawEventData {
  from?: string | { email: string; name?: string } | null
  to?: string | string[] | null
  subject?: string | null
  text?: string | null
  html?: string | null
  messageId?: string | null
  "Message-Id"?: string | null
  message_id?: string | null
  inReplyTo?: string | null
  email_id?: string | null
  emailId?: string | null
}

/**
 * El webhook moderno de Resend (evento `email.received`) solo envía metadatos:
 * el cuerpo hay que descargarlo con GET /emails/receiving/{id}. Si ya vienen
 * texto/html (payload legacy de inbound routes) no se descarga nada.
 */
async function fetchReceivedEmailBody(emailId: string): Promise<{
  text: string | null
  html: string | null
  subject: string | null
}> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !emailId) return { text: null, html: null, subject: null }
  try {
    const res = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!res.ok) return { text: null, html: null, subject: null }
    const data = await res.json()
    return {
      text: data.text ?? null,
      html: data.html ?? null,
      subject: data.subject ?? null,
    }
  } catch {
    return { text: null, html: null, subject: null }
  }
}

function isReplyEventType(type: string): boolean {
  const t = (type || "").toLowerCase()
  return t.includes("received") || t.includes("inbound") || t === "reply"
}

function normalizeEventData(d: RawEventData): InboundPayload {
  const fromEmail =
    typeof d.from === "string" ? d.from : (d.from?.email ?? "")
  const fromName =
    typeof d.from === "string" ? null : (d.from?.name ?? null)
  const toRaw = Array.isArray(d.to) ? d.to[0] : d.to
  return {
    fromEmail,
    fromName,
    toAddr: typeof toRaw === "string" ? toRaw : null,
    subject: d.subject ?? null,
    text: d.text ?? d.html ?? null,
    html: d.html ?? null,
    messageId: d.messageId || d["Message-Id"] || d.message_id || null,
    inReplyTo: d.inReplyTo ?? null,
  }
}

async function processOne(
  payload: InboundPayload,
  eventsLogged: string[]
): Promise<string> {
  const supabase = await createServerAdminClient()
  const now = new Date()

  // Deduplicación por message_id: no procesar dos veces la misma réplica.
  if (payload.messageId) {
    const { data: dup } = await supabase
      .from("email_replies")
      .select("id")
      .eq("message_id", payload.messageId)
      .maybeSingle()
    if (dup) return "duplicate"
  }

  const fromEmail = normalizeEmail(payload.fromEmail)
  if (!fromEmail) return "no_from"

  // Localizar el lead (o cliente) al que pertenece el email.
  const { data: lead } = await supabase
    .from("leads")
    .select("id, contact_name, business_name, status, email, next_follow_up_at")
    .ilike("email", fromEmail)
    .maybeSingle()

  const leadId = lead?.id ?? null
  const businessName = lead?.business_name ?? "tu negocio"
  const contactName = lead?.contact_name ?? null

  const inserted = await insertIncomingReply(supabase, payload, leadId)

  const stripped = stripQuotedEmail(payload.text)
  if (!inserted.id) {
    return `insert_error:${inserted.error || "unknown"}`
  }

  const replyId = inserted.id
  const updateReply = async (patch: {
    reply_type?: string
    reply_status?: string
    confidence?: number
    reason?: string
    ai_reply?: string
    handled_at?: string
  }) => {
    await supabase.from("email_replies").update(patch).eq("id", replyId)
  }

  const cfg = await getAutomationEmailsConfig(supabase)
  const enabled = cfg.sales_agent_enabled !== false

  // Config NO activada → se guarda como pendiente y se notifica al admin.
  if (!enabled) {
    await updateReply({
      reply_status: "unresolved",
      reason: "Agente de ventas desactivado en Configuración → Automatización",
      handled_at: now.toISOString(),
    })
    return "disabled"
  }

  const classification = await classifyLeadReply(stripped, {
    businessName,
    contactName,
    offer: OFFER,
  })
  const type = classification.type
  const ctx = {
    contactName: contactName || businessName,
    businessName,
    offer: OFFER,
  }

  // 1) BAJA explícita → supresión + lead perdido + sin respuesta.
  if (type === "unsubscribe") {
    await addEmailSuppression(supabase, fromEmail, "sales_agent")
    if (leadId) {
      await supabase.from("leads").update({
        status: "lost",
        next_follow_up_at: null,
        updated_at: now.toISOString(),
      }).eq("id", leadId)
    }
    await updateReply({
      reply_type: "unsubscribe",
      confidence: classification.confidence,
      reason: classification.reason,
      reply_status: "skipped",
      handled_at: now.toISOString(),
    })
    eventsLogged.push(`lead_reply_unsubscribe:${businessName}:${fromEmail}`)
    return "skipped"
  }

  // 2) NO interesado → lead perdido y sin más toques.
  if (type === "no") {
    if (leadId) {
      await supabase.from("leads").update({
        status: "lost",
        next_follow_up_at: null,
        updated_at: now.toISOString(),
      }).eq("id", leadId)
    }
    await updateReply({
      reply_type: "no",
      confidence: classification.confidence,
      reason: classification.reason,
      reply_status: "skipped",
      handled_at: now.toISOString(),
    })
    eventsLogged.push(`lead_reply_no:${businessName}:${fromEmail}`)
    return "skipped"
  }

  // 3) SÍ → el agente redacta el siguiente paso, PERO no se cierra ni se
  //    envía solo: queda como página de aprobación para el humano, que luego
  //    convierte al lead (contrato + factura) en /dashboard/leads/[id].
  if (type === "yes") {
    const draft = await buildAgentReply(type, stripped, ctx)
    if (leadId) {
      await supabase.from("leads").update({
        status: "interested",
        next_follow_up_at: null,
        updated_at: now.toISOString(),
      }).eq("id", leadId)
    }
    await updateReply({
      reply_type: "yes",
      confidence: classification.confidence,
      reason: classification.reason,
      ai_reply: draft,
      reply_status: "draft",
      handled_at: now.toISOString(),
    })

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      const tpl = salesAgentAdminNotify(businessName, fromEmail, "SÍ está interesado", stripped)
      await sendEmail({
        to: adminEmail,
        template: "salesAgentAdminNotify",
        subject: tpl.subject,
        html: tpl.html,
        leadId,
        data: { businessName, fromEmail, quote: stripped.slice(0, 300) },
      })
    }
    eventsLogged.push(`lead_reply_yes:${businessName}:${fromEmail}`)
    return "draft"
  }

  // 4) PREGUNTA / OBJECIÓN / SIN CLASIFICAR → el agente redacta. Si el auto
  //    reply está activado, se envía al momento; si no, queda como borrador.
  const draft = await buildAgentReply(type, stripped, ctx)
  const autoReply = cfg.sales_agent_auto_reply !== false

  if (!autoReply) {
    await updateReply({
      reply_type: type,
      confidence: classification.confidence,
      reason: classification.reason,
      ai_reply: draft,
      reply_status: "draft",
      handled_at: now.toISOString(),
    })
    eventsLogged.push(`lead_reply_${type}:${businessName}:${fromEmail} (draft)`)
    return "draft"
  }

  const emailResult = await sendEmail({
    to: fromEmail,
    template: "salesAgent",
    subject: `Re: ${payload.subject || "tu consulta sobre OpiniLab"}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f5f7;"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 28px;color:#374151;line-height:1.7;white-space:pre-wrap;">${draft.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</div></div>`,
    leadId,
    data: { replyId, fromEmail, replyType: type },
  })

  await updateReply({
    reply_type: type,
    confidence: classification.confidence,
    reason: classification.reason,
    ai_reply: draft,
    reply_status: emailResult.ok ? "auto_sent" : "error",
    handled_at: now.toISOString(),
  })

  if (leadId && emailResult.ok) {
    const nextDays = Math.max(Number(cfg.lead_outreach_next_days) || 3, 1)
    await supabase.from("leads").update({
      last_contact_at: now.toISOString(),
      next_follow_up_at: new Date(
        now.getTime() + nextDays * 24 * 60 * 60 * 1000
      ).toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", leadId)
  }

  eventsLogged.push(
    `lead_reply_${type}:${businessName}:${fromEmail} Result: ${emailResult.ok ? "auto_sent" : "error"}`
  )
  return emailResult.ok ? "auto_sent" : "error"
}

export async function POST(_request: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Service role no configurada" },
      { status: 500 }
    )
  }

  let body: unknown
  let rawBody = ""
  try {
    rawBody = await _request.text()
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const signature = verifyWebhookSignature(
    rawBody,
    _request.headers,
    process.env.RESEND_WEBHOOK_SECRET
  )
  if (signature === "invalid") {
    return NextResponse.json({ error: "Firma de webhook inválida" }, { status: 400 })
  }

  const events: RawEventData[] = []
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>
    if (Array.isArray(obj.events)) {
      for (const ev of obj.events as Array<Record<string, unknown>>) {
        const type = String(ev?.type || "")
        if (!isReplyEventType(type)) continue
        const data = ev?.data
        if (data && typeof data === "object") {
          events.push(data as RawEventData)
        }
      }
    } else if (Object.keys(obj).length > 0 && ("from" in obj || "messageId" in obj)) {
      if (isReplyEventType(String(obj.type || ""))) {
        events.push(obj as unknown as RawEventData)
      }
    }
  }

  if (events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const logged: string[] = []
  for (const ev of events) {
    try {
      const data = ev as RawEventData
      const emailId = data.email_id || data.emailId
      const lacksBody = !data.text && !data.html
      if (emailId && lacksBody) {
        const fetched = await fetchReceivedEmailBody(emailId)
        if (fetched.text || fetched.html) {
          data.text = fetched.text || fetched.html
          data.html = fetched.html
        }
        if (fetched.subject && !data.subject) data.subject = fetched.subject
      }
      const result = await processOne(normalizeEventData(data), logged)
      if (result === "duplicate") continue
    } catch (e) {
      logged.push(
        `lead_reply_error:${e instanceof Error ? e.message : "unknown"}`
      )
    }
  }

  if (logged.length > 0) {
    try {
      const supabase = await createServerAdminClient()
      await supabase.from("automation_logs").insert(
        logged.map((details) => ({
          action: "lead_reply_inbound",
          details,
          created_at: new Date().toISOString(),
        }))
      )
    } catch {}
  }

  return NextResponse.json({ ok: true, processed: events.length })
}