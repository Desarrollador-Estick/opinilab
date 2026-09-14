"use client"

import { useState, useOptimistic, useTransition, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  DAILY_CHECKLIST_KEY,
  localDateKey,
  recentDays,
  type DailyChecklistState,
} from "@/lib/daily-checklist"
import type { Json } from "@/types/database"

/** Sección del checklist diario interactivo. Se persiste en settings DB. */
export default function DailyChecklist({
  initial,
}: {
  initial: DailyChecklistState
}) {
  const supabase = createClient()
  const today = localDateKey()
  const [state, setState] = useState<DailyChecklistState>(initial)
  const [newLabel, setNewLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [optimisticState, applyOptimistic] = useOptimistic(
    state,
    (current, patch: Partial<DailyChecklistState>) => ({ ...current, ...patch })
  )
  const [isPending, startTransition] = useTransition()

  const checklist = optimisticState
  const doneToday = checklist.completions[today] ?? []
  const itemsToday = checklist.items.length
  const pct = itemsToday === 0 ? 0 : Math.round((doneToday.filter((id) => checklist.items.some((i) => i.id === id)).length / itemsToday) * 100)

  const persist = useCallback(
    async (next: DailyChecklistState) => {
      setSaving(true)
      await supabase
        .from("settings")
        .upsert(
          { key: DAILY_CHECKLIST_KEY, value: next as unknown as Json },
          { onConflict: "key" }
        )
      setSaving(false)
    },
    [supabase]
  )

  function toggleItem(id: string) {
    startTransition(() => {
      const done = new Set(doneToday)
      const willBeDone = !done.has(id)
      if (willBeDone) done.add(id)
      else done.delete(id)
      const next = {
        ...state,
        completions: { ...state.completions, [today]: [...done] },
      }
      applyOptimistic(next)
      persist(next).then(() => setState(next))
    })
  }

  function removeItem(id: string) {
    const next: DailyChecklistState = {
      items: state.items.filter((i) => i.id !== id),
      completions: state.completions,
    }
    applyOptimistic(next)
    persist(next).then(() => setState(next))
  }

  function addItem() {
    const label = newLabel.trim()
    if (!label) return
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const next: DailyChecklistState = {
      items: [...state.items, { id, label }],
      completions: state.completions,
    }
    applyOptimistic(next)
    setNewLabel("")
    persist(next).then(() => setState(next))
  }

  const history = recentDays(checklist, 14)

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Mi checklist de hoy</h3>
          <p className="text-xs text-gray-500">
            {today.split("-").reverse().join("/")}{" "}
            {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric" })}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {doneToday.length}/{itemsToday}
            </span>
          </div>
          {(saving || isPending) && (
            <span className="text-[10px] text-gray-400">guardando…</span>
          )}
        </div>
      </div>

      {checklist.items.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">
          Añade tareas para crear tu checklist diario.
        </p>
      ) : (
        <div className="space-y-1">
          {checklist.items.map((item) => {
            const isDone = doneToday.includes(item.id)
            return (
              <label
                key={item.id}
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isDone
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 group-hover:border-blue-400"
                  }`}
                  aria-label={isDone ? "Desmarcar" : "Marcar como hecho"}
                >
                  {isDone && (
                    <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span
                  className={`flex-1 text-sm transition-colors ${
                    isDone ? "text-gray-400 line-through" : "text-gray-800"
                  }`}
                >
                  {item.label}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs px-1 py-0.5 transition-opacity"
                  title="Eliminar tarea"
                >
                  ✕
                </button>
              </label>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Añadir nueva tarea…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!newLabel.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Añadir
        </button>
      </div>

      {/* Historial últimos 14 días */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">Historial (últimos 14 días)</p>
        <div className="flex gap-1.5 flex-wrap">
          {history.map((h) => (
            <div key={h.date} className="group relative">
              <div
                className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] transition-colors ${
                  h.progress === 100
                    ? "bg-green-100 text-green-700"
                    : h.progress > 0
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-400"
                }`}
                title={`${h.date}: ${h.progress}% completado`}
              >
                {h.progress === 100 ? "✓" : h.progress > 0 ? `${h.progress}` : "·"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}