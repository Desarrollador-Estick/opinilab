import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  readPendingSetupCookie,
  verifyTotp,
  setMfaEnabled,
  encryptSecret,
  createMfaVerifiedCookie,
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

  const cookieStore = await cookies()
  const pending = cookieStore.get("opinilab_mfa_pending")?.value
  const secret = pending ? readPendingSetupCookie(pending) : null
  if (!secret) {
    return NextResponse.json(
      { error: "La configuración de 2FA ha caducado. Vuelve a empezar." },
      { status: 400 }
    )
  }

  if (!verifyTotp(secret, code)) {
    await audit("mfa.verify.failed", {}, { userId: user.id })
    return NextResponse.json({ error: "Código inválido. Inténtalo de nuevo." }, { status: 400 })
  }

  // El secreto se guarda CIFRADO; los hashes de recovery ya se persistieron en setup.
  await setMfaEnabled(user.id, {
    totp_enabled: true,
    totp_secret: encryptSecret(secret),
  })

  cookieStore.delete("opinilab_mfa_pending")

  // Al activar 2FA se emite también la cookie mfa_verified, de modo que el
  // usuario (p.ej. el admin obligado) pueda entrar al panel inmediatamente.
  cookieStore.set("opinilab_mfa_verified", await createMfaVerifiedCookie(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  })

  await audit("mfa.enabled", {}, { userId: user.id })
  return NextResponse.json({ success: true })
}
