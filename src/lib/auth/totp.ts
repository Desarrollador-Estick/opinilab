import "server-only"
import crypto from "node:crypto"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

// ============================================================
// TOTP / 2FA helpers (SERVER ONLY)
//
// - Genera secretos TOTP compatibles con Google Authenticator /
//   Authy / 1Password mediante QR (otpauth://).
// - El secreto se guarda CIFRADO (AES-256-GCM) con TOTP_ENC_KEY.
// - Códigos de respaldo guardados como HASH (scrypt con salt).
// - `audit` inserta eventos de seguridad en `audit_logs`.
//
// IMPORTANTE: este módulo solo se importa desde rutas de servidor
// (API routes / server components). NUNCA desde el cliente.
// ============================================================

const ISSUER = "OpiniLab"

function encKey(): Buffer {
  const key = process.env.TOTP_ENC_KEY
  if (!key) {
    throw new Error("TOTP_ENC_KEY no está configurada. Añádela a las variables de entorno.")
  }
  return Buffer.from(key, "hex")
}

export function encryptSecret(secretPlain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv)
  const encrypted = Buffer.concat([cipher.update(secretPlain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(":")
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

export function generateTotpSecret(email: string) {
  const secret = speakeasy.generateSecret({ name: `${ISSUER}:${email}` })
  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url ?? "",
  }
}

export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 })
}

export function verifyTotp(secretBase32: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token,
    window: 1,
  })
}

// --- Recovery codes ---------------------------------------------------------

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(6).toString("hex").toUpperCase().slice(0, 10)
    codes.push(code.replace(/(.{5})/, "$1-"))
  }
  return codes
}

export function hashRecoveryCode(code: string): string {
  const clean = code.replace(/[^A-Z0-9]/gi, "").toUpperCase()
  const salt = crypto.randomBytes(16).toString("base64")
  const hash = crypto.scryptSync(clean, salt, 32).toString("base64")
  return `${salt}:${hash}`
}

export function verifyRecoveryCode(input: string, storedHashes: string[] | null): boolean {
  if (!storedHashes?.length) return false
  const clean = input.replace(/[^A-Z0-9]/gi, "").toUpperCase()
  return storedHashes.some((stored) => {
    const [salt, hash] = stored.split(":")
    const candidate = crypto.scryptSync(clean, salt, 32).toString("base64")
    return crypto.timingSafeEqual(Buffer.from(hash, "base64"), Buffer.from(candidate, "base64"))
  })
}

// --- Pending setup cookie (guarda el secreto a mitad de registro) ----------
// Entre "setup" (generar QR) y "verify" (confirmar código) el secreto se guarda
// en una cookie httpOnly cifrada, para que el cliente nunca lo transporte.

export function createPendingSetupCookie(pendingSecret: string): string {
  const exp = Date.now() + 10 * 60 * 1000 // 10 min
  const payload = `${exp}|${encryptSecret(pendingSecret)}`
  return payload
}

export function readPendingSetupCookie(payload: string): string | null {
  const parts = payload.split("|")
  if (parts.length !== 2) return null
  const exp = Number(parts[0])
  if (!exp || exp < Date.now()) return null
  try {
    return decryptSecret(parts[1])
  } catch {
    return null
  }
}

// --- MFA verified cookie (marca que el usuario ya pasó el TOTP) ------------
// Se emite al validar el código en /login/mfa y la comprueba el middleware para
// permitir el acceso al dashboard de un usuario con 2FA. Lógica Edge-safe en
// mfa-cookie.ts (Web Crypto), reexportada aquí para las rutas API.
export { createMfaVerifiedCookie, isMfaVerifiedCookieValid } from "@/lib/auth/mfa-cookie"

// --- Audit trail ------------------------------------------------------------

export async function audit(
  action: string,
  details?: Record<string, unknown>,
  ctx?: { userId?: string | null; ip?: string | null; userAgent?: string | null }
) {
  if (!isServiceRoleConfigured()) return
  const supabase = await createServerAdminClient()
  await supabase.from("audit_logs").insert({
    user_id: ctx?.userId ?? null,
    action,
    details: (details ?? null) as unknown as Json,
    ip: ctx?.ip ?? null,
    user_agent: ctx?.userAgent ?? null,
  })
}

// --- Profile access (siempre service role; omite RLS) -----------------------

async function requireAdmin() {
  if (!isServiceRoleConfigured()) throw new Error("Service role no configurada")
  return createServerAdminClient()
}

export async function getMfaProfile(userId: string): Promise<{
  totp_secret: string | null
  totp_enabled: boolean
  totp_recovery: string[] | null
  role: string | null
  email: string | null
}> {
  const supabase = await requireAdmin()
  const { data, error } = await supabase
    .from("profiles")
    .select("totp_secret, totp_enabled, totp_recovery, role, email")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw error
  return {
    totp_secret: data?.totp_secret ?? null,
    totp_enabled: data?.totp_enabled ?? false,
    totp_recovery: data?.totp_recovery ?? null,
    role: data?.role ?? null,
    email: data?.email ?? null,
  }
}

export async function setMfaEnabled(
  userId: string,
  payload: {
    totp_enabled: boolean
    totp_secret?: string | null
    totp_recovery?: string[] | null
  }
) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
  if (error) throw error
}

// Helper para persistir los hashes de recovery codes durante el setup (aún sin
// activar 2FA). Se reutiliza setMfaEnabled sin activar el flag.
export const requireMfaSetupStorage = {
  async setRecoveryPending(userId: string, recoveryHashes: string[]) {
    await setMfaEnabled(userId, {
      totp_enabled: false,
      totp_recovery: recoveryHashes,
    })
  },
}
