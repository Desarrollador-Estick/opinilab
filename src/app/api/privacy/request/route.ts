import { NextResponse } from "next/server"
import { createServerAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { privacyRequestNotify } from "@/lib/email/templates"

const VALID_TYPES = [
  "acceso",
  "rectificacion",
  "supresion",
  "limitacion",
  "portabilidad",
  "oposicion",
  "baja_marketing",
]

// Endpoint público para ejercer derechos RGPD (ARCO + baja de marketing).
// Crea la solicitud en privacy_requests y notifica al equipo por email.

export async function POST(request: Request) {
  let body: {
    full_name?: string
    email?: string
    request_type?: string
    details?: string
    company?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  // Honeypot anti-bots.
  if (body.company) {
    return NextResponse.json({ ok: true })
  }

  const email = (body.email || "").trim().toLowerCase()
  const fullName = (body.full_name || "").trim().slice(0, 120)
  const requestType = body.request_type || ""
  const details = (body.details || "").trim().slice(0, 4000)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 })
  }
  if (!VALID_TYPES.includes(requestType)) {
    return NextResponse.json({ error: "Tipo de solicitud no válido" }, { status: 400 })
  }

  const supabase = await createServerAdminClient()
  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      full_name: fullName || null,
      email,
      request_type: requestType,
      details: details || null,
    })
    .select("id")

  if (error) {
    console.error("[privacy] Error registrando solicitud:", error)
    return NextResponse.json({ error: "No se pudo registrar la solicitud" }, { status: 500 })
  }

  if (!error) {
    const notify = privacyRequestNotify(fullName || null, email, requestType, details)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.COMPANY_EMAIL
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        template: "privacyRequest",
        subject: notify.subject,
        html: notify.html,
        data: { privacyRequestId: data?.[0]?.id, requestType },
      })
    }
  }

  return NextResponse.json({ ok: true })
}