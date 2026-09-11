"use client"

import { useState } from "react"

type PrivacyRequest = {
  id: string
  full_name: string | null
  email: string
  request_type: string
  details: string | null
  status: string
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  acceso: "Acceso",
  rectificacion: "Rectificación",
  supresion: "Supresión",
  limitacion: "Limitación",
  portabilidad: "Portabilidad",
  oposicion: "Oposición",
  baja_marketing: "Baja marketing",
}

export default function PrivacyRequestsList({
  requests,
}: {
  requests: PrivacyRequest[]
}) {
  const [list, setList] = useState(requests)
  const [busy, setBusy] = useState<string | null>(null)

  const resolve = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/privacy/requests/${id}/resolve`, { method: "POST" })
      if (!res.ok) throw new Error()
      setList((l) => l.map((r) => (r.id === id ? { ...r, status: "resuelto" } : r)))
    } catch {
      alert("No se pudo resolver la solicitud.")
    } finally {
      setBusy(null)
    }
  }

  const pending = list.filter((r) => r.status === "pendiente")
  const resolved = list.filter((r) => r.status === "resuelto")

  const Card = ({ r }: { r: PrivacyRequest }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {TYPE_LABEL[r.request_type] || r.request_type}
          <span className="ml-2 text-xs text-gray-400">
            {new Date(r.created_at).toLocaleDateString("es-ES")}
          </span>
        </p>
        <p className="text-sm text-gray-600 break-all">{r.email}{r.full_name ? ` · ${r.full_name}` : ""}</p>
        {r.details && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{r.details}</p>}
        <p className="text-xs mt-2">
          {r.status === "resuelto" ? (
            <span className="text-green-600 font-medium">✓ Resuelta</span>
          ) : (
            <span className="text-amber-600 font-medium">Pendiente</span>
          )}
        </p>
      </div>
      {r.status === "pendiente" && (
        <button
          onClick={() => resolve(r.id)}
          disabled={busy === r.id}
          className="shrink-0 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
        >
          {busy === r.id ? "Procesando…" : "Resolver y borrar datos"}
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {pending.length === 0 && resolved.length === 0 && (
        <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-4">
          No hay solicitudes registradas.
        </p>
      )}
      {pending.map((r) => <Card key={r.id} r={r} />)}
      {resolved.slice(0, 10).map((r) => <Card key={r.id} r={r} />)}
    </div>
  )
}