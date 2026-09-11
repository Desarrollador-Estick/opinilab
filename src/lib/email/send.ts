import { Resend } from "resend"
import { createServerAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"
import { isEmailSuppressed, buildUnsubscribeUrl } from "@/lib/email/unsubscribe"

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
  /** Dirección Reply-To explícita (p.ej. el dominio entrante del agente). Si
   *  no se pasa y es un email promocional, se usa INBOUND_REPLY_TO. */
  replyTo?: string
  /** Emails comerciales (promociones/campaña de captación): se añade el
   *  enlace de baja y se respeta la lista de emails dados de baja. */
  promotional?: boolean
}

export interface SendEmailResult {
  ok: boolean
  /** true cuando el destinatario ya se dio de baja y no se envió. */
  skipped?: boolean
}

/** Footer de baja de email que se añade a todo correo comercial. */
function buildFooter(email: string): string {
  const link = buildUnsubscribeUrl(email)
  return `
    <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb;">
      <p style="margin:0; font-size:11px; color:#9ca3af; text-align:center; line-height:1.5;">
        Recibes este correo porque contactamos contigo tras ver tu negocio en Google.
        Si no quieres recibir más correos nuestros: <a href="${link}" style="color:#6b7280;">darse de baja aquí</a>.
      </p>
    </div>`
}

function appendFooter(html: string, footer: string): string {
  const closing = html.toLowerCase().lastIndexOf("</body>")
  if (closing === -1) return html + footer
  return html.slice(0, closing) + footer + html.slice(closing)
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
  replyTo,
  promotional,
}: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResend()
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev"
  const replyToEmail =
    replyTo || (promotional ? process.env.INBOUND_REPLY_TO : undefined)
  const dataJson: Json | null = data ? (data as unknown as Json) : null

  const record = async (status: string, resendId: string | null) => {
    try {
      const client = await createServerAdminClient()
      await client.from("email_sends").insert({
        to,
        from: fromEmail,
        subject,
        template,
        client_id: clientId || null,
        lead_id: leadId || null,
        resend_id: resendId,
        data: dataJson,
        status,
      })
    } catch {}
  }

  // Comercial + destinatario ya dado de baja → no se envía.
  if (promotional) {
    try {
      const adminClient = await createServerAdminClient()
      if (await isEmailSuppressed(adminClient, to)) {
        await record("skipped", null)
        console.log(`[email] ${to} (${template}) omitido: destinatario dado de baja.`)
        return { ok: true, skipped: true }
      }
    } catch {}
  }

  const finalHtml = promotional ? appendFooter(html, buildFooter(to)) : html

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada. Email a ${to} (${template}) no enviado.`
    )
    await record("failed", null)
    return { ok: false }
  }

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html: finalHtml,
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
    })

    await record(error ? "failed" : "sent", emailData?.id || null)

    return { ok: !error }
  } catch (e) {
    console.error(`[email] Error enviando email a ${to} (${template}):`, e)
    return { ok: false }
  }
}
