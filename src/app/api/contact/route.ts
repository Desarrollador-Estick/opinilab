import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { welcomeEmail, onboardingGuideEmail } from "@/lib/email/templates"

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendEmail(
  to: string,
  template: "welcome" | "onboardingGuide",
  data: { businessName: string; contactName: string }
) {
  const email = template === "welcome"
    ? welcomeEmail(data.businessName, data.contactName)
    : onboardingGuideEmail(data.businessName, data.contactName)

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
    status: "sent",
  })

  return { ok: true }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, business, message } = await request.json()

    if (!name || !email || !business) {
      return NextResponse.json(
        { success: false, error: "Nombre, email y negocio son obligatorios" },
        { status: 400 }
      )
    }

    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await createClient()

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
      })
      .select()
      .single()

    if (error) throw error

    // Onboarding: welcome email + guide (fire-and-forget, do not fail the request)
    const emailData = { businessName: business, contactName: name }
    sendEmail(email, "welcome", emailData)
      .then(() => sendEmail(email, "onboardingGuide", emailData))
      .catch((e) => console.error("Onboarding email error:", e))

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
