/** Normalización de direcciones de correo capturadas de fuentes públicas
 *  (OSM, webs, listados). Los tags pueden traer varios emails separados por
 *  `;`, `,` o espacios; fuera del proceso de scraping solo debería usarse un
 *  único email como destinatario principal. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidSingleEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/** Divide un campo que puede contener varios emails (separados por ; , espacio
 *  o nueva línea) y devuelve solo los que tienen forma de email válido. */
export function splitEmails(value: string | null | undefined): string[] {
  if (!value) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of value.split(/[;,/\s]+/)) {
    const e = part.trim().toLowerCase()
    if (!e || seen.has(e)) continue
    if (isValidSingleEmail(e)) {
      seen.add(e)
      result.push(e)
    }
  }
  return result
}

/** Primer email válido de un campo, o null si no hay ninguno. */
export function normalizeSingleEmail(
  value: string | null | undefined
): string | null {
  const emails = splitEmails(value)
  return emails.length > 0 ? emails[0] : null
}