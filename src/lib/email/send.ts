import { Resend } from "resend"
import { createServerAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"
import { isEmailSuppressed, buildUnsubscribeUrl } from "@/lib/email/unsubscribe"
import { normalizeSingleEmail } from "@/lib/email/normalize"
import { getEmailQuotaUsage, DAILY_EMAIL_QUOTA } from "@/lib/email/quota"

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
  /** true cuando el destinatario ya se dio de baja o se agotó la cuota y no se envió. */
  skipped?: boolean
  /** Motivo del no-envío: "suppressed" (dado de baja) | "quota_daily" (cuota agotada). */
  reason?: "suppressed" | "quota_daily"
}

/** Identidad del responsable del tratamiento que se muestra en el pie legal. */
function buildControllerLine(): string {
  const company = process.env.COMPANY_NAME || "OpiniLab"
  const nif = process.env.COMPANY_NIF
  const address = process.env.COMPANY_ADDRESS
  return [company, nif, address].filter(Boolean).join(" · ")
}

/**
 * Footer legal completo (RGPD + LSSI-CE) que se añade a todo correo comercial:
 * identidad del responsable, finalidad, base de interés legítimo, derecho de
 * oposición/baja gratuito, enlaces a privacidad y contacto.
 */
function buildFooter(email: string): string {
  const link = buildUnsubscribeUrl(email)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opinilab.com"
  const contact = process.env.COMPANY_EMAIL || "info@opinilab.com"
  const controller = buildControllerLine()
  return `
    <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb;">
      <p style="margin:0; font-size:11px; color:#6b7280; text-align:center; line-height:1.6;">
        Este correo es una comunicación comercial dirigida a ${controller} y la enviamos porque su negocio aparece en fuentes accesibles al público (p. ej. Google Maps) y consideramos que nuestros servicios pueden ser de interés para usted (base: interés legítimo, art. 6.1.f RGPD / art. 21 LSSI-CE).
      </p>
      <p style="margin:4px 0 0; font-size:11px; color:#9ca3af; text-align:center; line-height:1.6;">
        Puede ejercer sus derechos y oponerse a este tratamiento de forma gratuita y sin explicar los motivos: <a href="${link}" style="color:#6b7280;">darse de baja aquí</a> · <a href="${baseUrl}/proteccion-datos" style="color:#6b7280;">derechos y protección de datos</a> · <a href="${baseUrl}/privacidad" style="color:#6b7280;">política de privacidad</a> · contacto: <a href="mailto:${contact}" style="color:#6b7280;">${contact}</a>
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
  // Un campo "email" capturado en el scraping puede llegar con varios emails
  // separados por `;`/`,`/espacios (tags OSM, listados). Se normaliza a un
  // único destinatario válido; si no hay ninguno no se puede enviar.
  const normalizedTo = normalizeSingleEmail(to) ?? to
  const resend = getResend()
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev"
  const replyToEmail =
    replyTo || (promotional ? process.env.INBOUND_REPLY_TO : undefined)
  const dataJson: Json | null = data ? (data as unknown as Json) : null

  const record = async (status: string, resendId: string | null) => {
    try {
      const client = await createServerAdminClient()
      await client.from("email_sends").insert({
        to: normalizedTo,
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
      if (await isEmailSuppressed(adminClient, normalizedTo)) {
        await record("skipped", null)
        console.log(`[email] ${normalizedTo} (${template}) omitido: destinatario dado de baja.`)
        return { ok: true, skipped: true, reason: "suppressed" }
      }
    } catch {}
  }

  const finalHtml = promotional ? appendFooter(html, buildFooter(normalizedTo)) : html

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY no configurada. Email a ${normalizedTo} (${template}) no enviado.`
    )
    await record("failed", null)
    return { ok: false }
  }

  // Cuota diaria gratuita de Resend: si se agotó, no se envía y se respeta el
  // límite. No se registra en `email_sends` (no es un envío) y los
  // destinatarios siguen pendientes para el próximo día.
  try {
    const { remaining } = await getEmailQuotaUsage()
    if (remaining <= 0) {
      console.warn(
        `[email] Cuota diaria de ${DAILY_EMAIL_QUOTA} emails agotada. Email a ${normalizedTo} (${template}) no enviado; se reintentará mañana.`
      )
      return { ok: true, skipped: true, reason: "quota_daily" }
    }
  } catch {}

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: [normalizedTo],
      subject,
      html: finalHtml,
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
    })

    await record(error ? "failed" : "sent", emailData?.id || null)

    return { ok: !error }
  } catch (e) {
    console.error(`[email] Error enviando email a ${normalizedTo} (${template}):`, e)
    return { ok: false }
  }
}
