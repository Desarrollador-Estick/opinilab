import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"

interface PromoInput {
  name?: string | null
  email: string
  business_name?: string | null
  notes?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

// ¿Este email ya existe como lead o como cliente? No queremos promocionar
// a quien ya es o ya está siendo atendido.
async function isEmailInUse(supabase: Awaited<ReturnType<typeof requireTeamRole>>["supabase"], email: string) {
  const { data: inPromo } = await supabase
    .from("promo_recipients")
    .select("id")
    .ilike("email", email)
    .limit(1)
  if (inPromo && inPromo.length > 0) return "ya está en la lista de promoción"

  const { data: asLead } = await supabase
    .from("leads")
    .select("id")
    .ilike("email", email)
    .limit(1)
  if (asLead && asLead.length > 0) return "ya existe como lead"

  const { data: asClient } = await supabase
    .from("clients")
    .select("id")
    .ilike("email", email)
    .limit(1)
  if (asClient && asClient.length > 0) return "ya es cliente"

  return null
}

export async function GET() {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  const { data, error: dataError } = await supabase
    .from("promo_recipients")
    .select("*")
    .order("created_at", { ascending: false })

  if (dataError) {
    return NextResponse.json({ error: dataError.message }, { status: 500 })
  }

  return NextResponse.json({ recipients: data })
}

// POST acepta un objeto único o un array/`{ recipients: [] }` (añadir varios).
export async function POST(request: Request) {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const raw: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray((body as { recipients?: unknown[] })?.recipients)
      ? (body as { recipients: unknown[] }).recipients
      : [body]

  const created: { email: string; name: string | null; business_name: string | null }[] = []
  const skipped: { email: string; reason: string }[] = []

  for (const item of raw) {
    const input = (item ?? {}) as Partial<PromoInput>
    const email = (input.email ?? "").trim().toLowerCase()

    if (!email || !EMAIL_RE.test(email)) {
      skipped.push({ email: email || "", reason: "email no válido" })
      continue
    }

    const reason = await isEmailInUse(supabase, email)
    if (reason) {
      skipped.push({ email, reason })
      continue
    }

    const name = cleanString(input.name)
    const business_name = cleanString(input.business_name)
    const notes = cleanString(input.notes)

    const { error: insertError } = await supabase.from("promo_recipients").insert({
      email,
      name,
      business_name,
      notes,
      status: "pending",
    })

    if (insertError) {
      skipped.push({ email, reason: insertError.message })
    } else {
      created.push({ email, name, business_name })
    }
  }

  return NextResponse.json({ ok: true, created, skipped })
}