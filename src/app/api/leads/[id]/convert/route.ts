import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { convertLeadToClientAction } from "@/app/dashboard/leads/actions"

// Convierte un lead en cliente (mismo flujo que el botón del panel de leads:
// crea el cliente, provisiona el acceso al portal y envía las credenciales por
// email). Requiere sesión autenticada con rol de equipo (admin/manager/member).

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

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

  const leadId = id
  if (!leadId) {
    return NextResponse.json({ error: "Falta el lead_id" }, { status: 400 })
  }

  const result = await convertLeadToClientAction(leadId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}