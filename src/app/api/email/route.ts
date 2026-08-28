import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { emailTemplates, type EmailTemplateKey } from "@/lib/email/templates"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { to, template, data, from } = await request.json()

    if (!to || !template) {
      return NextResponse.json({ success: false, error: "to and template are required" }, { status: 400 })
    }

    if (!emailTemplates[template as EmailTemplateKey]) {
      return NextResponse.json({ success: false, error: `Unknown template: ${template}` }, { status: 400 })
    }

    const templateFn = emailTemplates[template as EmailTemplateKey]
    const { subject, html } = templateFn(data)

    const fromEmail = from || process.env.EMAIL_FROM || "onboarding@resend.dev"

    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await createClient()
    await supabase.from("email_sends").insert({
      to,
      from: fromEmail,
      subject,
      template,
      resend_id: emailData?.id || null,
      data: data || null,
      status: "sent",
    })

    return NextResponse.json({ success: true, id: emailData?.id })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
