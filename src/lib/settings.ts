import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"

// Nombre canónico de los feature flags persistidos en la tabla `settings`.
// Valor jsonb: booleano true/false.
export const FEATURE_KEYS = {
  marketingAi: "feature_marketing_ai",
  leadsCapture: "feature_leads_capture",
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

// Valores por defecto: todo activado salvo que se diga lo contrario.
export const FEATURE_DEFAULTS: Record<FeatureKey, boolean> = {
  [FEATURE_KEYS.marketingAi]: true,
  [FEATURE_KEYS.leadsCapture]: true,
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  [FEATURE_KEYS.marketingAi]: "IA de Marketing (posts y contenido)",
  [FEATURE_KEYS.leadsCapture]: "Captación de leads (formulario web)",
}

function parseBool(value: unknown): boolean {
  if (value === true || value === "true") return true
  if (value === false || value === "false") return false
  return true
}

// Lee los feature flags. Se usa en el servidor, sin necesidad de sesión de usuario
// (preadministrado por el rol admin vía API). Usa service role si está configurado,
// para poder leer los flags incluso en contextos públicos (p.ej. el formulario de
// contacto) que no tienen sesión.
export async function getFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  const client = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()

  const keys = Object.values(FEATURE_KEYS)
  const { data } = await client.from("settings").select("key, value").in("key", keys)

  const flags = { ...FEATURE_DEFAULTS }
  if (data) {
    data.forEach((row) => {
      const key = row.key as FeatureKey
      if (key in flags) {
        flags[key] = parseBool(row.value)
      }
    })
  }
  return flags
}

// Comprueba si un feature está activo (devuelve true/false, no lanza).
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags()
  return flags[key]
}
