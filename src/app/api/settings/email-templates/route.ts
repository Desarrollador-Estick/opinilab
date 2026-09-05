import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// API de plantillas de email editables.
// Requiere sesión autenticada con rol de equipo (admin/manager/member).

async function requireTeamRole() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) as unknown as Response }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role
  if (!role || role === "client") {
    return { supabase, error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) as unknown as Response }
  }

  return { supabase, error: null }
}

export async function GET() {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  const { data, error: dataError } = await supabase
    .from("email_templates")
    .select("id, key, name, subject, body, category, variables, is_active, updated_at")
    .order("key")

  if (dataError) {
    return NextResponse.json({ error: dataError.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data })
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  const updates = await request.json()
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "Se esperaba un array de actualizaciones" }, { status: 400 })
  }

  const results: { id: string; ok: boolean; error?: string }[] = []
  for (const update of updates) {
    const { id, ...fields } = update
    if (!id) continue

    const allowed: Record<string, unknown> = {}
    if (typeof fields.subject === "string") allowed.subject = fields.subject
    if (typeof fields.body === "string") allowed.body = fields.body
    if (typeof fields.name === "string") allowed.name = fields.name
    if (typeof fields.is_active === "boolean") allowed.is_active = fields.is_active
    if (Array.isArray(fields.variables)) allowed.variables = fields.variables

    if (Object.keys(allowed).length === 0) {
      results.push({ id, ok: true })
      continue
    }

    const { error: updateError } = await supabase
      .from("email_templates")
      .update({
        ...allowed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    results.push(updateError ? { id, ok: false, error: updateError.message } : { id, ok: true })
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "Algunas plantillas no se pudieron actualizar", failed },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, updated: results.length })
}