import { NextResponse } from "next/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"

// Webhook de Resend para tracking de entregas de email.
// Actualiza el estado de email_sends a partir de los eventos de Resend:
//   email.delivered → delivered
//   email.bounced   → bounced
//   email.complained → complained
//   email.opened    → opened
//   email.clicked   → clicked
//
// Configuración en Resend: cualquier dominio sin reclamar no recibe eventos,
// por lo que este webhook solo se activa enviando emails desde el dominio de
// envío configurado (EMAIL_FROM). Añadir la URL
//   https://opinilab.com/api/email/webhook
// en Resend → Webhooks.

interface ResendWebhookEvent {
  type: string
  data: {
    email_id?: string
    created_at?: string
  }
}

const STATUS_BY_EVENT: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
}

export async function POST(request: Request) {
  // El webhook no tiene sesión de usuario: se necesita service role para
  // poder actualizar email_sends (omite RLS).
  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Service role no configurada" },
      { status: 500 }
    )
  }

  let payload: { events?: ResendWebhookEvent[] } | null = null
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const events = payload?.events
  if (!events || events.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const supabase = await createServerAdminClient()
  let updated = 0

  for (const event of events) {
    const status = STATUS_BY_EVENT[event.type]
    if (!status) {
      // Ignorar eventos no relevantes (p.ej. email.received, email.sent).
      continue
    }
    const resendId = event.data?.email_id
    if (!resendId) continue

    const { error } = await supabase
      .from("email_sends")
      .update({ status })
      .eq("resend_id", resendId)

    if (!error) {
      updated++
    }
  }

  return NextResponse.json({ ok: true, updated })
}