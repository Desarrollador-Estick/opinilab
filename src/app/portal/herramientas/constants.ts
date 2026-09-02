export const TOOL_TYPE_OPTIONS = [
  { value: "gbp", label: "Google Business Profile" },
  { value: "social_media", label: "Redes sociales" },
  { value: "ads", label: "Publicidad" },
  { value: "web", label: "Web" },
  { value: "email", label: "Email marketing" },
  { value: "other", label: "Otro" },
]

export const TOOL_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TOOL_TYPE_OPTIONS.map((o) => [o.value, o.label])
)
