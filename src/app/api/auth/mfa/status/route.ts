import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMfaProfile } from "@/lib/auth/totp"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const profile = await getMfaProfile(user.id)
  const role = profile.role
  if (!role || role === "client") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  return NextResponse.json({
    success: true,
    enabled: profile.totp_enabled,
    role,
  })
}
