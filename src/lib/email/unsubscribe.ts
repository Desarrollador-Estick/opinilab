import { createHmac, timingSafeEqual } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

function getUnsubscribeSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    "opinilab-unsubscribe-secret"
  )
}

// Firma HMAC del email en minúsculas: impide que alguien dé de baja un email
// ajeno solo con conocer la dirección.
export function buildUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase()
  return createHmac("sha256", getUnsubscribeSecret()).update(normalized).digest("hex")
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(buildUnsubscribeToken(email))
  const provided = Buffer.from(token || "")
  if (expected.length !== provided.length) return false
  return timingSafeEqual(expected, provided)
}

export function buildUnsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://opinilab.com"
  const token = buildUnsubscribeToken(email)
  return `${base}/api/email/unsubscribe?email=${encodeURIComponent(email.trim().toLowerCase())}&sig=${token}`
}

export async function isEmailSuppressed(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<boolean> {
  const { data } = await supabase
    .from("email_suppressions")
    .select("email")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle()
  return !!data
}

export async function addEmailSuppression(
  supabase: SupabaseClient<Database>,
  email: string,
  source = "unsubscribe_link"
): Promise<void> {
  const normalized = email.trim().toLowerCase()
  const { data: existing } = await supabase
    .from("email_suppressions")
    .select("email")
    .eq("email", normalized)
    .maybeSingle()
  if (!existing) {
    await supabase.from("email_suppressions").insert({ email: normalized, source })
  }
}