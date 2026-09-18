import { createServerAdminClient } from "@/lib/supabase/admin"

/** Cuota diaria gratuita de Resend (100 emails/día por cuenta/equipo).
 *  Configurable vía RESEND_DAILY_QUOTA por si cambia de plan. */
export const DAILY_EMAIL_QUOTA = Number(process.env.RESEND_DAILY_QUOTA || 100)

export interface EmailQuota {
  used: number
  limit: number
  remaining: number
}

/** Inicio del día (UTC): el contador de Resend se reinicia a medianoche UTC. */
function utcDayStart(date: Date = new Date()): string {
  return date.toISOString().split("T")[0]
}

/**
 * Cuota diaria consumida hoy. Cuenta los emails efectivamente transmitidos:
 * filas de `email_sends` con resend_id (excluye "failed" y "skipped"). Si la
 * consulta falla se abre el grifo (fail-open) para que un error del contador
 * no bloquee envíos legítimos.
 */
export async function getEmailQuotaUsage(): Promise<EmailQuota> {
  try {
    const client = await createServerAdminClient()
    const { count, error } = await client
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .gte("created_at", utcDayStart())
      .not("resend_id", "is", null)
    if (error) throw error
    const used = Math.max(count ?? 0, 0)
    return {
      used,
      limit: DAILY_EMAIL_QUOTA,
      remaining: Math.max(DAILY_EMAIL_QUOTA - used, 0),
    }
  } catch {
    return { used: 0, limit: DAILY_EMAIL_QUOTA, remaining: DAILY_EMAIL_QUOTA }
  }
}

/** ¿Queda hueco en la cuota diaria? */
export async function hasEmailQuota(): Promise<boolean> {
  const { remaining } = await getEmailQuotaUsage()
  return remaining > 0
}