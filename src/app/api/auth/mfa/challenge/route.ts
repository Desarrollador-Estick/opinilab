import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  getMfaProfile,
  decryptSecret,
  verifyTotp,
  verifyRecoveryCode,
  createMfaVerifiedCookie,
  audit,
} from "@/lib/auth/totp"

// Paso 2 del login con 2FA. El usuario ya tiene sesión (vino de
// signInWithPassword); aquí se valida el TOTP / código de respaldo y se emite
// la cookie "mfa_verified" que permite el acceso real al dashboard.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const code = (body.code ?? "").trim()
  if (!code) {
    return NextResponse.json({ error: "Introduce tu código de 6 dígitos" }, { status: 400 })
  }

  const profile = await getMfaProfile(user.id)
  if (!profile.totp_enabled) {
    return NextResponse.json({ error: "El 2FA no está activo" }, { status: 400 })
  }

  let valid = false
  try {
    if (profile.totp_secret) {
      valid = verifyTotp(decryptSecret(profile.totp_secret), code)
    }
  } catch {
    valid = false
  }
  if (!valid) {
    valid = verifyRecoveryCode(code, profile.totp_recovery)
  }

  if (!valid) {
    await audit("mfa.login.failed", {}, { userId: user.id })
    return NextResponse.json({ error: "Código inválido. Inténtalo de nuevo." }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set("opinilab_mfa_verified", await createMfaVerifiedCookie(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  })

  await audit("mfa.login.success", {}, { userId: user.id })
  return NextResponse.json({ success: true })
}
