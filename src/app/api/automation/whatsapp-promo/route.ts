import { NextResponse } from "next/server"
import {
  isCronRequestAuthorized,
  requireCronOrTeamAuth,
  unauthorizedResponse,
} from "@/lib/cron-auth"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp/cloud-api"
import { buildPromoMessage, cleanPhone } from "@/lib/whatsapp/wa-link"

// Cron 10:30 UTC diario: envía WhatsApp a contactos que NO recibieron el email.
// Lógica: si el email fue enviado con éxito → NO se envía WhatsApp.
// Si el email está pendiente, fallido o skipeado → se intenta WhatsApp (si tiene teléfono).

async function runWhatsappPromo(now: Date): Promise<NextResponse> {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({
      success: true,
      message: "WhatsApp no configurado — nada que hacer",
      executed_at: now.toISOString(),
    })
  }

  const supabase = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()

  // Buscar contactos que:
  // - NO tienen email enviado (status distinto de 'sent')
  // - SÍ tienen teléfono
  // - WhatsApp aún pendiente
  const { data: recipients, error: recError } = await supabase
    .from("promo_recipients")
    .select("*")
    .neq("status", "sent")
    .eq("whatsapp_status", "pending")
    .not("phone", "is", null)

  if (recError) {
    return NextResponse.json(
      { success: false, error: recError.message },
      { status: 500 }
    )
  }

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No hay contactos pendientes de WhatsApp (sin email enviado)",
      sent: 0,
      executed_at: now.toISOString(),
    })
  }

  const company = process.env.COMPANY_NAME || "OpiniLab"
  const sent: string[] = []
  const failed: { phone: string; reason: string }[] = []
  const skipped: string[] = []

  for (const recipient of recipients) {
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

    // Update recipient
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

  // Log to automation_logs
  await supabase.from("automation_logs").insert({
    action: "whatsapp_promo",
    details: `WhatsApp promocional: ${sent.length} enviados, ${failed.length} fallidos, ${skipped.length} omitidos de ${recipients.length} destinatarios`,
    created_at: now.toISOString(),
  })

  return NextResponse.json({
    success: true,
    executed_at: now.toISOString(),
    total: recipients.length,
    sent: sent.length,
    failed: failed.length,
    skipped: skipped.length,
    failed_details: failed,
  })
}

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return unauthorizedResponse()
  }
  return runWhatsappPromo(new Date())
}

export async function POST(request: Request) {
  const denied = await requireCronOrTeamAuth(request)
  if (denied) return denied
  return runWhatsappPromo(new Date())
}
