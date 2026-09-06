import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"
import { getDbEmailTemplate } from "@/lib/email/db-templates"
import { promotionEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/send"

// Envía el email de promoción a los destinatarios pendientes
// (o solo a los IDs recibidos en el body, si `ids` viene informado).
export async function POST(request: Request) {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  let ids: string[] | null = null
  try {
    const body = await request.json()
    if (Array.isArray(body?.ids)) {
      ids = body.ids.map(String).filter(Boolean)
    }
  } catch {}

  let query = supabase.from("promo_recipients").select("*").eq("status", "pending")
  if (ids && ids.length > 0) {
    query = query.in("id", ids)
  }

  const { data: recipients, error: recError } = await query
  if (recError) {
    return NextResponse.json({ error: recError.message }, { status: 500 })
  }

  const company = process.env.COMPANY_NAME || "OpiniLab"
  const sent: string[] = []
  const failed: { email: string; reason: string }[] = []

  for (const recipient of recipients || []) {
    const name = recipient.name || "allá"
    const business = recipient.business_name || "tu negocio"

    const dbTemplate = await getDbEmailTemplate(supabase, "promo_1", {
      name,
      business,
      company,
    })

    const { subject, html } = dbTemplate
      ? { subject: dbTemplate.subject, html: dbTemplate.body }
      : promotionEmail(name, business)

    const res = await sendEmail({
      to: recipient.email,
      template: "promo",
      subject,
      html,
      data: { name, business },
    })

    const { error: updateError } = await supabase
      .from("promo_recipients")
      .update({
        status: res.ok ? "sent" : "failed",
        sent_at: res.ok ? new Date().toISOString() : null,
        last_error: res.ok ? null : "Error al enviar por el proveedor de email",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id)

    if (res.ok && !updateError) {
      sent.push(recipient.email)
    } else {
      failed.push({
        email: recipient.email,
        reason: !res.ok
          ? "Error al enviar por el proveedor de email"
          : updateError?.message || "Error al actualizar el estado",
      })
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sent.length,
    failed: failed.length,
    failed_details: failed,
  })
}