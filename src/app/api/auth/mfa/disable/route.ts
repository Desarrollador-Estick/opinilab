import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getMfaProfile,
  decryptSecret,
  verifyTotp,
  verifyRecoveryCode,
  setMfaEnabled,
  audit,
} from "@/lib/auth/totp"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const profile = await getMfaProfile(user.id)
  if (!profile.totp_enabled) {
    return NextResponse.json({ error: "El 2FA no está activo" }, { status: 400 })
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
    await audit("mfa.disable.failed", {}, { userId: user.id })
    return NextResponse.json({ error: "Código inválido." }, { status: 400 })
  }

  await setMfaEnabled(user.id, {
    totp_enabled: false,
    totp_secret: null,
    totp_recovery: null,
  })

  await audit("mfa.disabled", {}, { userId: user.id })
  return NextResponse.json({ success: true })
}
