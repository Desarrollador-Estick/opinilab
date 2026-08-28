import { Resend } from "resend"
import { createServerAdminClient } from "@/lib/supabase/admin"

const resendToken = process.env.RESEND_API_KEY

function getResend() {
  return resendToken ? new Resend(resendToken) : null
}

export interface SendEmailOptions {
  to: string
  template: string
  subject: string
  html: string
  clientId?: string | null
  leadId?: string | null
  data?: Record<string, unknown>
}

/**
 * Envía un email y registra el intento en `email_sends`.
 * Nunca lanza errores: si Resend no está configurado o falla, lo registra en
 * consola y devuelve ok:false. Así un email NUNCA rompe el flujo principal
 * (facturación, webhooks, etc.).
 */
export async function sendEmail({
  to,
  template,
  subject,
  html,
  clientId,
  leadId,
  data,
}: SendEmailOptions): Promise<{ ok: boolean }> {
  const resend = getResend()
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev"

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada. Email a ${to} (${template}) no enviado.`
    )
    try {
      const client = await createServerAdminClient()
      await client.from("email_sends").insert({
        to,
        from: fromEmail,
        subject,
        template,
        client_id: clientId || null,
        lead_id: leadId || null,
        resend_id: null,
        data: data || {},
        status: "failed",
      })
    } catch {}
    return { ok: false }
  }

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    })

    try {
      const client = await createServerAdminClient()
      await client.from("email_sends").insert({
        to,
        from: fromEmail,
        subject,
        template,
        client_id: clientId || null,
        lead_id: leadId || null,
        resend_id: emailData?.id || null,
        data: data || {},
        status: error ? "failed" : "sent",
      })
    } catch {}

    return { ok: !error }
  } catch (e) {
    console.error(`[email] Error enviando email a ${to} (${template}):`, e)
    return { ok: false }
  }
}
