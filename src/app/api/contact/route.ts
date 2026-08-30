import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { welcomeEmail, onboardingGuideEmail } from "@/lib/email/templates"
import { generateGbpReport } from "@/lib/ai/gbp-report"
import { gbpReportEmail } from "@/lib/email/gbp-report"

const resend = new Resend(process.env.RESEND_API_KEY)

type FormEmailKey = "welcome" | "onboardingGuide" | "gbpReport"

async function sendEmail(
  to: string,
  template: FormEmailKey,
  data: { businessName: string; contactName: string; reportContent?: string },
  leadId?: string
) {
  let email
  if (template === "welcome") {
    email = welcomeEmail(data.businessName, data.contactName)
  } else if (template === "onboardingGuide") {
    email = onboardingGuideEmail(data.businessName, data.contactName)
  } else {
    email = gbpReportEmail(data.contactName, data.businessName, data.reportContent || "")
  }

  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev"

  const { data: emailData, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: email.subject,
    html: email.html,
  })

  if (error) return { ok: false, error }

  // Los inserts de email_sends/leads se hacen con service role: el formulario
  // público no tiene sesión de usuario y RLS (ahora restringido a
  // `authenticated`) lo bloquearía con la clave anon.
  const supabase = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()
  await supabase.from("email_sends").insert({
    to,
    from: fromEmail,
    subject: email.subject,
    template,
    resend_id: emailData?.id || null,
    data: data as unknown as Record<string, unknown>,
    lead_id: leadId || null,
    status: "sent",
  })

  return { ok: true }
}

// Genera el informe GBP (fire-and-forget) y lo envía tras la bienvenida.
async function sendGbpReport(
  email: string,
  lead: { businessName: string; contactName: string; googleMapsUrl: string | null; message: string | null },
  leadId: string
) {
  try {
    const report = await generateGbpReport({
      businessName: lead.businessName,
      contactName: lead.contactName,
      googleMapsUrl: lead.googleMapsUrl,
      message: lead.message,
    })
    if (!report.ok || !report.content) {
      console.error("GBP report generation failed:", report.error)
      return
    }
    await sendEmail(
      email,
      "gbpReport",
      { businessName: lead.businessName, contactName: lead.contactName, reportContent: report.content },
      leadId
    )
  } catch (e) {
    console.error("GBP report email error:", e)
  }
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

    // Onboarding: welcome + guía + informe GBP. TODO se espera (await) para
    // garantizar que se completan en entornos serverless (Netlify) donde el
    // trabajo fire-and-forget se puede cortar al devolver la respuesta.
    // Los errores no rompen la petición: se registran y continúa.
    const emailData = { businessName: business, contactName: name }
    try {
      await sendEmail(email, "welcome", emailData, data.id)
      await sendEmail(email, "onboardingGuide", emailData, data.id)
    } catch (e) {
      console.error("Onboarding email error:", e)
    }

    // Informe GBP: se genera con IA y se envía por email tras la bienvenida.
    try {
      await sendGbpReport(
        email,
        {
          businessName: business,
          contactName: name,
          googleMapsUrl: mapsUrl,
          message: message || null,
        },
        data.id
      )
    } catch (e) {
      console.error("GBP report email error:", e)
    }

    return NextResponse.json({
      success: true,
      message: "Lead creado correctamente",
      lead: data,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error al procesar el formulario" },
      { status: 500 }
    )
  }
}
