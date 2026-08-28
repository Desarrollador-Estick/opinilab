"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { generateContractNumber } from "@/lib/utils"

interface Client {
  id: string
  business_name: string
  contact_name: string
}

const defaultTemplate = `CONTRATO DE PRESTACIÓN DE SERVICIOS DE MARKETING DIGITAL

Entre las partes:

PRESTADOR: Agencia Marketing (CIF: B00000000), con domicilio en Calle Ejemplo 123, 28001 Madrid.

CLIENTE: {{CLIENT_NAME}}, con domicilio conocido en su domicilio habitual.

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios de marketing digital por parte del Prestador para el Cliente, según las condiciones detalladas en el presente documento.

2. DURACIÓN
El contrato tendrá una duración desde el {{START_DATE}} hasta el {{END_DATE}}, renovable por periodos iguales salvo notificación en contrario con 30 días de antelación.

3. SERVICIOS
Los servicios incluidos serán los acordados por ambas partes y detallados en el anexo correspondiente.

4. PRECIO Y FORMA DE PAGO
El precio total del contrato asciende a {{VALUE}} euros (IVA incluido), pagadero según la frecuencia acordada.

5. CONFIDENCIALIDAD
Ambas partes se comprometen a mantener la confidencialidad de toda la información compartida durante la vigencia del contrato y durante un periodo de 2 años tras su finalización.

6. TERMINACIÓN
Cualquiera de las partes podrá dar por terminado el contrato con un preaviso de 30 días por escrito.

Firmado en Madrid, a día de {{SIGN_DATE}}.

_________________________________
Por el Prestador

_________________________________
Por el Cliente`

export default function NuevoContratoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [value, setValue] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, business_name, contact_name")
      .order("business_name")
    if (data) setClients(data)
  }

  function fillTemplate() {
    const client = clients.find((c) => c.id === clientId)
    const template = defaultTemplate
      .replace("{{CLIENT_NAME}}", client?.business_name || "___________")
      .replace("{{START_DATE}}", startDate ? new Date(startDate).toLocaleDateString("es-ES") : "___________")
      .replace("{{END_DATE}}", endDate ? new Date(endDate).toLocaleDateString("es-ES") : "___________")
      .replace("{{VALUE}}", value ? Number(value).toLocaleString("es-ES") : "___________")
      .replace("{{SIGN_DATE}}", new Date().toLocaleDateString("es-ES"))
    setContent(template)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      setError("Selecciona un cliente")
      return
    }
    if (!title.trim()) {
      setError("El título es obligatorio")
      return
    }
    if (!value || Number(value) <= 0) {
      setError("El valor debe ser mayor que 0")
      return
    }
    if (!startDate) {
      setError("La fecha de inicio es obligatoria")
      return
    }

    setLoading(true)
    setError(null)

    const { count } = await supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })

    const contractNumber = generateContractNumber(new Date().getFullYear(), (count || 0) + 1)

    const { error: insertError } = await supabase.from("contracts").insert({
      client_id: clientId,
      contract_number: contractNumber,
      title: title.trim(),
      content: content.trim() || null,
      status: "draft",
      value: Number(value),
      start_date: startDate,
      end_date: endDate || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push("/dashboard/contratos")
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nuevo Contrato</h2>
          <p className="text-gray-500">Crea un contrato para un cliente</p>
        </div>
        <Link href="/dashboard/contratos" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Datos del contrato</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Contrato de gestión de redes sociales"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (€)</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="6000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Contenido del contrato</h3>
            <button
              type="button"
              onClick={fillTemplate}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
            >
              Cargar plantilla
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full border rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Escribe o pega el contenido del contrato..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/contratos" className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Contrato"}
          </button>
        </div>
      </form>
    </div>
  )
}
