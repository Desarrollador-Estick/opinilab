import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const AUTOMATION_EMAILS_DEFAULT = {
  review_request_enabled: false,
  review_request_after_payment: true,
  review_request_days_after_signup: 14,
  review_request_frequency_days: 90,
  review_auto_response_enabled: false,
  review_auto_response_notify_admin: true,
  report_auto_send_enabled: false,
  report_send_delay_hours: 1,
  report_send_only_if_paid: true,
}

function parseBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1"
}

function parseNum(
  v: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const n = Number(v)
  if (Number.isFinite(n)) {
    return Math.min(Math.max(Math.round(n), min), max)
  }
  return fallback
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "automation_emails_config")
    .maybeSingle()

  if (data?.value && typeof data.value === "object") {
    return NextResponse.json({
      ...AUTOMATION_EMAILS_DEFAULT,
      ...(data.value as Record<string, unknown>),
    })
  }
  return NextResponse.json(AUTOMATION_EMAILS_DEFAULT)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const config = {
    review_request_enabled: parseBool(body.review_request_enabled),
    review_request_after_payment: parseBool(body.review_request_after_payment),
    review_request_days_after_signup: parseNum(
      body.review_request_days_after_signup,
      14,
      0,
      365
    ),
    review_request_frequency_days: parseNum(
      body.review_request_frequency_days,
      90,
      1,
      3650
    ),
    review_auto_response_enabled: parseBool(body.review_auto_response_enabled),
    review_auto_response_notify_admin: parseBool(
      body.review_auto_response_notify_admin
    ),
    report_auto_send_enabled: parseBool(body.report_auto_send_enabled),
    report_send_delay_hours:
      body.report_send_delay_hours === ""
        ? 0
        : parseNum(body.report_send_delay_hours, 1, 0, 720),
    report_send_only_if_paid: parseBool(body.report_send_only_if_paid),
  }

  const { error } = await supabase.from("settings").upsert(
    {
      key: "automation_emails_config",
      value: config,
      category: "automation",
      description:
        "Configuración de automatizaciones de email: solicitudes de reseñas, borradores IA e informes mensuales",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, config })
}