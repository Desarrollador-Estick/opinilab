"use client"

import { useEffect, useState } from "react"

type DailyRow = {
  date: string
  label: string
  visits: number
  clicks: number
  visitors: number
}

type StatsResponse = {
  ok: boolean
  totals: { visits: number; clicks: number; days: number }
  daily: DailyRow[]
  topClicks: { label: string; count: number }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/analytics/stats")
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          throw new Error(j?.error || `Error ${res.status}`)
        }
        const j: StatsResponse = await res.json()
        if (!cancelled) setData(j)
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error cargando estadísticas")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const totals = data?.totals
  const clicksPerVisit =
    totals && totals.visits > 0
      ? (totals.clicks / totals.visits).toFixed(2)
      : "—"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            🔍 Analítica de la landing
          </h1>
          <p className="text-sm text-gray-500">
            Cuántas personas entran a opinilab.com y cuántas hacen clic
          </p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Totales acumulados */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Visitas totales"
              value={totals?.visits ?? 0}
              sub="acumulado"
            />
            <StatCard
              title="Clics totales"
              value={totals?.clicks ?? 0}
              sub="en enlaces/botones"
            />
            <StatCard
              title="Clics / visita"
              value={clicksPerVisit}
              sub="ratio medio"
            />
            <StatCard
              title="Ventana"
              value={`${totals?.days ?? 14} días`}
              sub="por día"
            />
          </div>

          {/* Por día */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold mb-4">📅 Por día</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Visitas</th>
                    <th className="pb-2 pr-4">Visitantes únicos</th>
                    <th className="pb-2">Clics</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily
                    .slice()
                    .reverse()
                    .map((row) => (
                      <tr key={row.date} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-700">
                          {row.label}
                        </td>
                        <td className="py-2 pr-4 font-semibold">
                          {row.visits}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {row.visitors}
                        </td>
                        <td className="py-2 font-semibold">{row.clicks}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top clics */}
          {data.topClicks.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">🎯 Clics más frecuentes</h3>
              <div className="space-y-2">
                {data.topClicks.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 truncate max-w-[70%]">
                      {c.label}
                    </span>
                    <span className="font-semibold">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.daily.every((d) => d.visits === 0 && d.clicks === 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Todavía no hay datos. El seguimiento se activa en cuanto alguien
              visite la landing (después del próximo deploy).
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string
  value: number | string
  sub: string
}) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="text-xs font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}