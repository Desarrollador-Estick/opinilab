import { NextResponse } from "next/server"
import { createServerAdminClient } from "@/lib/supabase/admin"

/**
 * Registra un evento de seguimiento (visita o clic) en la landing.
 * Público y anónimo: cualquiera que visite opinilab.com dispara esto.
 * Usa la service role para escribir, ya que la política RLS solo permite
 * insertar y la service role omite RLS (equivale a lo mismo aquí).
 *
 * Cuerpo esperado:
 *   { event_type: "visit" | "click", label?, path?, url?,
 *     referrer?, user_agent?, visitor_id? }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const eventType = body.event_type === "click" ? "click" : "visit"

  try {
    const supabase = await createServerAdminClient()
    const { error } = await supabase.from("page_events").insert({
      event_type: eventType,
      label: body.label && typeof body.label === "string" ? body.label.slice(0, 120) : null,
      path: typeof body.path === "string" ? body.path.slice(0, 200) : "/",
      url: body.url && typeof body.url === "string" ? body.url.slice(0, 500) : null,
      referrer:
        body.referrer && typeof body.referrer === "string"
          ? body.referrer.slice(0, 500)
          : null,
      user_agent:
        body.user_agent && typeof body.user_agent === "string"
          ? body.user_agent.slice(0, 500)
          : null,
      visitor_id:
        body.visitor_id && typeof body.visitor_id === "string"
          ? body.visitor_id.slice(0, 200)
          : null,
    })
    if (error) {
      console.error("[analytics] error insertando evento:", error.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
  } catch (err) {
    console.error("[analytics] error:", err instanceof Error ? err.message : "unknown")
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
