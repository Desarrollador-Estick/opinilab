"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/types/database"
import { formatDateTime, getStatusColor } from "@/lib/utils"
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
  social_media: Json | null
  last_contact_at: string | null
  next_follow_up_at: string | null
  converted_client_id: string | null
  created_at: string
  updated_at: string
}

interface EmailSend {
  id: string
  template: string | null
  subject: string | null
  to: string | null
  status: string | null
  created_at: string
  resend_id: string | null
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

interface EmailReply {
  id: string
  email_from: string
  subject: string | null
  text_body: string | null
  reply_type: string | null
  reply_status: string | null
  ai_reply: string | null
  reason: string | null
  created_at: string
}

const replyTypeLabels: Record<string, string> = {
  yes: "Sí, quiere contratar",
  no: "No interesado",
  question: "Pregunta",
  objection: "Objeción",
  unsubscribe: "Pide baja",
  unresolved: "Sin clasificar",
}

const replyStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  draft: "Borrador sin enviar",
  auto_sent: "Respondido (IA)",
  sent_manual: "Enviado",
  skipped: "Sin respuesta",
  error: "Error de envío",
  unresolved: "Sin clasificar",
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
  auto_scraped: "Scraper automático",
}

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "auto_scraped", label: "Scraper automático" },
  { value: "google_maps", label: "Google Maps" },
  { value: "directory", label: "Directorio" },
  { value: "website", label: "Web" },
  { value: "referral", label: "Referido" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "social", label: "Redes Sociales" },
]

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
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendHistory, setSendHistory] = useState<EmailSend[]>([])
  const [form, setForm] = useState<Partial<Lead>>({})
  const [replies, setReplies] = useState<EmailReply[]>([])
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null)

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

  async function fetchReplies() {
    const { data } = await supabase
      .from("email_replies")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
    if (data) setReplies(data)
  }

  async function fetchSends() {
    const { data } = await supabase
      .from("email_sends")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
    if (data) setSendHistory(data)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLead()
    fetchStatusHistory()
    fetchReplies()
    fetchSends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

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

  function startEdit() {
    if (!lead) return
    setForm({
      contact_name: lead.contact_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      website: lead.website || "",
      city: lead.city || "",
      industry: lead.industry || "",
      source: lead.source || "auto_scraped",
      score: lead.score,
    })
    setEditMode(true)
  }

  function updateForm(field: keyof Lead, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value } as Partial<Lead>))
  }

  async function saveLeadEdit() {
    if (!lead || !form) return
    setSaving(true)
    setError("")
    const { error } = await supabase
      .from("leads")
      .update({
        contact_name: form.contact_name ?? null,
        email: form.email ?? null,
        phone: form.phone ?? null,
        website: form.website ?? null,
        city: form.city ?? null,
        industry: form.industry ?? null,
        source: form.source as
          | "google_maps"
          | "directory"
          | "website"
          | "referral"
          | "cold_outreach"
          | "social"
          | "auto_scraped"
          | null,
        score: form.score ?? lead.score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
    if (error) {
      setError(error.message)
    } else {
      setLead((prev) => (prev ? { ...prev, ...form } : prev))
      setEditMode(false)
    }
    setSaving(false)
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

  async function sendAgentReply(replyId: string) {
    setSendingReplyId(replyId)
    setError("")
    const res = await fetch(`/api/leads/${leadId}/replies/${replyId}/send`, {
      method: "POST",
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      setError(json?.error || "No se pudo enviar la respuesta.")
    } else {
      const { data } = await supabase
        .from("email_replies")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
      if (data) setReplies(data)
    }
    setSendingReplyId(null)
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Datos del Lead</h3>
              {!editMode ? (
                <button
                  onClick={startEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                >
                  Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveLeadEdit}
                    disabled={saving}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              )}
            </div>
            {!editMode ? (
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
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-500 mb-1">Contacto</label>
                  <input
                    value={form.contact_name || ""}
                    onChange={(e) => updateForm("contact_name", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Teléfono</label>
                  <input
                    value={form.phone || ""}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Web</label>
                  <input
                    value={form.website || ""}
                    onChange={(e) => updateForm("website", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Ciudad</label>
                  <input
                    value={form.city || ""}
                    onChange={(e) => updateForm("city", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Industria</label>
                  <input
                    value={form.industry || ""}
                    onChange={(e) => updateForm("industry", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Fuente</label>
                  <select
                    value={form.source || "auto_scraped"}
                    onChange={(e) => updateForm("source", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.score ?? 0}
                    onChange={(e) => updateForm("score", parseInt(e.target.value, 10) || 0)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
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

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-1">Conversación (agente IA)</h3>
            <p className="text-xs text-gray-500 mb-4">
              Respuestas del lead recibidas por email (Resend Inbound). El agente las
              clasifica y responde con tu visto bueno.
            </p>
            {replies.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay respuestas de este lead.</p>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div key={reply.id} className="border border-gray-100 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          reply.reply_type === "yes"
                            ? "bg-green-100 text-green-700"
                            : reply.reply_type === "no" || reply.reply_type === "unsubscribe"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-purple-100 text-purple-700"
                        }`}>
                          {replyTypeLabels[reply.reply_type || ""] || reply.reply_type || "—"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          reply.reply_status === "auto_sent" || reply.reply_status === "sent_manual"
                            ? "bg-blue-50 text-blue-700"
                            : reply.reply_status === "draft"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-50 text-gray-500"
                        }`}>
                          {replyStatusLabels[reply.reply_status || ""] || reply.reply_status || "—"}
                        </span>
                        <span className="text-xs text-gray-400">{formatDateTime(reply.created_at)}</span>
                      </div>
                      <span className="text-xs text-gray-500 truncate max-w-[220px]">{reply.email_from}</span>
                    </div>
                    {reply.text_body && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{reply.text_body}</p>
                    )}
                    {reply.reason && (
                      <p className="text-xs text-gray-400 italic">{reply.reason}</p>
                    )}
                    {reply.ai_reply && (
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                        <p className="text-xs font-medium text-purple-500 mb-1">Respuesta preparada por el agente:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.ai_reply}</p>
                      </div>
                    )}
                    {reply.ai_reply && reply.reply_status !== "auto_sent" && reply.reply_status !== "sent_manual" && (
                      <button
                        onClick={() => sendAgentReply(reply.id)}
                        disabled={sendingReplyId === reply.id}
                        className="mt-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50"
                      >
                        {sendingReplyId === reply.id ? "Enviando..." : "Aprobar y enviar respuesta"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-1">Historial de envíos</h3>
            <p className="text-xs text-gray-500 mb-4">
              Emails enviados desde OpiniLab a este lead (outbound_1, followups, promos...).
            </p>
            {sendHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No hay envíos registrados para este lead.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 pr-4 font-medium">Plantilla</th>
                      <th className="pb-2 pr-4 font-medium">Asunto</th>
                      <th className="pb-2 pr-4 font-medium">Estado</th>
                      <th className="pb-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendHistory.map((s) => (
                      <tr key={s.id} className="border-b border-gray-50">
                        <td className="py-2 pr-4 font-mono text-xs">{s.template || "—"}</td>
                        <td className="py-2 pr-4 text-gray-700">{s.subject || "—"}</td>
                        <td className="py-2 pr-4 text-gray-500">{s.status || "—"}</td>
                        <td className="py-2 whitespace-nowrap text-gray-500">{formatDateTime(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
