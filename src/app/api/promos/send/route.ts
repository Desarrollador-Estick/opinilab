import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"
import { getDbEmailTemplate } from "@/lib/email/db-templates"
import { promotionEmail, appendPaymentCta } from "@/lib/email/templates"
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
  const skipped: string[] = []
  const failed: { email: string; reason: string }[] = []

  for (const recipient of recipients || []) {
    const name = recipient.name || "allá"
    const business = recipient.business_name || "tu negocio"

    // El botón de contratación del template promo_1 (y los CTA de pago por lead)
    // apuntan a /pagar/lead/{lead_token}. El token es el id del lead: se reutiliza
    // el lead existente del mismo email o se crea uno (source=cold_outreach)
    // para que el enlace de pago funcione y las respuestas entren al agente.
    let leadToken: string | null = null
    try {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .ilike("email", recipient.email)
        .maybeSingle()
      if (existingLead) {
        leadToken = existingLead.id
      } else {
        const { data: newLead, error: createError } = await supabase
          .from("leads")
          .insert({
            business_name: business,
            contact_name: name,
            email: recipient.email,
            source: "cold_outreach",
            status: "new",
            notes: `Alta desde campaña promocional (${new Date().toISOString().split("T")[0]})`,
          })
          .select("id")
          .maybeSingle()
        if (createError) {
          failed.push({ email: recipient.email, reason: createError.message })
          continue
        }
        leadToken = newLead?.id ?? null
      }
    } catch (err) {
      failed.push({
        email: recipient.email,
        reason: err instanceof Error ? err.message : "Error al crear el lead de pago",
      })
      continue
    }

    const dbTemplate = await getDbEmailTemplate(supabase, "promo_1", {
      name,
      business,
      company,
      lead_token: leadToken,
    })

    // Siempre se añade el CTA de contratación/pago por lead (si la plantilla ya
    // lo incluye, appendPaymentCta no lo duplica). Así TODOS los correos de
    // promoción llevan el botón de pago directo por Stripe.
    const { subject, html } = dbTemplate
      ? {
          subject: dbTemplate.subject,
          html: appendPaymentCta(dbTemplate.body, leadToken ?? ""),
        }
      : {
          subject: promotionEmail(name, business).subject,
          html: appendPaymentCta(promotionEmail(name, business).html, leadToken ?? ""),
        }

    const res = await sendEmail({
      to: recipient.email,
      template: "promo",
      subject,
      html,
      data: { name, business, leadId: leadToken },
      promotional: true,
    })

    const { error: updateError } = await supabase
      .from("promo_recipients")
      .update({
        status: res.skipped ? "skipped" : res.ok ? "sent" : "failed",
        sent_at: res.ok && !res.skipped ? new Date().toISOString() : null,
        last_error: res.skipped
          ? "Destinatario dado de baja"
          : res.ok
            ? null
            : "Error al enviar por el proveedor de email",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id)

    if (res.skipped) {
      skipped.push(recipient.email)
    } else if (res.ok && !updateError) {
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
    skipped: skipped.length,
    failed: failed.length,
    failed_details: failed,
  })
}