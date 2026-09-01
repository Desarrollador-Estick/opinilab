import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Endpoint de estado de las integraciones (API) del panel de Configuración.
// Devuelve SOLO booleanos indicando si cada clave está configurada, NUNCA los
// valores de las claves, para no exponer secretos al navegador.
// Requiere sesión autenticada con rol de equipo (admin/manager/member).

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role
  if (!role || role === "client") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const env = (key: string) =>
    Boolean(process.env[key] && process.env[key]!.trim().length > 0)

  return NextResponse.json({
    keys: {
      groq: env("GROQ_API_KEY"),
      resend: env("RESEND_API_KEY"),
      stripe_secret: env("STRIPE_SECRET_KEY"),
      stripe_webhook: env("STRIPE_WEBHOOK_SECRET"),
      supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      supabase_url: env("NEXT_PUBLIC_SUPABASE_URL"),
      app_url: env("NEXT_PUBLIC_APP_URL"),
    },
  })
}
