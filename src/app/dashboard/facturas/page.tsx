"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils"

interface Client {
  id: string
  business_name: string
}

interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  client?: Client
  status: string
  subtotal: number
  tax_amount: number
  total: number
  issue_date: string
  due_date: string | null
  paid_at: string | null
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Cancelada",
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningMonthly, setRunningMonthly] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)
  const supabase = createClient()

  async function fetchInvoices() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("invoices")
      .select("*, client:clients(id, business_name)")
      .order("created_at", { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setInvoices(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runMonthlyBilling() {
    setRunningMonthly(true)
    setRunResult(null)
    try {
      const res = await fetch("/api/invoices/run-monthly", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        const paid = data.results.filter((r: any) => r.outcome === "created_paid").length
        const unpaid = data.results.filter((r: any) => r.outcome === "created_unpaid").length
        const skipped = data.results.filter((r: any) => r.outcome === "already_invoiced").length
        setRunResult(
          `✅ Proceso completado (${data.period}): ${paid} cobrada(s), ${unpaid} sin pagar, ${skipped} ya facturada(s).`
        )
        fetchInvoices()
      } else {
        setRunResult(`❌ ${data.error || "Error al generar las facturas"}`)
      }
    } catch (e) {
      setRunResult(`❌ ${e instanceof Error ? e.message : "Error de conexión"}`)
    } finally {
      setRunningMonthly(false)
    }
  }

  const filtered = invoices.filter((i) => filterStatus === "all" || i.status === filterStatus)
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0)
  const totalPending = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0)
  const overdueCount = invoices.filter((i) => i.status === "overdue").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Facturación</h2>
          <p className="text-gray-500">Gestiona facturas y cobros</p>
        </div>
        <div className="flex items-center gap-3">
          {runResult && (
            <span className="text-sm text-gray-700 bg-gray-100 border rounded-lg px-3 py-2">
              {runResult}
            </span>
          )}
          <button
            onClick={runMonthlyBilling}
            disabled={runningMonthly}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <span>🔄</span> {runningMonthly ? "Generando..." : "Generar facturas del mes"}
          </button>
          <Link
            href="/dashboard/facturas/nueva"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span>📄</span> Nueva Factura
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total cobrado</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Pendiente de cobro</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Facturas vencidas</p>
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="draft">Borradores</option>
          <option value="sent">Enviadas</option>
          <option value="paid">Pagadas</option>
          <option value="overdue">Vencidas</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <span className="flex items-center text-sm text-gray-500">
          {filtered.length} factura{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Nº Factura</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Base</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">IVA</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Emisión</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Vencimiento</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-2">💰</p>
                    <p>{filterStatus !== "all" ? "No hay facturas con este estado" : "No hay facturas todavía"}</p>
                    {filterStatus === "all" && (
                      <Link href="/dashboard/facturas/nueva" className="text-blue-600 hover:underline text-sm">
                        Crear primera factura →
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-sm">{invoice.client?.business_name || "—"}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(invoice.subtotal)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(invoice.tax_amount)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(invoice.total)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.issue_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {statusLabels[invoice.status] || invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/facturas/${invoice.id}`} className="text-blue-600 hover:underline text-sm">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
