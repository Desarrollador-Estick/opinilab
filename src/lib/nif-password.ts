export function derivePasswordFromNif(nif: string | null | undefined): string | null {
  if (!nif) return null
  const cleaned = nif.replace(/\s+/g, "")
  if (cleaned.length === 0) return null

  const last = cleaned[cleaned.length - 1]
  const isLetterEnd = /[A-Za-z]/.test(last)

  const body = cleaned.slice(0, -1)
  const digits = [...body].filter((c) => /[0-9A-Za-z]/.test(c))
  const lastFive = digits.slice(-5).join("")

  if (!isLetterEnd) return null
  if (lastFive.length < 5) return null

  return `${lastFive}${last.toUpperCase()}`
}
