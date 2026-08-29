"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDateTime, formatDate, getStatusColor } from "@/lib/utils"
import { convertLeadToClientAction } from "@/app/dashboard/leads/actions"

interface Lead {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  city: string | null
  industry: string | null
  source: string | null
  status: string
  score: number
  notes: string | null
  last_contact_at: string | null
  next_follow_up_at: string | null
  converted_client_id: string | null
  created_at: string
  updated_at: string
}

interface StatusChange {
  id: string
  lead_id: string
  old_status: string | null
  new_status: string
  changed_by: string | null
  notes: string | null
  changed_at: string
}

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  interested: "Interesado",
  proposal_sent: "Propuesta Enviada",
  negotiation: "En Negociación",
  won: "Ganado",
  lost: "Perdido",
}

const sourceLabels: Record<string, string> = {
  google_maps: "Google Maps",
  directory: "Directorio",
  website: "Web",
  referral: "Referido",
  cold_outreach: "Cold Outreach",
  social: "Redes Sociales",
}

const statusFlow: Record<string, string[]> = {
  new: ["contacted"],
  contacted: ["interested", "lost"],
  interested: ["proposal_sent", "lost"],
  proposal_sent: ["negotiation", "lost"],
  negotiation: ["won", "lost"],
  won: [],
  lost: ["new"],
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string
  const supabase = createClient()

  const [lead, setLead] = useState<Lead | null>(null)
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const [followUpDate, setFollowUpDate] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchLead()
    fetchStatusHistory()
  }, [leadId])

  async function fetchLead() {
    const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single()
    if (error) {
      setError(error.message)
    } else {
      setLead(data)
      setNotes(data.notes || "")
    }
    setLoading(false)
  }

  async function fetchStatusHistory() {
    const { data } = await supabase
      .from("lead_status_changes")
      .select("*")
      .eq("lead_id", leadId)
      .order("changed_at", { ascending: false })
    if (data) setStatusHistory(data)
  }

  async function changeStatus(newStatus: string) {
    if (!lead) return
    const oldStatus = lead.status

    setLead({ ...lead, status: newStatus })
    const [statusErr] = await Promise.all([
      supabase
        .from("leads")
        .update({ status: newStatus as "new" | "contacted" | "interested" | "proposal_sent" | "negotiation" | "won" | "lost", updated_at: new Date().toISOString() })
        .eq("id", leadId),
      supabase.from("lead_status_changes").insert({
        lead_id: leadId,
        old_status: oldStatus,
        new_status: newStatus,
      }),
    ])
    if (statusErr) {
      setError(statusErr.error?.message ?? "Error al cambiar estado")
      fetchLead()
    }
    fetchStatusHistory()
  }

  async function saveNotes() {
    const { error } = await supabase
      .from("leads")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", leadId)
    if (error) setError(error.message)
  }

  async function saveFollowUp() {
    if (!followUpDate) return
    const { error } = await supabase
      .from("leads")
      .update({ next_follow_up_at: followUpDate, updated_at: new Date().toISOString() })
      .eq("id", leadId)
    if (error) {
      setError(error.message)
    } else {
      setLead((prev) => (prev ? { ...prev, next_follow_up_at: followUpDate } : prev))
    }
  }

  async function convertToClient() {
    if (!lead) return
    setConverting(true)
    setError("")

    const result = await convertLeadToClientAction(lead.id)

    if (!result.ok || !result.clientId) {
      setError(result.error || "No se pudo convertir el lead a cliente.")
      setConverting(false)
      return
    }

    router.push(`/dashboard/clientes/${result.clientId}`)
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este lead? Esta acción no se puede deshacer.")) return
    const { error } = await supabase.from("leads").delete().eq("id", leadId)
    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard/leads")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead no encontrado</p>
        <Link href="/dashboard/leads" className="text-blue-600 hover:underline text-sm">
          ← Volver a leads
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/leads" className="text-sm text-gray-500 hover:text-gray-700">
            ← Volver a leads
          </Link>
          <h2 className="text-2xl font-bold mt-1">{lead.business_name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
              {statusLabels[lead.status]}
            </span>
            <span className="text-sm text-gray-500">
              Score: {lead.score}/100
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="text-red-600 text-sm hover:text-red-800"
        >
          Eliminar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Datos del Lead</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Contacto</p>
                <p className="font-medium">{lead.contact_name || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{lead.email || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Teléfono</p>
                <p className="font-medium">{lead.phone || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Web</p>
                <p className="font-medium">
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {lead.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Ciudad</p>
                <p className="font-medium">{lead.city || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Industria</p>
                <p className="font-medium">{lead.industry || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Fuente</p>
                <p className="font-medium">{sourceLabels[lead.source || ""] || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Creado</p>
                <p className="font-medium">{formatDateTime(lead.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Notas</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Añadir notas sobre este lead..."
            />
            <button
              onClick={saveNotes}
              className="mt-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
            >
              Guardar notas
            </button>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Historial de estados</h3>
            {statusHistory.length === 0 ? (
              <p className="text-sm text-gray-500">Sin cambios de estado registrados</p>
            ) : (
              <div className="space-y-3">
                {statusHistory.map((change) => (
                  <div key={change.id} className="flex items-center gap-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(change.old_status || "")}`}>
                      {statusLabels[change.old_status || ""]}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(change.new_status)}`}>
                      {statusLabels[change.new_status]}
                    </span>
                    <span className="text-gray-400 text-xs">{formatDateTime(change.changed_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Cambiar estado</h3>
            <div className="space-y-2">
              {(statusFlow[lead.status] || []).length === 0 ? (
                <p className="text-sm text-gray-500">
                  {lead.status === "won" ? "Lead ganado, sin más acciones" : "Lead perdido"}
                </p>
              ) : (
                statusFlow[lead.status].map((nextStatus) => (
                  <button
                    key={nextStatus}
                    onClick={() => changeStatus(nextStatus)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80 ${getStatusColor(nextStatus)}`}
                  >
                    Mover a: {statusLabels[nextStatus]}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Programar seguimiento</h3>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm mb-2"
            />
            <button
              onClick={saveFollowUp}
              disabled={!followUpDate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              Guardar seguimiento
            </button>
            {lead.next_follow_up_at && (
              <p className="text-xs text-gray-500 mt-2">
                Próximo seguimiento: {formatDateTime(lead.next_follow_up_at)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Convertir a cliente</h3>
            {lead.converted_client_id ? (
              <p className="text-sm text-gray-500">
                Ya convertido.{" "}
                <Link href={`/dashboard/clientes/${lead.converted_client_id}`} className="text-blue-600 hover:underline">
                  Ver cliente →
                </Link>
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  Convierte este lead en un cliente activo del sistema.
                </p>
                <button
                  onClick={convertToClient}
                  disabled={converting}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
                >
                  {converting ? "Convirtiendo..." : "Convertir a Cliente"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
