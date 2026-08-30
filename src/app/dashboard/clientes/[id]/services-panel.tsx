"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getStatusColor } from "@/lib/utils"
import {
  addClientServiceAction,
  removeClientServiceAction,
  toggleClientServiceStatusAction,
} from "../actions"

export type ClientServiceItem = {
  id: string
  client_id: string
  service_id: string
  custom_price: number | null
  status: "active" | "paused" | "cancelled"
  services: {
    name: string
    category: string | null
    base_price: number | null
  } | null
}

export type CatalogService = {
  id: string
  name: string
  category: string | null
  base_price: number
  billing_cycle: string | null
}

const categoryActionLabel: Record<string, string> = {
  reviews: "Responder reseñas",
  seo: "Informe SEO/GBP",
  email: "Email de seguimiento",
  social_media: "Post para redes",
  ads: "Propuesta de anuncios",
  branding: "Propuesta de marca",
  web: "Propuesta web",
}

export function ServicesPanel({
  clientId,
  services,
  catalog,
}: {
  clientId: string
  services: ClientServiceItem[]
  catalog: CatalogService[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [selectedService, setSelectedService] = useState("")
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState("")
  const [aiOpen, setAiOpen] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiContent, setAiContent] = useState("")

  const assignedIds = new Set(services.map((s) => s.service_id))
  const available = catalog.filter(
    (s) => !assignedIds.has(s.id) && s.category
  )

  async function handleAdd() {
    if (!selectedService) return
    setBusy({ add: true })
    setMessage("")
    const result = await addClientServiceAction(clientId, selectedService)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setSelectedService("")
      setAdding(false)
      router.refresh()
    }
    setBusy({})
  }

  async function handleRemove(cs: ClientServiceItem) {
    if (!confirm(`¿Quitar el servicio "${cs.services?.name}" de este cliente?`)) return
    setMessage("")
    const result = await removeClientServiceAction(cs.id)
    if (result?.error) setMessage(result.error)
    else router.refresh()
  }

  async function handleToggle(cs: ClientServiceItem) {
    setMessage("")
    const next = cs.status === "active" ? "paused" : "active"
    const result = await toggleClientServiceStatusAction(cs.id, next)
    if (result?.error) setMessage(result.error)
    else router.refresh()
  }

  async function runAi(cs: ClientServiceItem) {
    const category = cs.services?.category
    if (!category) return
    setAiOpen(cs.id)
    setAiLoading(true)
    setAiError("")
    setAiContent("")
    try {
      const res = await fetch("/api/services/run-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, category }),
      })
      const data = await res.json()
      if (!data.success) {
        setAiError(data.error || "Error al ejecutar la IA")
      } else {
        setAiContent(data.content || "")
      }
    } catch {
      setAiError("Error de conexión al ejecutar la IA")
    }
    setAiLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Servicios</h3>
        {available.length > 0 && (
          <button
            onClick={() => {
              setAdding(!adding)
              setSelectedService("")
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            + Añadir servicio
          </button>
        )}
      </div>

      {message && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-3">
          {message}
        </div>
      )}

      {adding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <p className="text-xs font-medium text-gray-700">
            Elegir servicio del catálogo para este cliente:
          </p>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
            >
              <option value="">Selecciona un servicio...</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selectedService || !!busy.add}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {busy.add ? "Añadiendo..." : "Añadir"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-sm">
          Sin servicios asignados
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((cs) => (
            <div
              key={cs.id}
              className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{cs.services?.name}</p>
                <p className="text-xs text-gray-500">{cs.services?.category}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cs.status)}`}
                >
                  {cs.status}
                </span>
                <button
                  onClick={() => runAi(cs)}
                  disabled={cs.status !== "active" || !!aiLoading}
                  title={categoryActionLabel[cs.services?.category ?? ""] ?? "Ejecutar con IA"}
                  className="px-2 py-1 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiOpen === cs.id && aiLoading ? "..." : "⚡ IA"}
                </button>
                <button
                  onClick={() => handleToggle(cs)}
                  className="px-2 py-1 rounded-md border text-xs hover:bg-white"
                >
                  {cs.status === "active" ? "Pausar" : "Activar"}
                </button>
                <button
                  onClick={() => handleRemove(cs)}
                  className="px-2 py-1 rounded-md border text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aiOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">
                ⚡ Resultado con IA
              </h4>
              <button
                onClick={() => setAiOpen(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {aiLoading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Generando con IA...</p>
                <p className="text-xs mt-1">suele tardar unos segundos</p>
              </div>
            ) : aiError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {aiError}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                {aiContent}
              </pre>
            )}

            {!aiLoading && (
              <div className="flex justify-end">
                <button
                  onClick={() => setAiOpen(null)}
                  className="px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
