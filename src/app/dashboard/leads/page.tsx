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
  social_media: Record<string, string> | null
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

type ConvertResult = {
  converted_count?: number
  failed_count?: number
  skipped_count?: number
  failed?: { leadId: string; reason: string }[]
  error?: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [convertedClients, setConvertedClients] = useState<
    { leadId: string; clientId: string }[]
  >([])

  const supabase = createClient()

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
      setLeads((data || []) as Lead[])
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredLeads = leads.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.business_name?.toLowerCase().includes(q) ||
      l.contact_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.industry?.toLowerCase().includes(q)
    )
  })

  const isConvertible = (l: Lead) =>
    Boolean(l.email) && l.status !== "won" && !l.converted_client_id

  const convertibleIds = filteredLeads.filter(isConvertible).map((l) => l.id)
  const allSelected =
    convertibleIds.length > 0 &&
    convertibleIds.every((id) => selected.has(id))

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        convertibleIds.forEach((id) => next.delete(id))
      } else {
        convertibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function toggleLead(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedCopy = filteredLeads
    .filter((l) => selected.has(l.id))
    .map((l) => ({ id: l.id, business_name: l.business_name }))

  async function handleBulkConvert() {
    const convertibles = selectedCopy.filter((l) =>
      isConvertible(leads.find((x) => x.id === l.id)!)
    )
    if (convertibles.length === 0) {
      alert("Ninguno de los leads seleccionados es convertible (un lead necesita email y no estar ya convertido).")
      return
    }

    const confirmed = window.confirm(
      `Vas a convertir ${convertibles.length} lead(s) en clientes reales con el plan "Plan Lanzamiento 49€/mes".\n\nCada conversión crea el cliente, provisiona su cuenta de portal, genera su factura inicial y envía los emails de alta (bienvenida, credenciales, contrato, herramientas).\n\n¿Continuar?`
    )
    if (!confirmed) return

    setConverting(true)
    setResult(null)
    try {
      const res = await fetch("/api/leads/convert-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: convertibles.map((c) => c.id) }),
      })
      const data: ConvertResult = await res.json().catch(() => null)
      if (!res.ok) {
        setResult({ failed_count: 1, failed: [{ leadId: "", reason: data?.error || `HTTP ${res.status}` }] })
      } else {
        setResult(data)
        setConvertedClients(
          (data as { converted?: { leadId: string; clientId: string }[] }).converted || []
        )
      }
      setSelected(new Set())
      await fetchLeads()
    } catch (e: unknown) {
      setResult({
        failed_count: 1,
        failed: [{ leadId: "", reason: e instanceof Error ? e.message : "Error de red" }],
      })
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads & Captación</h2>
          <p className="text-gray-500">Pipeline de ventas automatizado</p>
        </div>
        <div className="flex gap-2">
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

      {result && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            result.error || (result.failed_count ?? 0) > 0
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          <div className="font-medium mb-1">
            {result.converted_count
              ? `✅ ${result.converted_count} lead(s) convertidos en clientes`
              : result.failed_count
                ? "Conversión completada con avisos"
                : "No se convirtió ningún lead"}
          </div>
          {(result.converted_count ?? 0) > 0 && (
            <div className="mb-1 text-green-700">
              Servicio asignado: &quot;Plan Lanzamiento 49€/mes&quot; — ya puedes ver los clientes en{" "}
              <Link href="/dashboard/clientes" className="underline">
                Clientes
              </Link>
              .
            </div>
          )}
          {convertedClients.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-2">
              {convertedClients.map((c) => {
                const lead = leads.find((l) => l.id === c.leadId)
                return (
                  <Link
                    key={c.leadId}
                    href={`/dashboard/clientes/${c.clientId}`}
                    className="inline-flex px-2 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 text-xs"
                  >
                    {lead?.business_name || c.leadId.slice(0, 8)}
                  </Link>
                )
              })}
            </div>
          )}
          {result.skipped_count ? (
            <div className="text-xs">
              ⏭️ {result.skipped_count} omitido(s): ya convertidos, sin email o con email ya registrado
            </div>
          ) : null}
          {result.failed_count ? (
            <div className="text-xs mt-1">
              ⚠️ {result.failed_count} con incidencias:
              <ul className="list-disc ml-4 mt-1">
                {(result.failed || []).slice(0, 5).map((f, i) => (
                  <li key={i}>{f.reason}</li>
                ))}
                {(result.failed_count ?? 0) > 5 && <li>…y más</li>}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {selectedCopy.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedCopy.length} seleccionado(s)
          </span>
          <button
            onClick={handleBulkConvert}
            disabled={converting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
          >
            <span>🚀</span> {converting ? "Convirtiendo..." : "Convertir en clientes"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={converting}
            className="text-sm text-gray-500 hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
          <span className="text-xs text-blue-600 ml-auto">
            Solo se convierten leads con email. Se asigna el plan &quot;Plan Lanzamiento 49€/mes&quot; (factura + emails de alta).
          </span>
        </div>
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
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={convertibleIds.length === 0}
                    aria-label="Seleccionar todos los leads convertibles"
                    className="w-4 h-4 accent-blue-600"
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Negocio</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Contacto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Teléfono</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Redes</th>
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
                  <td colSpan={12} className="text-center py-12 text-gray-500">
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
                filteredLeads.map((lead) => {
                  const convertible = isConvertible(lead)
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          disabled={!convertible}
                          aria-label={`Seleccionar ${lead.business_name}`}
                          className="w-4 h-4 accent-blue-600 disabled:opacity-30"
                        />
                        {!convertible && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {!lead.email ? "sin email" : "ya convertido"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                          {lead.business_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">{lead.contact_name || "—"}</td>
                      <td className="px-4 py-3 text-sm">{lead.email || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className="text-blue-600 hover:underline">
                            {lead.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {lead.social_media && Object.keys(lead.social_media).length > 0 ? (
                          <span className="inline-flex flex-wrap gap-1">
                            {Object.entries(lead.social_media).slice(0, 3).map(([net, url]) => (
                              <a
                                key={net}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100"
                                title={url}
                              >
                                {net}
                              </a>
                            ))}
                            {Object.keys(lead.social_media).length > 3 && (
                              <span className="text-xs text-gray-400">+{Object.keys(lead.social_media).length - 3}</span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}