import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  generateTotpSecret,
  generateQrDataUrl,
  generateRecoveryCodes,
  hashRecoveryCode,
  createPendingSetupCookie,
  requireMfaSetupStorage,
  audit,
} from "@/lib/auth/totp"

export async function POST() {
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

  const email = user.email ?? "usuario"
  const secret = generateTotpSecret(email)
  const qrDataUrl = await generateQrDataUrl(secret.otpauth_url)
  const recoveryCodes = generateRecoveryCodes(8)
  const recoveryHashes = recoveryCodes.map(hashRecoveryCode)

  // Guardamos el secreto pendiente en una cookie httpOnly cifrada (10 min) y
  // persistimos ya los hashes de los códigos de respaldo (aún sin activar 2FA).
  const cookieStore = await cookies()
  cookieStore.set("opinilab_mfa_pending", createPendingSetupCookie(secret.base32), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
  await requireMfaSetupStorage.setRecoveryPending(user.id, recoveryHashes)

  await audit("mfa.setup", { email }, { userId: user.id })

  return NextResponse.json({
    success: true,
    qrDataUrl,
    otpauth_url: secret.otpauth_url,
    recoveryCodes,
  })
}
