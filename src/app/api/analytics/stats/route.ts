import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"

/**
 * Estadísticas de visitas y clics de la landing para el panel de admin.
 * Requiere sesión de equipo (admin/manager/member).
 *
 * Devuelve por día (últimos 14 días): visitas, clics, visitantes únicos;
 * además totales acumulados desde el inicio del seguimiento y los top clics.
 */
export async function GET() {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  const days = 14

  try {
    // Top clics (por etiqueta, acumulado)
    const { data: topClicksRows, error: topClicksError } = await supabase
      .from("page_events")
      .select("label")
      .eq("event_type", "click")
      .not("label", "is", null)
      .limit(2000)
    if (topClicksError) throw new Error(topClicksError.message)
    const clickCounts: Record<string, number> = {}
    for (const r of topClicksRows as Array<{ label: string | null }>) {
      const k = r.label || "(sin etiqueta)"
      clickCounts[k] = (clickCounts[k] || 0) + 1
    }
    const topClicks = Object.entries(clickCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)

    // Por día (últimos `days` días)
    const daysAgo = new Date()
    daysAgo.setHours(0, 0, 0, 0)
    daysAgo.setDate(daysAgo.getDate() - (days - 1))

    const { data: dailyRows, error: dailyError } = await supabase
      .from("page_events")
      .select("event_type, visitor_id, created_at")
      .gte("created_at", daysAgo.toISOString())
      .limit(10000)
    if (dailyError) throw new Error(dailyError.message)

    const dayMap: Record<
      string,
      { visits: number; clicks: number; visitors: Set<string>; day: Date }
    > = {}
    for (const r of dailyRows as Array<{
      event_type: string
      visitor_id: string | null
      created_at: string
    }>) {
      const d = new Date(r.created_at)
      const key = d.toISOString().slice(0, 10)
      if (!dayMap[key]) {
        dayMap[key] = { visits: 0, clicks: 0, visitors: new Set(), day: d }
      }
      if (r.event_type === "click") dayMap[key].clicks++
      else dayMap[key].visits++
      if (r.visitor_id) dayMap[key].visitors.add(r.visitor_id)
    }

    // Totales acumulados
    const { count: totalVisits, error: tvError } = await supabase
      .from("page_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "visit")
    if (tvError) throw new Error(tvError.message)

    const { count: totalClicks, error: tcError } = await supabase
      .from("page_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "click")
    if (tcError) throw new Error(tcError.message)

    const daily = Array.from({ length: days }, (_, i) => {
      const d = new Date(daysAgo)
      d.setDate(daysAgo.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const row = dayMap[key]
      return {
        date: key,
        label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
        visits: row?.visits ?? 0,
        clicks: row?.clicks ?? 0,
        visitors: row ? row.visitors.size : 0,
      }
    })

    return NextResponse.json({
      ok: true,
      totals: {
        visits: totalVisits ?? 0,
        clicks: totalClicks ?? 0,
        days,
      },
      daily,
      topClicks,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    )
  }
}
