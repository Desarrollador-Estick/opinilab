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

    const { name, email, business, message, googleMapsUrl } = await request.json()

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
        <h1 style="color: white; margin: 0; font-size: 20px;">Hola ${name}, tu diagnóstico gratuito de Google está a un paso</h1>
        <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Gracias por confiar en ${companyName}</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
        <p style="margin: 0 0 16px; line-height: 1.6;">Hola <strong>${name}</strong>,</p>
        <p style="margin: 0 0 16px; line-height: 1.6;">Gracias por confiar en <strong>${companyName}</strong>. Hemos recibido tu solicitud y queremos que sepas que tu caso ya está en nuestra agenda de prioridades.</p>

        <p style="margin: 0 0 16px; line-height: 1.6;">Antes de empezar, necesitamos un dato clave para que nuestro análisis sea realmente útil: el enlace directo a tu ficha de Google Business Profile. Sin él, cualquier recomendación sería genérica, y eso no es lo que mereces.</p>

        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #166534;">Respondiendo a este correo con tu enlace, en menos de 24 horas laborables tendrás en tus manos:</p>
          <ul style="margin: 12px 0 0; padding-left: 20px; line-height: 1.8;">
            <li>Tu valoración media real y comparativa con tu competencia local.</li>
            <li>Un mapa de oportunidades personalizado (fotos, palabras clave, volumen de reseñas).</li>
            <li>3 acciones concretas para mejorar tu visibilidad en los próximos 7 días.</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="margin: 0 0 16px; line-height: 1.6;">Mientras tanto, te comparto lo que suele marcar la diferencia en negocios como el tuyo (sin necesidad de ver tu perfil, porque son patrones que repetimos en cientos de clientes):</p>

        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px; line-height: 1.6;">✅ Fotos que venden experiencias, no productos.</p>
          <p style="margin: 0 0 8px; line-height: 1.6;">✅ Descripciones que responden a lo que el cliente realmente busca en tu zona.</p>
          <p style="margin: 0 0 8px; line-height: 1.6;">✅ Respuestas a reseñas que humanizan tu marca (y que Google premia con mejor posicionamiento).</p>
          <p style="margin: 0; line-height: 1.6;">✅ Sistema proactivo para pedir opiniones en el momento justo (justo después de la compra).</p>
        </div>

        <p style="margin: 20px 0 16px; line-height: 1.6;">Pero lo importante no es lo que te contamos, sino lo que podemos hacer juntos cuando tengamos tus datos reales.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <h3 style="margin: 0 0 12px; font-size: 15px;">¿Cómo te ayudamos en ${companyName}?</h3>
        <p style="margin: 0 0 16px; line-height: 1.6;">No vendemos humo. Vendemos resultados medibles:</p>
        <ul style="margin: 0 0 20px; padding-left: 20px; line-height: 1.8;">
          <li><strong>Gestión de reseñas:</strong> aumentamos tu volumen y tu media, con estrategias probadas.</li>
          <li><strong>Community management:</strong> respondemos por ti con un tono que encaja con tu marca.</li>
          <li><strong>SEO local:</strong> te colocamos donde tus clientes te buscan.</li>
          <li><strong>Publicidad local:</strong> solo invertimos en lo que funciona, con datos en tiempo real.</li>
        </ul>
        <p style="margin: 0 0 20px; line-height: 1.6;">Y todo, con un panel de control donde tú ves el progreso día a día.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <h3 style="margin: 0 0 12px; font-size: 15px;">El siguiente paso es sencillo:</h3>
        <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Responde a este correo con el enlace de tu ficha de Google Maps.</li>
            <li>Nuestro equipo prepara tu diagnóstico personalizado y gratuito.</li>
            <li>En 24h te enviaremos un análisis completo y, si quieres, una propuesta a medida.</li>
          </ol>
        </div>
        <p style="margin: 0 0 20px; line-height: 1.6; font-weight: bold; color: #1e40af;">Sin compromiso. Solo información valiosa para que decidas con criterio.</p>

        ${reportHtml ? `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"><h3 style="margin: 0 0 12px; font-size: 15px;">Tu informe gratuito de presencia en Google</h3><div style="line-height: 1.6;">${reportHtml}</div>` : ""}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="margin: 0 0 16px; line-height: 1.6;">¿Tienes dudas? Estamos aquí para resolverlas. Puedes responder directamente a este mensaje.</p>

        <p style="margin: 20px 0 0;">Gracias de nuevo por abrirnos la puerta de tu negocio.</p>
        <p style="margin: 12px 0 0;">Un abrazo,<br><strong>Equipo ${companyName}</strong></p>
        <p style="margin: 20px 0 0; font-size: 12px; color: #6b7280;">Si ya tienes el enlace, no esperes a mañana. Los primeros en responder reciben un bonus exclusivo: un checklist de 5 errores que matan el posicionamiento local (y que el 90% de los negocios comete).</p>
      </div>
    </body>
    </html>
    `

    await sendEmail(
      email,
      `${name}, tu diagnóstico gratuito de Google está a un paso`,
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
