import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Requiere sesión autenticada con rol de equipo (admin/manager/member).
// Devuelve un cliente Supabase de sesión y `error` (Response) si no autorizado.
export async function requireTeamRole() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase,
      error: NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      ) as unknown as Response,
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role
  if (!role || role === "client") {
    return {
      supabase,
      error: NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      ) as unknown as Response,
    }
  }

  return { supabase, error: null }
}