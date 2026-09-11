import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"
import { createServerAdminClient } from "@/lib/supabase/admin"

// Listado de solicitudes de protección de datos (solo equipo).

export async function GET() {
  const { error: authError } = await requireTeamRole()
  if (authError) return authError

  const supabase = await createServerAdminClient()
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}