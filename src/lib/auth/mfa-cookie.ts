// ============================================================
// Firma de la cookie "opinilab_mfa_verified" — Edge-safe.
//
// Este módulo SOLO usa Web Crypto estándar (importKey/sign) para poder
// ejecutarse en el middleware de Edge (src/proxy.ts) y en Node (rutas API).
// NO importa node:crypto, speakeasy ni qrcode.
//
// La clave HMAC se deriva de TOTP_ENC_KEY: digest SHA-256 de la clave, usado
// como raw key de importKey. Este es el ÚNICO módulo que firma/verifica la
// cookie mfa_verified; las rutas API reimportan estas funciones desde aquí.
// ============================================================

async function hmacKey(): Promise<CryptoKey> {
  const raw = process.env.TOTP_ENC_KEY
  if (!raw) {
    throw new Error("TOTP_ENC_KEY no está configurada")
  }
  const material = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw)
  )
  return globalThis.crypto.subtle.importKey(
    "raw",
    material,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
}

async function sign(message: string): Promise<string> {
  const key = await hmacKey()
  const sigBuf = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  )
  // base64 a partir de bytes (Buffer disponible en Node y Edge de Next).
  const bytes = new Uint8Array(sigBuf)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function createMfaVerifiedCookie(userId: string): Promise<string> {
  const exp = Date.now() + 12 * 60 * 60 * 1000 // 12 h
  const body = `${userId}|${exp}`
  const sig = await sign(body)
  return `${body}|${sig}`
}

export async function isMfaVerifiedCookieValid(
  payload: string,
  userId: string
): Promise<boolean> {
  const parts = payload.split("|")
  if (parts.length !== 3) return false
  const [cookieUserId, expStr, sig] = parts
  const exp = Number(expStr)
  if (cookieUserId !== userId || !exp || exp < Date.now()) return false
  const body = `${cookieUserId}|${exp}`
  const expected = await sign(body)
  let provided: string
  try {
    const bytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0))
    provided = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  } catch {
    return false
  }
  const expBytes = Uint8Array.from(atob(expected), (c) => c.charCodeAt(0))
  const expectedHex = Array.from(expBytes, (b) => b.toString(16).padStart(2, "0")).join("")
  if (provided.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  return diff === 0
}
