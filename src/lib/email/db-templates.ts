import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export interface ResolvedEmailTemplate {
  subject: string
  body: string
}

interface VariablesMap {
  [key: string]: string | number | null
}

/**
 * Sustituye los placeholders {var} del texto por los valores recibidos
 * (usando regex global en vez de replaceAll por compatibilidad con el target
 * ES2017 del tsconfig).
 */
export function resolveTemplateVariables(
  text: string,
  variables: VariablesMap
): string {
  let resolved = text
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, "g")
    resolved = resolved.replace(placeholder, String(value ?? ""))
  }
  return resolved
}

/**
 * Obtiene una plantilla de email editable desde la tabla email_templates
 * mediante su `key` (ej. lead_contact, followup_1, followup_2). Sustituye los
 * placeholders {var} del asunto y del body con los valores recibidos.
 *
 * Devuelve null si la plantilla no existe o está inactiva, para que el llamador
 * pueda hacer fallback a las plantillas hardcodeadas de `src/lib/email/templates.ts`.
 */
export async function getDbEmailTemplate(
  supabase: SupabaseClient<Database>,
  key: string,
  variables: VariablesMap = {}
): Promise<ResolvedEmailTemplate | null> {
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle()

  if (!data) {
    return null
  }

  return {
    subject: resolveTemplateVariables(data.subject, variables),
    body: resolveTemplateVariables(data.body, variables),
  }
}