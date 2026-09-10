"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Database } from "@/types/database"
import { buildWhatsAppLink, buildPromoMessage } from "@/lib/whatsapp/wa-link"

type Recipient = Database["public"]["Tables"]["promo_recipients"]["Row"]
type Status = Recipient["status"]
type WhatsAppStatus = Recipient["whatsapp_status"]

interface ApiResult {
  ok?: boolean
  error?: string
  created?: { email: string; name: string | null; business_name: string | null }[]
  skipped?: { email: string; reason: string }[]
  sent?: number
  failed?: number
  failed_details?: { email: string; reason: string }[]
  recipients?: Recipient[]
}

const statusLabels: Record<Status, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-amber-100 text-amber-800" },
  sent: { label: "Enviado", classes: "bg-green-100 text-green-800" },
  failed: { label: "Error", classes: "bg-red-100 text-red-800" },
  skipped: { label: "Dado de baja", classes: "bg-gray-200 text-gray-700" },
}

const waStatusLabels: Record<WhatsAppStatus, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-amber-100 text-amber-800" },
  sent: { label: "Enviado", classes: "bg-green-100 text-green-800" },
  failed: { label: "Error", classes: "bg-red-100 text-red-800" },
  skipped: { label: "Sin teléfono", classes: "bg-gray-200 text-gray-700" },
}

const filters: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "sent", label: "Enviados" },
  { value: "failed", label: "Errores" },
  { value: "skipped", label: "Dados de baja" },
]

function parseBulkLine(line: string): { name?: string; email: string; phone?: string } {
  const trimmed = line.trim()

  // Format: Name <email> [+34600000000]
  const angle = trimmed.match(/^(.*?)\s*<([^<>]+@[^<>]+)>\s*(.*)?$/)
  if (angle) {
    const phone = angle[3]?.match(/\+?[\d\s\-()]{7,}/)?.[0]?.trim()
    return {
      name: angle[1].trim() || undefined,
      email: angle[2].trim(),
      phone: phone || undefined,
    }
  }

  // Format: Name, email, phone  OR  Name, email
  const comma = trimmed.replace(/^"+|"+$/g, "").split(",")
  if (comma.length >= 2 && comma[1]?.trim().includes("@")) {
    const phone = comma[2]?.trim()?.match(/\+?[\d\s\-()]{7,}/)?.[0]?.trim()
    return {
      name: comma[0].trim() || undefined,
      email: comma[1].trim(),
      phone: phone || undefined,
    }
  }

  // Format: Name  email  phone (double-space separated)
  const doubleSpace = trimmed.replace(/^"+|"+$/g, "").split(/\s{2,}/)
  if (doubleSpace.length >= 2 && doubleSpace[1]?.includes("@")) {
    const phone = doubleSpace[2]?.match(/\+?[\d\s\-()]{7,}/)?.[0]?.trim()
    return {
      name: doubleSpace[0].trim() || undefined,
      email: doubleSpace[1].trim(),
      phone: phone || undefined,
    }
  }

  return { email: trimmed.replace(/^<|>$/g, "") }
}

export default function PromosPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | "all">("all")
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)

  const [form, setForm] = useState({ name: "", email: "", phone: "", business_name: "", notes: "" })
  const [adding, setAdding] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [addingBulk, setAddingBulk] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingWa, setSendingWa] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/promos")
      const data: ApiResult = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cargar la lista")
      setRecipients(data.recipients || [])
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al cargar la lista" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 8000)
    return () => clearTimeout(t)
  }, [message])

  useEffect(() => {
    fetch("/api/promos/whatsapp-status")
      .then((r) => r.json())
      .then((d) => setWhatsappConfigured(d.configured ?? false))
      .catch(() => setWhatsappConfigured(false))
  }, [])

  const pendingCount = useMemo(
    () => recipients.filter((r) => r.status === "pending").length,
    [recipients]
  )

  const pendingWaCount = useMemo(
    () => recipients.filter((r) => r.whatsapp_status === "pending" && r.phone).length,
    [recipients]
  )

  const visible = useMemo(
    () => (filter === "all" ? recipients : recipients.filter((r) => r.status === filter)),
    [recipients, filter]
  )

  function showSuccess(text: string) {
    setMessage({ type: "success", text })
  }

  function showError(text: string) {
    setMessage({ type: "error", text })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) {
      showError("El email es obligatorio")
      return
    }
    setAdding(true)
    setMessage(null)
    try {
      const res = await fetch("/api/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          business_name: form.business_name.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
      const data: ApiResult = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al añadir")
      const skipped = (data.skipped || []).find((s) => s.email.toLowerCase() === form.email.trim().toLowerCase())
      if (skipped) {
        showError(`No añadido: ${skipped.reason}`)
      } else {
        showSuccess(`Contacto añadido: ${form.email}`)
        setForm({ name: "", email: "", phone: "", business_name: "", notes: "" })
      }
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al añadir contacto")
    } finally {
      setAdding(false)
    }
  }

  async function handleAddBulk() {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    setAddingBulk(true)
    setMessage(null)
    try {
      const payload = lines.map((line) => {
        const parsed = parseBulkLine(line)
        return { name: parsed.name || null, email: parsed.email, phone: parsed.phone || null }
      })
      const res = await fetch("/api/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: payload }),
      })
      const data: ApiResult = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al añadir")
      const added = data.created?.length ?? 0
      const skipped = data.skipped?.length ?? 0
      showSuccess(`${added} añadido(s), ${skipped} omitido(s)`)
      setBulkText("")
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al añadir varios")
    } finally {
      setAddingBulk(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar este contacto de la lista?")) return
    setDeletingId(id)
    setMessage(null)
    try {
      const res = await fetch(`/api/promos/${id}`, { method: "DELETE" })
      const data: ApiResult = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al eliminar")
      showSuccess("Contacto eliminado")
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSend() {
    if (pendingCount === 0) {
      showError("No hay contactos pendientes de envío por email")
      return
    }
    if (!window.confirm(`¿Enviar el email de promoción a ${pendingCount} contacto(s)?`)) return
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch("/api/promos/send", { method: "POST" })
      const data: ApiResult = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al enviar")
      showSuccess(
        data.sent
          ? `Email enviado a ${data.sent}.${data.failed ? ` Fallidos: ${data.failed}` : ""}`
          : `No se envió ninguno. Fallidos: ${data.failed}`
      )
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al enviar email")
    } finally {
      setSending(false)
    }
  }

  async function handleSendWhatsApp() {
    if (pendingWaCount === 0) {
      showError("No hay contactos con teléfono pendientes de envío por WhatsApp")
      return
    }
    if (!window.confirm(`¿Enviar WhatsApp de promoción a ${pendingWaCount} contacto(s)?`)) return
    setSendingWa(true)
    setMessage(null)
    try {
      const res = await fetch("/api/promos/whatsapp-send", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al enviar WhatsApp")
      showSuccess(
        data.sent
          ? `WhatsApp enviado a ${data.sent}.${data.failed ? ` Fallidos: ${data.failed}` : ""}`
          : `No se envió ninguno. Fallidos: ${data.failed}`
      )
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al enviar WhatsApp")
    } finally {
      setSendingWa(false)
    }
  }

  function handleOpenWhatsApp(r: Recipient) {
    if (!r.phone) {
      showError("Este contacto no tiene teléfono")
      return
    }
    const name = r.name || "allá"
    const business = r.business_name || "tu negocio"
    const message = buildPromoMessage(name, business)
    const link = buildWhatsAppLink(r.phone, message)
    window.open(link, "_blank")

    // Mark as sent via wa.me (manual)
    fetch(`/api/promos/${r.id}/whatsapp-manual`, { method: "POST" })
      .then(() => load())
      .catch(() => {})
  }

  function handleCopyLink(r: Recipient) {
    if (!r.phone) {
      showError("Este contacto no tiene teléfono")
      return
    }
    const name = r.name || "allá"
    const business = r.business_name || "tu negocio"
    const message = buildPromoMessage(name, business)
    const link = buildWhatsAppLink(r.phone, message)
    navigator.clipboard.writeText(link).then(
      () => showSuccess("Enlace copiado al portapapeles"),
      () => showError("No se pudo copiar el enlace")
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📣 Promociones</h2>
          <p className="text-gray-500">
            Añade contactos y envíales promociones por email y/o WhatsApp para convertirlos en clientes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              pendingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            ✉️ {pendingCount} email(s)
          </span>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              pendingWaCount > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            💬 {pendingWaCount} WhatsApp
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : message.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">➕ Añadir contacto</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Juan García"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="juan@ejemplo.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Negocio</label>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Restaurante La Plaza"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+34600000000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Cómo conociste a esta persona, etc."
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {adding ? "Añadiendo..." : "Añadir contacto"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div>
            <h3 className="font-semibold">📥 Añadir varios a la vez</h3>
            <p className="text-xs text-gray-500 mt-1">
              Un contacto por línea. Formatos:{" "}
              <code>email</code>, <code>Nombre, email</code>,{" "}
              <code>Nombre &lt;email&gt;</code>, o{" "}
              <code>Nombre, email, +34600000000</code>.
            </p>
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={5}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
            placeholder={"maria@ejemplo.com\nPedro, pedro@ejemplo.com\nAna <ana@ejemplo.com> +34611223344\nLuis, luis@ejemplo.com, +34655443322"}
          />
          <button
            type="button"
            onClick={handleAddBulk}
            disabled={addingBulk || !bulkText.trim()}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50"
          >
            {addingBulk ? "Añadiendo..." : "Añadir varios"}
          </button>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            Los emails que ya sean <strong>clientes</strong>, <strong>leads</strong> o que ya estén en la
            lista se omiten automáticamente. El teléfono es opcional pero necesario para WhatsApp.
          </div>
        </div>
      </div>

      {/* Send section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">✉️ Enviar por Email</h3>
          </div>
          <p className="text-sm text-gray-500">
            Envía el email de promoción a los contactos pendientes. Se usa la plantilla{" "}
            <code>promo_1</code> de{" "}
            <strong>Configuración → Email</strong>.
          </p>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || pendingCount === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
          >
            {sending ? "Enviando..." : `Enviar email (${pendingCount})`}
          </button>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">💬 Enviar por WhatsApp</h3>
            {!whatsappConfigured && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                API no configurada
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {whatsappConfigured
              ? "Envía el mensaje de promoción por WhatsApp a los contactos con teléfono pendiente."
              : "Modo manual: pulsa el botón de WhatsApp en la tabla para abrir wa.me con el mensaje pre-rellenado. Para envío automático, configura la API de WhatsApp Business."}
          </p>
          {whatsappConfigured && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              Cron activo: <strong>10:30 AM</strong> diario. Envía WhatsApp a contactos que{" "}
              <strong>no recibieron email</strong> y tienen teléfono. Si el email fue enviado con
              éxito, se omite WhatsApp.
            </div>
          )}
          {whatsappConfigured ? (
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={sendingWa || pendingWaCount === 0}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {sendingWa ? "Enviando..." : `Enviar WhatsApp (${pendingWaCount})`}
            </button>
          ) : (
            <p className="text-xs text-gray-400">
              Configura <code>WHATSAPP_PHONE_NUMBER_ID</code> y{" "}
              <code>WHATSAPP_ACCESS_TOKEN</code> en Vercel para activar el envío automático.
            </p>
          )}
        </div>
      </div>

      {/* Recipients table */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">📋 Lista de contactos</h3>
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  filter === f.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : visible.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">
            {filter === "all"
              ? "Aún no hay contactos en la lista. Añade los primeros arriba."
              : "No hay contactos en este estado."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Nombre</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Teléfono</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Negocio</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">WhatsApp</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{r.name || "—"}</td>
                    <td className="px-4 py-2">{r.email}</td>
                    <td className="px-4 py-2 text-gray-500">{r.phone || "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{r.business_name || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusLabels[r.status].classes
                        }`}
                      >
                        {statusLabels[r.status].label}
                      </span>
                      {r.status === "failed" && r.last_error && (
                        <p className="text-[11px] text-red-500 mt-1 max-w-[180px] truncate" title={r.last_error}>
                          {r.last_error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {r.phone ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            waStatusLabels[r.whatsapp_status].classes
                          }`}
                        >
                          {waStatusLabels[r.whatsapp_status].label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sin teléfono</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.phone && r.whatsapp_status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(r)}
                              className="text-green-600 hover:text-green-800 transition text-xs font-medium"
                              title="Abrir en WhatsApp"
                            >
                              WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(r)}
                              className="text-blue-600 hover:text-blue-800 transition text-xs font-medium"
                              title="Copiar enlace wa.me"
                            >
                              Copiar
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="text-red-600 hover:text-red-800 transition text-xs font-medium disabled:opacity-50"
                        >
                          {deletingId === r.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">ℹ️ Buena práctica</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            Envía promociones solo a contactos que hayan dado su consentimiento (RGPD). Guarda de dónde
            salió cada contacto en la nota.
          </li>
          <li>Si alguien responde &quot;no interesado&quot;, elimínalo de la lista para no volver a escribirle.</li>
          <li>El email sale de <code>EMAIL_FROM</code> y queda registrado en <code>email_sends</code>.</li>
          <li>
            Los mensajes de WhatsApp se envían desde tu número de WhatsApp Business y quedan registrados en{" "}
            <code>whatsapp_sends</code>.
          </li>
          <li>
            Para usar la API de WhatsApp necesitas: <code>WHATSAPP_PHONE_NUMBER_ID</code>,{" "}
            <code>WHATSAPP_ACCESS_TOKEN</code> y una cuenta de Meta Business verificada.
          </li>
        </ul>
      </div>
    </div>
  )
}
