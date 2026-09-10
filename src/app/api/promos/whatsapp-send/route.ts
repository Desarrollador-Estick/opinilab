import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp/cloud-api"
import { buildPromoMessage, cleanPhone } from "@/lib/whatsapp/wa-link"

export async function POST(request: Request) {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp no está configurado. Añade WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN en las variables de entorno." },
      { status: 400 }
    )
  }

  let ids: string[] | null = null
  try {
    const body = await request.json()
    if (Array.isArray(body?.ids)) {
      ids = body.ids.map(String).filter(Boolean)
    }
  } catch {}

  let query = supabase
    .from("promo_recipients")
    .select("*")
    .eq("whatsapp_status", "pending")
    .not("phone", "is", null)

  if (ids && ids.length > 0) {
    query = query.in("id", ids)
  }

  const { data: recipients, error: recError } = await query
  if (recError) {
    return NextResponse.json({ error: recError.message }, { status: 500 })
  }

  const sent: string[] = []
  const skipped: string[] = []
  const failed: { phone: string; reason: string }[] = []
  const company = process.env.COMPANY_NAME || "OpiniLab"

  for (const recipient of recipients || []) {
    if (!recipient.phone) {
      skipped.push(recipient.email)
      continue
    }

    const name = recipient.name || "allá"
    const business = recipient.business_name || "tu negocio"
    const message = buildPromoMessage(name, business, company)
    const cleanedPhone = cleanPhone(recipient.phone)

    const res = await sendWhatsAppText(cleanedPhone, message)

    // Log to whatsapp_sends
    await supabase.from("whatsapp_sends").insert({
      recipient_id: recipient.id,
      phone: cleanedPhone,
      message,
      status: res.ok ? "sent" : "failed",
      provider_message_id: res.messageId || null,
      error: res.ok ? null : res.error,
    })

    // Update recipient whatsapp_status
    const newStatus = res.ok ? "sent" : "failed"
    await supabase
      .from("promo_recipients")
      .update({
        whatsapp_status: newStatus,
        whatsapp_sent_at: res.ok ? new Date().toISOString() : null,
        last_error: res.ok ? null : res.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id)

    if (res.ok) {
      sent.push(recipient.phone)
    } else {
      failed.push({ phone: recipient.phone, reason: res.error || "Error desconocido" })
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
