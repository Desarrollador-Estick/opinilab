"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils"
import { Database } from "@/types/database"

interface Client {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  nif_cif: string | null
}

interface Contract {
  id: string
  contract_number: string
  title: string
  content: string | null
  client_id: string
  client?: Client
  status: string
  value: number
  start_date: string
  end_date: string | null
  signed_at: string | null
  pdf_url: string | null
  created_at: string
  updated_at: string
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviado",
  signed: "Firmado",
  expired: "Expirado",
  terminated: "Terminado",
}

const statusFlow: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["signed", "expired"],
  signed: ["terminated"],
  expired: [],
  terminated: [],
}

export default function ContratoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string
  const supabase = createClient()

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchContract() {
    setLoading(true)
    const { data, error } = await supabase
      .from("contracts")
      .select("*, client:clients(*)")
      .eq("id", contractId)
      .single()

    if (error) {
      setError(error.message)
    } else {
      setContract(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContract()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId])

  async function changeStatus(newStatus: string) {
    if (!contract) return
    const updates: Database["public"]["Tables"]["contracts"]["Update"] = {
      status: newStatus as Database["public"]["Tables"]["contracts"]["Update"]["status"],
      updated_at: new Date().toISOString(),
    }
    if (newStatus === "signed") updates.signed_at = new Date().toISOString()

    const { error } = await supabase.from("contracts").update(updates).eq("id", contractId)
    if (error) {
      setError(error.message)
    } else {
      fetchContract()
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este contrato? Esta acción no se puede deshacer.")) return
    const { error } = await supabase.from("contracts").delete().eq("id", contractId)
    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard/contratos")
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Contrato no encontrado</p>
        <Link href="/dashboard/contratos" className="text-blue-600 hover:underline text-sm">← Volver</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <Link href="/dashboard/contratos" className="text-sm text-gray-500 hover:text-gray-700">
            ← Volver a contratos
          </Link>
          <h2 className="text-2xl font-bold mt-1">{contract.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-sm text-gray-500">{contract.contract_number}</span>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
              {statusLabels[contract.status]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
            🖨️ Imprimir
          </button>
          <button onClick={handleDelete} className="text-red-600 text-sm hover:text-red-800">
            Eliminar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 no-print">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border p-6 print:border-0 print:rounded-none">
            <div className="flex justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-blue-600">🚀 Agencia Marketing</h3>
                <p className="text-sm text-gray-500 mt-1">CIF: B00000000</p>
                <p className="text-sm text-gray-500">Calle Ejemplo 123, 28001 Madrid</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{contract.contract_number}</p>
                <p className="text-sm text-gray-500 mt-1">Fecha: {formatDate(contract.created_at)}</p>
                {contract.signed_at && (
                  <p className="text-sm text-green-600 mt-1">Firmado: {formatDateTime(contract.signed_at)}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 uppercase mb-1">Cliente</p>
              <p className="font-semibold">{contract.client?.business_name}</p>
              <p className="text-sm text-gray-600">{contract.client?.contact_name}</p>
              {contract.client?.email && <p className="text-sm text-gray-600">{contract.client.email}</p>}
              {contract.client?.nif_cif && <p className="text-sm text-gray-600">CIF/NIF: {contract.client.nif_cif}</p>}
            </div>

            {contract.content ? (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {contract.content}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Sin contenido definido</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 no-print">
            <h3 className="font-semibold mb-4">Datos del contrato</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Valor</p>
                <p className="font-bold text-lg">{formatCurrency(contract.value)}</p>
              </div>
              <div>
                <p className="text-gray-500">Fecha de inicio</p>
                <p className="font-medium">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <p className="text-gray-500">Fecha de fin</p>
                <p className="font-medium">{contract.end_date ? formatDate(contract.end_date) : "Indefinido"}</p>
              </div>
              <div>
                <p className="text-gray-500">Creado</p>
                <p className="font-medium">{formatDateTime(contract.created_at)}</p>
              </div>
              {contract.signed_at && (
                <div>
                  <p className="text-gray-500">Firmado</p>
                  <p className="font-medium text-green-600">{formatDateTime(contract.signed_at)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 no-print">
            <h3 className="font-semibold mb-4">Cambiar estado</h3>
            <div className="space-y-2">
              {(statusFlow[contract.status] || []).length === 0 ? (
                <p className="text-sm text-gray-500">Estado final, sin más acciones</p>
              ) : (
                statusFlow[contract.status].map((nextStatus) => (
                  <button
                    key={nextStatus}
                    onClick={() => changeStatus(nextStatus)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80 ${getStatusColor(nextStatus)}`}
                  >
                    {nextStatus === "signed" ? "Marcar como firmado" : nextStatus === "sent" ? "Marcar como enviado" : `Marcar como ${statusLabels[nextStatus]}`}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 no-print">
            <h3 className="font-semibold mb-4">Exportar</h3>
            <button
              onClick={handlePrint}
              className="w-full px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
            >
              Imprimir / Guardar como PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
