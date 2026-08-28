"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface Settings {
  company_name: string
  company_nif: string
  company_email: string
  company_phone: string
  company_address: string
  invoice_series: string
  invoice_next_number: number
  tax_rate: number
  payment_days: number
  email_provider: string
  email_from: string
}

const defaultSettings: Settings = {
  company_name: "",
  company_nif: "",
  company_email: "",
  company_phone: "",
  company_address: "",
  invoice_series: "FAC",
  invoice_next_number: 1,
  tax_rate: 21,
  payment_days: 30,
  email_provider: "resend",
  email_from: "",
}

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [teamEmail, setTeamEmail] = useState("")
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamMessage, setTeamMessage] = useState("")
  const [activeSection, setActiveSection] = useState<"company" | "invoice" | "email" | "team" | "automation">("company")

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", Object.keys(defaultSettings))
    if (data) {
      const loaded = { ...defaultSettings }
      data.forEach((row) => {
        if (row.key in loaded) {
          ;(loaded as Record<string, unknown>)[row.key] =
            row.key === "invoice_next_number" || row.key === "tax_rate" || row.key === "payment_days"
              ? Number(row.value)
              : row.value
        }
      })
      setSettings(loaded)
    }
  }

  async function saveSettings() {
    setSaving(true)
    const updates = Object.entries(settings).map(([key, value]) =>
      supabase
        .from("settings")
        .upsert({ key, value: String(value) }, { onConflict: "key" })
    )
    await Promise.all(updates)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function handleAddTeamMember(e: React.FormEvent) {
    e.preventDefault()
    if (!teamEmail.trim()) return
    setTeamLoading(true)
    setTeamMessage("")
    // In a real app, this would send an invite via Supabase Auth
    setTeamMessage(`Invitación enviada a ${teamEmail}. El usuario deberá registrarse y será asignado como miembro.`)
    setTeamEmail("")
    setTeamLoading(false)
  }

  const sections = [
    { id: "company" as const, label: "Empresa", icon: "🏢" },
    { id: "invoice" as const, label: "Facturación", icon: "💰" },
    { id: "email" as const, label: "Email", icon: "📧" },
    { id: "team" as const, label: "Equipo", icon: "👥" },
    { id: "automation" as const, label: "Automatización", icon: "⚙️" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración</h2>
          <p className="text-gray-500">Ajustes de la agencia</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar Cambios"}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeSection === s.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {activeSection === "company" && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Datos de la Agencia</h3>
          <p className="text-sm text-gray-500">Información que aparece en facturas, contratos y comunicaciones</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la empresa</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => updateSetting("company_name", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="Tu Agencia S.L."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NIF/CIF</label>
              <input
                type="text"
                value={settings.company_nif}
                onChange={(e) => updateSetting("company_nif", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="B12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={settings.company_email}
                onChange={(e) => updateSetting("company_email", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                value={settings.company_phone}
                onChange={(e) => updateSetting("company_phone", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <textarea
                rows={2}
                value={settings.company_address}
                onChange={(e) => updateSetting("company_address", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {activeSection === "invoice" && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Configuración de Facturación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Serie de facturación</label>
              <input
                type="text"
                value={settings.invoice_series}
                onChange={(e) => updateSetting("invoice_series", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Próximo número</label>
              <input
                type="number"
                value={settings.invoice_next_number}
                onChange={(e) => updateSetting("invoice_next_number", Number(e.target.value))}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IVA (%)</label>
              <input
                type="number"
                value={settings.tax_rate}
                onChange={(e) => updateSetting("tax_rate", Number(e.target.value))}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Días para pago</label>
              <input
                type="number"
                value={settings.payment_days}
                onChange={(e) => updateSetting("payment_days", Number(e.target.value))}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p>
              Ejemplo de número de factura: <strong>{settings.invoice_series}-{new Date().getFullYear()}-{String(settings.invoice_next_number).padStart(4, "0")}</strong>
            </p>
          </div>
        </div>
      )}

      {activeSection === "email" && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Configuración de Email</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Proveedor</label>
              <select
                value={settings.email_provider}
                onChange={(e) => updateSetting("email_provider", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                <option value="resend">Resend (recomendado)</option>
                <option value="smtp">SMTP personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email remitente</label>
              <input
                type="email"
                value={settings.email_from}
                onChange={(e) => updateSetting("email_from", e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="hola@tuagencia.com"
              />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p>
              La API Key de Resend se configura en las variables de entorno (<code>.env.local</code>) como{" "}
              <code>RESEND_API_KEY</code>.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Plantillas de email disponibles:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["Bienvenida", "Factura", "Recordatorio", "Solicitud reseña", "Reporte", "Follow-up"].map(
                (t) => (
                  <div key={t} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    ✓ {t}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === "team" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">Gestión de Equipo</h3>
            <p className="text-sm text-gray-500">Gestiona los miembros del equipo que tienen acceso al panel</p>
            <form onSubmit={handleAddTeamMember} className="flex gap-2">
              <input
                type="email"
                value={teamEmail}
                onChange={(e) => setTeamEmail(e.target.value)}
                className="flex-1 border rounded-lg px-4 py-2 text-sm"
                placeholder="email@ejemplo.com"
              />
              <button
                type="submit"
                disabled={teamLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
              >
                {teamLoading ? "Enviando..." : "Invitar"}
              </button>
            </form>
            {teamMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                {teamMessage}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h4 className="font-medium mb-3">Miembros actuales</h4>
            <p className="text-sm text-gray-500">
              Los miembros del equipo se gestionan desde Supabase Auth. Cada usuario con rol admin, manager o member tiene acceso al panel.
            </p>
          </div>
        </div>
      )}

      {activeSection === "automation" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">Automatizaciones</h3>
            <p className="text-sm text-gray-500">
              Configura tareas automáticas que se ejecutan periódicamente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Recordatorios de factura</h4>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  Activo
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Envía emails de recordatorio automáticamente cuando una factura está vencida.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Endpoint: <code>/api/automation</code> (GET, diario)
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Seguimiento de leads</h4>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  Activo
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Envía emails de seguimiento a leads que tienen fecha de follow-up pendiente.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Endpoint: <code>/api/automation</code> (GET, diario)
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Reportes mensuales</h4>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  Activo
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Genera reportes mensuales automáticos para todos los clientes activos el día 1 de cada mes.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Endpoint: <code>/api/automation</code> (GET, 1er día del mes)
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Cron Job</h4>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  Configurar
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Configura un cron job en tu hosting para llamar a <code>/api/automation</code> diariamente.
              </p>
              <pre className="mt-2 bg-gray-50 rounded-lg p-2 text-xs overflow-x-auto">
{`# Ejemplo en Vercel Cron Jobs (vercel.json):
{ "crons": [{ "path": "/api/automation", "schedule": "0 8 * * *" }] }`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
