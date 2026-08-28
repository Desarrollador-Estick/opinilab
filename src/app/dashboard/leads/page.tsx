"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getStatusColor } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

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

const statuses = ["new", "contacted", "interested", "proposal_sent", "negotiation", "won", "lost"]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [view, setView] = useState<"table" | "kanban">("kanban")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setLeads(data || [])
    }
    setLoading(false)
  }

  async function moveLead(leadId: string, newStatus: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)))
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus as "new" | "contacted" | "interested" | "proposal_sent" | "negotiation" | "won" | "lost", updated_at: new Date().toISOString() })
      .eq("id", leadId)
    if (error) {
      setError(error.message)
      fetchLeads()
    }
  }

  const filteredLeads = leads.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.business_name?.toLowerCase().includes(q) ||
      l.contact_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.industry?.toLowerCase().includes(q)
    )
  })

  function KanbanCard({ lead }: { lead: Lead }) {
    const [dragging, setDragging] = useState(false)

    return (
      <Link href={`/dashboard/leads/${lead.id}`}>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("leadId", lead.id)
            setDragging(true)
          }}
          onDragEnd={() => setDragging(false)}
          className={`bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing ${dragging ? "opacity-50" : ""}`}
        >
          <p className="font-medium text-sm hover:text-blue-600">{lead.business_name}</p>
          <p className="text-xs text-gray-500 mt-1">{lead.contact_name || "Sin contacto"}</p>
          {lead.city && <p className="text-xs text-gray-400 mt-0.5">{lead.city}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{sourceLabels[lead.source || ""] || "—"}</span>
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${lead.score >= 70 ? "bg-green-500" : lead.score >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${lead.score}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{lead.score}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads & Captación</h2>
          <p className="text-gray-500">Pipeline de ventas automatizado</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "table" ? "kanban" : "table")}
            className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            {view === "table" ? "📊 Kanban" : "📋 Tabla"}
          </button>
          <Link
            href="/dashboard/leads/nuevo"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span>➕</span> Nuevo Lead
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex gap-4">
        <input
          type="text"
          placeholder="Buscar por nombre, contacto, email, ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status) => {
            const columnLeads = filteredLeads.filter((l) => l.status === status)
            return (
              <div
                key={status}
                className="min-w-[280px] flex-shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const leadId = e.dataTransfer.getData("leadId")
                  if (leadId) moveLead(leadId, status)
                }}
              >
                <div className="bg-gray-100 rounded-t-lg px-4 py-2 flex items-center justify-between">
                  <span className="font-medium text-sm">{statusLabels[status]}</span>
                  <span className="bg-gray-300 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                  {columnLeads.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Arrastra leads aquí</p>
                  ) : (
                    columnLeads.map((lead) => <KanbanCard key={lead.id} lead={lead} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Negocio</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Contacto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Teléfono</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Ciudad</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Industria</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fuente</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Score</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Seguimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-2">🎯</p>
                    <p>{search ? "No se encontraron leads" : "No hay leads todavía"}</p>
                    {!search && (
                      <Link href="/dashboard/leads/nuevo" className="text-blue-600 hover:underline text-sm">
                        Crear primer lead →
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                        {lead.business_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{lead.contact_name || "—"}</td>
                    <td className="px-4 py-3 text-sm">{lead.email || "—"}</td>
                    <td className="px-4 py-3 text-sm">{lead.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm">{lead.city || "—"}</td>
                    <td className="px-4 py-3 text-sm">{lead.industry || "—"}</td>
                    <td className="px-4 py-3 text-sm">{sourceLabels[lead.source || ""] || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${lead.score >= 70 ? "bg-green-500" : lead.score >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-xs">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {statusLabels[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString("es-ES") : "—"}
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
