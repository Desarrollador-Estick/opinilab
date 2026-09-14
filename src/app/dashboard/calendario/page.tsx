"use client"

import { useState, useEffect } from "react"

const DAY_META: {
  key: string
  label: string
  short: string
  color: string
}[] = [
  { key: "monday", label: "Lunes", short: "L", color: "bg-blue-500" },
  { key: "tuesday", label: "Martes", short: "M", color: "bg-orange-500" },
  { key: "wednesday", label: "Miércoles", short: "X", color: "bg-yellow-500" },
  { key: "thursday", label: "Jueves", short: "J", color: "bg-purple-500" },
  { key: "friday", label: "Viernes", short: "V", color: "bg-green-500" },
  { key: "saturday", label: "Sábado", short: "S", color: "bg-pink-500" },
  { key: "sunday", label: "Domingo", short: "D", color: "bg-red-500" },
]

const DEFAULTS: Record<string, boolean> = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: true,
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export default function CalendarioPage() {
  const [days, setDays] = useState<Record<string, boolean>>(DEFAULTS)
  const [sundaySync, setSundaySync] = useState(true)
  const [weeklyGoal, setWeeklyGoal] = useState(50)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [createdThisWeek, setCreatedThisWeek] = useState(0)
  const [totalClients, setTotalClients] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/calendario")
        if (!res.ok) throw new Error("Error cargando calendario")
        const data = await res.json()
        if (data.calendar) {
          setDays({
            monday: data.calendar.monday,
            tuesday: data.calendar.tuesday,
            wednesday: data.calendar.wednesday,
            thursday: data.calendar.thursday,
            friday: data.calendar.friday,
            saturday: data.calendar.saturday,
            sunday: data.calendar.sunday,
          })
          setSundaySync(data.calendar.sunday_sync ?? true)
        }
        setWeeklyGoal(Number(data.weekly_goal) || 50)
        setCreatedThisWeek(data.clients_created_this_week ?? 0)
        setTotalClients(data.total_clients ?? 0)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error desconocido")
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError("")
    try {
      const res = await fetch("/api/calendario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...days, sunday_sync: sundaySync, weekly_goal: weeklyGoal }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Error al guardar")
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setSaving(false)
    }
  }

  const workingDays = Object.values(days).filter(Boolean).length
  const goalProgress = weeklyGoal > 0 ? Math.round((createdThisWeek / weeklyGoal) * 100) : 0
  const missingForGoal = Math.max(0, weeklyGoal - createdThisWeek)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendario Laboral</h2>
          <p className="text-gray-500">Configura los días de trabajo y tu objetivo semanal</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
          ✅ Calendario guardado correctamente
        </div>
      )}

      {/* Objetivo semanal */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-lg mb-1">Objetivo de la semana</h3>
        <p className="text-sm text-gray-500 mb-4">Meta de clientes nuevos a crear esta semana (lunes a domingo)</p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{createdThisWeek}</div>
            <div className="text-sm text-blue-700 mt-1">Creados esta semana</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{weeklyGoal}</div>
            <div className="text-sm text-purple-700 mt-1">Meta semanal</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{totalClients}</div>
            <div className="text-sm text-green-700 mt-1">Clientes totales</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">
              {goalProgress >= 100
                ? "🎉 ¡Objetivo alcanzado!"
                : `Faltan ${missingForGoal} clientes`}
            </span>
            <span className="font-medium">{goalProgress}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goalProgress >= 100
                  ? "bg-green-500"
                  : goalProgress >= 60
                    ? "bg-blue-500"
                    : "bg-yellow-500"
              }`}
              style={{ width: `${Math.min(goalProgress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Meta semanal:</label>
          <input
            type="number"
            min={0}
            max={10000}
            value={weeklyGoal}
            onChange={(e) => {
              const v = Number(e.target.value)
              setWeeklyGoal(Number.isFinite(v) ? Math.max(0, Math.min(v, 10000)) : 50)
            }}
            className="w-24 border rounded-lg px-3 py-1.5 text-sm text-center"
          />
          <span className="text-sm text-gray-500">clientes</span>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-lg mb-1">Días de trabajo</h3>
        <p className="text-sm text-gray-500 mb-4">
          Selecciona los días en los que trabajas. Actualmente:{" "}
          <span className="font-medium text-blue-600">{workingDays}/7</span> días activos
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DAY_META.map((day) => {
            const isSunday = day.key === "sunday"
            const checked = days[day.key] ?? false

            return (
              <div
                key={day.key}
                className={`rounded-lg border p-4 flex items-center gap-4 transition-colors ${
                  checked
                    ? "border-gray-200 bg-white"
                    : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${day.color}`}
                >
                  {day.short}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{day.label}</div>
                  {isSunday && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      🛠️ Puesta al día con el administrador
                    </div>
                  )}
                </div>
                <Switch checked={checked} onChange={(v) => setDays({ ...days, [day.key]: v })} />
              </div>
            )
          })}
        </div>

        {days.sunday && sundaySync && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🛠️</span>
              <div className="text-sm">
                <div className="font-medium text-amber-800">Domingo — Puesta al día</div>
                <div className="text-amber-700 mt-1">
                  El domingo está habilitado como día de puesta al día con el administrador: consultar fallos,
                  actualizar configuraciones y revisar el estado del sistema.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t">
          <Switch checked={sundaySync} onChange={setSundaySync} />
          <div>
            <div className="text-sm font-medium">Domingo = puesta al día</div>
            <div className="text-xs text-gray-500">
              Etiqueta informativa: consultar fallos y actualizaciones
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
        >
          {saving ? "Guardando..." : saved ? "✅ Guardado" : "Guardar calendario"}
        </button>
      </div>
    </div>
  )
}