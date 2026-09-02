import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { generateGbpReport } from "@/lib/ai/gbp-report"
import { isFeatureEnabled, FEATURE_KEYS } from "@/lib/settings"

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromEmail?: string
) {
  const emailFrom = fromEmail || (process.env.EMAIL_FROM || "onboarding@resend.dev")

  const { data: emailData, error } = await resend.emails.send({
    from: emailFrom,
    to: [to],
    subject,
    html,
  })

  if (error) return { ok: false, error }

  // Registrar en Supabase con service role
  const supabase = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()
  await supabase.from("email_sends").insert({
    to,
    from: emailFrom,
    subject,
    template: "unifiedOnboarding",
    resend_id: emailData?.id || null,
    data: { status: "sent" },
    lead_id: null,
    status: "sent",
  })

  return { ok: true }
}

export async function POST(request: Request) {
  try {
    const captureEnabled = await isFeatureEnabled(FEATURE_KEYS.leadsCapture)
    if (!captureEnabled) {
      return NextResponse.json(
        { success: false, error: "La captación de leads está desactivada en estos momentos" },
        { status: 403 }
      )
    }

    const { name, email, phone, business, message, googleMapsUrl } = await request.json()

    if (!name || !email || !business) {
      return NextResponse.json(
        { success: false, error: "Nombre, email y negocio son obligatorios" },
        { status: 400 }
      )
    }

    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await createClient()

    // Guardamos el enlace de Google Maps en `website` (si no vino uno ya) y el
    // mensaje del formulario en `notes`, para alimentar el informe GBP.
    const mapsUrl = (googleMapsUrl as string | undefined)?.trim() || null
    // Create lead from contact form
    const { data, error } = await supabase
      .from("leads")
      .insert({
        business_name: business,
        contact_name: name,
        email: email,
        phone: phone || null,
        source: "website",
        status: "new",
        score: 70, // Higher score for inbound leads
        notes: message || null,
        website: mapsUrl,
      })
      .select()
      .single()

    if (error) throw error

    // Generar informe GBP con IA
    const report = await generateGbpReport({
      businessName: business,
      contactName: name,
      googleMapsUrl: mapsUrl,
      message: message || null,
    })

    // Construir el contenido HTML unificado: welcome + onboardingGuide + report
    const companyName = process.env.COMPANY_NAME || "Agencia Marketing"

    // Cuerpo del informe formateado a HTML (simple)
    let reportHtml = ""
    if (report.ok && report.content) {
      const lines = report.content.split("\n").map((l) => l.trim())
      const htmlLines: string[] = []
      let inList = false

      const closeList = () => {
        if (inList) {
          htmlLines.push("</ul>")
          inList = false
        }
      }

      for (const line of lines) {
        if (!line) {
          closeList()
          htmlLines.push("<br/>")
          continue
        }
        if (line.startsWith("##")) {
          closeList()
          htmlLines.push(`<p><strong>${line.replace(/^#+\s*/, "")}</strong></p>`)
        } else if (line.startsWith("- ")) {
          if (!inList) {
            htmlLines.push("<ul>")
            inList = true
          }
          htmlLines.push(`<li>${line.replace(/^- /, "")}</li>`)
        } else {
          closeList()
          htmlLines.push(`<p>${line}</p>`)
        }
      }
      closeList()
      reportHtml = htmlLines.join(" ")
    }

    // HTML unificado del email de bienvenida (claro, sin discurso) + informe
    const unifiedHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f3f4f6;">
      <div style="background: #0f172a; padding: 28px 32px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Bienvenido a ${companyName}</h1>
        <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Hemos recibido tu solicitud</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
        <p style="margin: 0 0 16px; line-height: 1.6;">Hola <strong>${name}</strong>,</p>
        <p style="margin: 0 0 16px; line-height: 1.6;">Gracias por contactar con nosotros. Hemos recibido la solicitud de <strong>${business}</strong> y un asesor la revisará en las próximas horas laborables.</p>

        <h3 style="margin: 24px 0 12px; font-size: 15px;">Qué ocurre a continuación</h3>
        <ol style="margin: 0 0 20px; padding-left: 20px; line-height: 1.7;">
          <li>Revisamos la información de tu negocio y preparamos una propuesta.</li>
          <li>Te contactamos para acordar los servicios y condiciones.</li>
          <li>Al confirmar el alta, recibirás automáticamente tu acceso al portal de cliente con tus credenciales.</li>
        </ol>

        ${reportHtml ? `<h3 style="margin: 24px 0 12px; font-size: 15px;">Tu informe gratuito de presencia en Google</h3><div style="line-height: 1.6;">${reportHtml}</div>` : ""}

        <p style="margin: 20px 0 0; line-height: 1.6;">Si tienes alguna duda mientras tanto, responde directamente a este correo.</p>
        <p style="margin: 20px 0 0;">Un saludo,<br><strong>Equipo de ${companyName}</strong></p>
      </div>
    </body>
    </html>
    `

    await sendEmail(
      email,
      `Bienvenido a ${companyName} — tu informe gratuito y próximos pasos`,
      unifiedHtml
    )

    return NextResponse.json({
      success: true,
      message: "Lead creado y email de bienvenida enviado",
      lead: data,
    })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { success: false, error: "Error al procesar el formulario" },
      { status: 500 }
    )
  }
}
