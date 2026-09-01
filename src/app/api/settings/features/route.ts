import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { getFeatureFlags, FEATURE_KEYS, FEATURE_LABELS, type FeatureKey } from "@/lib/settings"

// Endpoint de feature flags (activar/desactivar funcionalidades).
// - GET:  devuelve el estado actual de los flags (requiere sesión de equipo).
// - POST: actualiza flags (solo admins). Recibe { feature_marketing_ai: boolean, ... }.
// Persistidos en la tabla `settings`. El backend lee estos flags para bloquear
// (o permitir) cada funcionalidad de forma server-side.

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

  const flags = await getFeatureFlags()
  return NextResponse.json({ flags })
}

export async function POST(request: Request) {
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
  if (role !== "admin") {
    return NextResponse.json(
      { error: "Solo el administrador puede activar/desactivar funciones" },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const admin = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : supabase

  const allowed = Object.values(FEATURE_KEYS)
  const updates: { key: string; value: boolean; description?: string }[] = []

  for (const key of allowed) {
    const value = body[key]
    if (typeof value === "boolean") {
      updates.push({
        key,
        value,
        description: FEATURE_LABELS[key as FeatureKey],
      })
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No hay flags válidos para actualizar" }, { status: 400 })
  }

  for (const u of updates) {
    await admin
      .from("settings")
      .upsert({ key: u.key, value: u.value, description: u.description }, { onConflict: "key" })
  }

  const flags = await getFeatureFlags()
  return NextResponse.json({ success: true, flags })
}
