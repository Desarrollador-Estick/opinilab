"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatCurrency } from "@/lib/utils"

interface Report {
  id: string
  client_id: string
  clients?: { business_name: string } | null
  title: string
  report_type: string
  period_start: string | null
  period_end: string | null
  content: Record<string, unknown> | null
  status: string
  created_at: string
}

interface Client {
  id: string
  business_name: string
}

const reportTypes = [
  { value: "monthly", label: "Reporte Mensual", icon: "📈" },
  { value: "seo", label: "Auditoría SEO", icon: "🔍" },
  { value: "reviews", label: "Informe de Reseñas", icon: "⭐" },
  { value: "social", label: "Redes Sociales", icon: "📱" },
  { value: "roi", label: "ROI Publicitario", icon: "💰" },
  { value: "email", label: "Email Marketing", icon: "📧" },
]

const statusColors: Record<string, string> = {
  generated: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-800",
}

export default function ReportesPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedType, setSelectedType] = useState("monthly")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [reportsRes, clientsRes] = await Promise.all([
      supabase
        .from("reports")
        .select("*, clients(business_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, business_name")
        .order("business_name"),
    ])
    setReports((reportsRes.data as Report[]) || [])
    setClients((clientsRes.data as Client[]) || [])
    setLoading(false)
  }

  const filteredReports = reports.filter((r) => {
    if (filterType !== "all" && r.report_type !== filterType) return false
    return true
  })

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClient || !periodStart || !periodEnd) return
    setGenerating(true)
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: selectedClient,
        report_type: selectedType,
        period_start: periodStart,
        period_end: periodEnd,
      }),
    })
    const data = await res.json()
    setGenerating(false)
    if (data.success) {
      setShowForm(false)
      setSelectedClient("")
      setPeriodStart("")
      setPeriodEnd("")
      loadData()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reportes</h2>
          <p className="text-gray-500">Informes automáticos para clientes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? "Cancelar" : "Generar Reporte"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleGenerate} className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Nuevo Reporte</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cliente *</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de reporte</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                {reportTypes.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.icon} {rt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Desde *</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hasta *</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={generating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
          >
            {generating ? "Generando..." : "Generar Reporte"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setFilterType("all")}
          className={`rounded-xl border p-4 text-center hover:shadow-md transition ${
            filterType === "all" ? "border-blue-300 bg-blue-50" : "bg-white"
          }`}
        >
          <p className="text-2xl mb-1">📊</p>
          <p className="text-xs font-medium">Todos</p>
          <p className="text-lg font-bold">{reports.length}</p>
        </button>
        {reportTypes.map((rt) => (
          <button
            key={rt.value}
            onClick={() => setFilterType(rt.value)}
            className={`rounded-xl border p-4 text-center hover:shadow-md transition ${
              filterType === rt.value ? "border-blue-300 bg-blue-50" : "bg-white"
            }`}
          >
            <p className="text-2xl mb-1">{rt.icon}</p>
            <p className="text-xs font-medium">{rt.label}</p>
            <p className="text-lg font-bold">
              {reports.filter((r) => r.report_type === rt.value).length}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Título</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Cliente</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Tipo</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Periodo</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  Cargando reportes...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-2">📈</p>
                  <p>No hay reportes{filterType !== "all" ? " de este tipo" : ""}</p>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/reportes/${report.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {report.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {report.clients?.business_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">
                    {reportTypes.find((rt) => rt.value === report.report_type)?.label || report.report_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {report.period_start && report.period_end
                      ? `${formatDate(report.period_start)} - ${formatDate(report.period_end)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[report.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(report.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
