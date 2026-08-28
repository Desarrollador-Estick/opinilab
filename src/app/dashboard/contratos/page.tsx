"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils"

interface Client {
  id: string
  business_name: string
}

interface Contract {
  id: string
  contract_number: string
  title: string
  client_id: string
  client?: Client
  status: string
  value: number
  start_date: string
  end_date: string | null
  signed_at: string | null
  created_at: string
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviado",
  signed: "Firmado",
  expired: "Expirado",
  terminated: "Terminado",
}

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchContracts()
  }, [])

  async function fetchContracts() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("contracts")
      .select("*, client:clients(id, business_name)")
      .order("created_at", { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setContracts(data || [])
    }
    setLoading(false)
  }

  const filtered = contracts.filter((c) => filterStatus === "all" || c.status === filterStatus)
  const activeContracts = contracts.filter((c) => c.status === "signed")
  const totalValue = activeContracts.reduce((sum, c) => sum + c.value, 0)
  const pendingCount = contracts.filter((c) => c.status === "sent").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contratos</h2>
          <p className="text-gray-500">Gestiona contratos y acuerdos</p>
        </div>
        <Link
          href="/dashboard/contratos/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>📋</span> Nuevo Contrato
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Contratos activos</p>
          <p className="text-2xl font-bold text-green-600">{activeContracts.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Valor total activo</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Pendientes de firmar</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
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
          <option value="sent">Enviados</option>
          <option value="signed">Firmados</option>
          <option value="expired">Expirados</option>
          <option value="terminated">Terminados</option>
        </select>
        <span className="flex items-center text-sm text-gray-500">
          {filtered.length} contrato{filtered.length !== 1 ? "s" : ""}
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
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Nº Contrato</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Título</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Valor</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Inicio</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fin</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-2">📋</p>
                    <p>{filterStatus !== "all" ? "No hay contratos con este estado" : "No hay contratos todavía"}</p>
                    {filterStatus === "all" && (
                      <Link href="/dashboard/contratos/nuevo" className="text-blue-600 hover:underline text-sm">
                        Crear primer contrato →
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{contract.contract_number}</td>
                    <td className="px-4 py-3 text-sm font-medium">{contract.title}</td>
                    <td className="px-4 py-3 text-sm">{contract.client?.business_name || "—"}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(contract.value)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(contract.start_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {contract.end_date ? formatDate(contract.end_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {statusLabels[contract.status] || contract.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/contratos/${contract.id}`} className="text-blue-600 hover:underline text-sm">
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
