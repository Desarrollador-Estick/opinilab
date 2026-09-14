/** Checklist diario del administrador: lista recurrente de tareas que el
 *  dueño de la agencia debe revisar cada día, persistida en la tabla settings
 *  (clave `daily_checklist`) como JSON. Las «completadas» se guardan por fecha
 *  local (YYYY-MM-DD), de modo que cada día empieza vacío pero conserva el
 *  historial para el seguimiento. */

export interface DailyChecklistItem {
  id: string
  label: string
}

export interface DailyChecklistState {
  items: DailyChecklistItem[]
  /** fecha local "YYYY-MM-DD" → ids completados ese día */
  completions: Record<string, string[]>
}

export const DAILY_CHECKLIST_KEY = "daily_checklist"

/** Fecha local en formato YYYY-MM-DD (evita el desplazamiento de UTC). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export const DEFAULT_DAILY_CHECKLIST: DailyChecklistItem[] = [
  {
    id: "default-replies",
    label: "Revisar y aprobar las respuestas del agente de ventas",
  },
  { id: "default-leads", label: "Revisar los leads nuevos capturados" },
  { id: "default-invoices", label: "Comprobar pagos y facturas pendientes" },
  { id: "default-scraper", label: "Verificar la ejecución del scraper y el volumen" },
  { id: "default-errors", label: "Revisar errores o fallos de automatización" },
]

/** Parsea el valor de settings (object o string JSON). Si no existe la fila o
 *  está vacía, devuelve el checklist por defecto. */
export function parseDailyChecklist(raw: unknown): DailyChecklistState {
  let obj: DailyChecklistState | null = null
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as DailyChecklistState
    } catch {
      obj = null
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    obj = raw as DailyChecklistState
  }

  if (!obj || !Array.isArray(obj.items)) {
    return {
      items: DEFAULT_DAILY_CHECKLIST.map((i) => ({ ...i })),
      completions: {},
    }
  }

  return {
    items: obj.items.filter(
      (i): i is DailyChecklistItem =>
        Boolean(i && typeof i.id === "string" && typeof i.label === "string")
    ),
    completions:
      obj.completions && typeof obj.completions === "object"
        ? obj.completions
        : {},
  }
}

/** Porcentaje completado hoy (0-100). */
export function todayProgress(
  state: DailyChecklistState,
  date = localDateKey()
): number {
  const items = state.items
  if (items.length === 0) return 0
  const done = state.completions[date] ?? []
  return Math.round((done.filter((id) => items.some((i) => i.id === id)).length / items.length) * 100)
}

/** Días (últimos n, recorridos a la inversa) con su tasa de finalización. */
export function recentDays(
  state: DailyChecklistState,
  days = 14
): { date: string; label: string; progress: number; done: boolean }[] {
  const result: { date: string; label: string; progress: number; done: boolean }[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    result.push({
      date: key,
      label: d.toLocaleDateString("es-ES", { weekday: "short" }),
      progress: todayProgress(state, key),
      done: todayProgress(state, key) === 100,
    })
  }
  return result
}