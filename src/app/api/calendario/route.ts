import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const DEFAULT_CALENDAR: Record<string, boolean | number> = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: true,
  sunday_sync: true,
  weekly_goal: 50,
}

function parseBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1"
}

function startOfWeekMonday(d: Date): Date {
  const date = new Date(d)
  const diff = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function GET() {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  const { data: row } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "work_calendar")
    .maybeSingle()

  const stored =
    row?.value && typeof row.value === "object"
      ? (row.value as Record<string, unknown>)
      : {}
  const calendar = { ...DEFAULT_CALENDAR, ...stored }

  const weekStart = startOfWeekMonday(new Date()).toISOString()
  const { count: createdThisWeek } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekStart)
  const { count: totalClients } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })

  const weeklyGoal = Number(calendar.weekly_goal)
  return NextResponse.json({
    calendar,
    weekly_goal: Number.isFinite(weeklyGoal) ? weeklyGoal : 50,
    clients_created_this_week: createdThisWeek ?? 0,
    total_clients: totalClients ?? 0,
  })
}

export async function POST(request: Request) {
  const { supabase, error: authError } = await requireTeamRole()
  if (authError) return authError

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const calendar: Record<string, boolean | number> = { ...DEFAULT_CALENDAR }
  for (const key of DAY_KEYS) {
    if (typeof body[key] !== "undefined") calendar[key] = parseBool(body[key])
  }
  if (typeof body.sunday_sync !== "undefined") {
    calendar.sunday_sync = parseBool(body.sunday_sync)
  }

  const goal = Number(body.weekly_goal)
  if (Number.isFinite(goal) && goal >= 0) {
    calendar.weekly_goal = Math.min(Math.max(Math.round(goal), 0), 10000)
  }

  const { error } = await supabase.from("settings").upsert(
    {
      key: "work_calendar",
      value: calendar,
      category: "work",
      description:
        "Calendario laboral: días de trabajo, puesta al día dominical y objetivo semanal",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, calendar })
}