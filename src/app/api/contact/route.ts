import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { generateGbpReport } from "@/lib/ai/gbp-report"

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

    // HTML unificado del email de bienvenida + onboarding + informe
    const unifiedHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">🚀 ¡Bienvenido a ${companyName}!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        <p>Hola <strong>${name}</strong>,</p>
        
        <p>¡Nos alegra que <strong>${business}</strong> se una a nosotros! Hemos preparado esta información completa para ayudarte a hacer crecer tu negocio.</p>

        <h3>Así trabajamos juntos</h3>
        <p>Nuestro proceso en 4 pasos:</p>
        <ol>
          <li><strong>Análisis inicial gratuito</strong> — revisamos tu presencia online, tus reseñas en Google y tu posicionamiento actual.</li>
          <li><strong>Plan personalizado</strong> — te proponemos los servicios que mejor se adaptan a tu negocio y a tu presupuesto.</li>
          <li><strong>Nos ponemos en marcha</strong> — activamos tu estrategia y empezamos a conseguir resultados.</li>
          <li><strong>Seguimiento mensual</strong> — te enviamos un informe con todo lo que hemos hecho y los resultados obtenidos.</li>
        </ol>

        <h3>¿Qué necesitamos de ti?</h3>
        <p>Para empezar, será muy útil que nos faciltes el enlace de tu perfil de Google Business Profile (Google Maps). Si no lo tienes, ¡nosotros te ayudamos a crearlo!</p>

        ${reportHtml ? `<h3>📊 Tu informe gratuito de presencia en Google</h3>${reportHtml}` : ""}

        <p>Si tienes cualquier duda, responde directamente a este email o pide una llamada gratuita sin compromiso.</p>
        <p>¡Vamos a por ello!<br><strong>Equipo de ${companyName}</strong></p>
      </div>
    </body>
    </html>
    `

    await sendEmail(
      email,
      `¡Bienvenido a ${companyName} - Tu informe gratuito incluido`,
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
