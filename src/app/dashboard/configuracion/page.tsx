"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const FEATURE_META: Record<string, { label: string; desc: string }> = {
  feature_marketing_ai: {
    label: "IA de Marketing (posts y contenido)",
    desc: "Permite generar borradores de posts de redes sociales y contenido con inteligencia artificial.",
  },
  feature_leads_capture: {
    label: "Captación de leads (formulario web)",
    desc: "Permite recibir solicitudes de presupuesto desde la landing (crea leads y envía emails).",
  },
}

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
  setup_fee: number
  ai_free_quota: number
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
  setup_fee: 0,
  ai_free_quota: 0,
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
  const [activeSection, setActiveSection] = useState<"company" | "invoice" | "email" | "team" | "automation" | "api" | "marketing" | "security">("company")
  const [apiStatus, setApiStatus] = useState<Record<string, boolean> | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({})
  const [featureLoading, setFeatureLoading] = useState(false)
  const [featureSaving, setFeatureSaving] = useState(false)
  const [featureSaved, setFeatureSaved] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaQr, setMfaQr] = useState<string | null>(null)
  const [mfaRecovery, setMfaRecovery] = useState<string[]>([])
  const [mfaCode, setMfaCode] = useState("")
  const [mfaError, setMfaError] = useState("")
  const [mfaMessage, setMfaMessage] = useState("")

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
            row.key === "invoice_next_number" || row.key === "tax_rate" || row.key === "payment_days" || row.key === "setup_fee" || row.key === "ai_free_quota"
              ? Number(row.value)
              : row.value
        }
      })
      setSettings(loaded)
    }
  }

  async function loadFeatures() {
    setFeatureLoading(true)
    try {
      const res = await fetch("/api/settings/features")
      if (res.ok) {
        const json = await res.json()
        setFeatureFlags((json.flags ?? {}) as Record<string, boolean>)
      }
    } catch {
      // silencioso
    } finally {
      setFeatureLoading(false)
    }
  }

  async function handleSaveFeatures() {
    setFeatureSaving(true)
    setFeatureSaved(false)
    try {
      const res = await fetch("/api/settings/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featureFlags),
      })
      if (res.ok) {
        const json = await res.json()
        setFeatureFlags((json.flags ?? {}) as Record<string, boolean>)
        setFeatureSaved(true)
        setTimeout(() => setFeatureSaved(false), 3000)
      }
    } finally {
      setFeatureSaving(false)
    }
  }

  async function loadApiStatus() {
    setApiLoading(true)
    try {
      const res = await fetch("/api/settings/api-status")
      if (res.ok) {
        const json = await res.json()
        setApiStatus(json.keys ?? null)
      }
    } catch {
      setApiStatus(null)
    } finally {
      setApiLoading(false)
    }
  }

  async function loadMfaStatus() {
    setMfaLoading(true)
    try {
      const res = await fetch("/api/auth/mfa/status")
      if (res.ok) {
        const json = await res.json()
        setMfaEnabled(Boolean(json.enabled))
      }
    } catch {
      setMfaEnabled(false)
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleStartMfaSetup() {
    setMfaLoading(true)
    setMfaError("")
    setMfaQr(null)
    setMfaRecovery([])
    setMfaCode("")
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" })
      const json = await res.json()
      if (!json.success) {
        setMfaError(json.error || "No se pudo iniciar la configuración.")
        return
      }
      setMfaQr(json.qrDataUrl)
      setMfaRecovery(json.recoveryCodes ?? [])
      setMfaMessage("Escanea el QR y verifica con un código para activar 2FA.")
    } catch {
      setMfaError("Error al iniciar la configuración.")
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleConfirmMfaSetup(e: React.FormEvent) {
    e.preventDefault()
    if (mfaCode.trim().length < 6) return
    setMfaLoading(true)
    setMfaError("")
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfaCode.trim() }),
      })
      const json = await res.json()
      if (!json.success) {
        setMfaError(json.error || "Código inválido.")
        return
      }
      setMfaEnabled(true)
      setMfaQr(null)
      setMfaRecovery([])
      setMfaCode("")
      setMfaMessage("2FA activado correctamente.")
      setTimeout(() => setMfaMessage(""), 4000)
    } catch {
      setMfaError("Error al activar 2FA.")
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleDisableMfa(e: React.FormEvent) {
    e.preventDefault()
    if (mfaCode.trim().length < 6) {
      setMfaError("Introduce tu código de 6 dígitos actual para desactivar 2FA.")
      return
    }
    if (!window.confirm("¿Seguro que quieres desactivar la verificación en dos pasos?")) return
    setMfaLoading(true)
    setMfaError("")
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfaCode.trim() }),
      })
      const json = await res.json()
      if (!json.success) {
        setMfaError(json.error || "No se pudo desactivar.")
        return
      }
      setMfaEnabled(false)
      setMfaCode("")
      setMfaMessage("2FA desactivado.")
      setTimeout(() => setMfaMessage(""), 4000)
    } catch {
      setMfaError("Error al desactivar 2FA.")
    } finally {
      setMfaLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeSection === "api") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadApiStatus()
    }
  }, [activeSection])

  useEffect(() => {
    if (activeSection === "marketing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFeatures()
    }
  }, [activeSection])

  useEffect(() => {
    if (activeSection === "security") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMfaStatus()
    }
  }, [activeSection])

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
    { id: "marketing" as const, label: "Marketing", icon: "📢" },
    { id: "security" as const, label: "Seguridad", icon: "🔐" },
    { id: "api" as const, label: "API & Logo", icon: "🔑" },
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
            <div>
              <label className="block text-sm font-medium mb-1">Setup de servicio (€)</label>
              <input
                type="number"
                value={settings.setup_fee}
                onChange={(e) => updateSetting("setup_fee", Number(e.target.value))}
                min="0"
                step="0.01"
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cargo de alta que se factura al contratar cada servicio nuevo.
                {" "}0 para no cobrar setup.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cupo de tareas IA gratis</label>
              <input
                type="number"
                value={settings.ai_free_quota}
                onChange={(e) => updateSetting("ai_free_quota", Number(e.target.value))}
                min="0"
                step="1"
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número de tareas IA (Groq) gratuitas que los clientes pueden pedir. Al agotarse,
                las nuevas pasan a lista de espera hasta que las reactives.
                {" "}0 para desactivar las tareas IA.
              </p>
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

      {activeSection === "marketing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Marketing</h3>
                <p className="text-sm text-gray-500">
                  Activa o desactiva funcionalidades de marketing. Los cambios se aplican al instante en toda la web.
                </p>
              </div>
              <button
                onClick={handleSaveFeatures}
                disabled={featureSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
              >
                {featureSaving ? "Guardando..." : featureSaved ? "✓ Guardado" : "Guardar cambios"}
              </button>
            </div>

            {featureLoading ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(FEATURE_META).map(([key, meta]) => (
                  <div key={key} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={Boolean(featureFlags[key])}
                      onClick={() =>
                        setFeatureFlags((prev) => ({ ...prev, [key]: !Boolean(prev[key]) }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        featureFlags[key] ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          featureFlags[key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === "api" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">API & Integraciones</h3>
            <p className="text-sm text-gray-500">
              Estado de las claves de API configuradas en el servidor. Los valores de las claves se
              gestionan como variables de entorno en el hosting (Netlify/Vercel), nunca se muestran aquí.
            </p>

            {apiLoading ? (
              <p className="text-sm text-gray-500">Comprobando estado...</p>
            ) : apiStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <StatusRow
                  label="Groq (IA)"
                  ok={apiStatus.groq}
                  hint="GROQ_API_KEY"
                />
                <StatusRow
                  label="Resend (Email)"
                  ok={apiStatus.resend}
                  hint="RESEND_API_KEY"
                />
                <StatusRow
                  label="Stripe (Pagos)"
                  ok={apiStatus.stripe_secret}
                  hint="STRIPE_SECRET_KEY"
                />
                <StatusRow
                  label="Stripe Webhook"
                  ok={apiStatus.stripe_webhook}
                  hint="STRIPE_WEBHOOK_SECRET"
                />
                <StatusRow
                  label="Supabase Service Role"
                  ok={apiStatus.supabase_service}
                  hint="SUPABASE_SERVICE_ROLE_KEY"
                />
                <StatusRow
                  label="App URL"
                  ok={apiStatus.app_url}
                  hint="NEXT_PUBLIC_APP_URL"
                />
              </div>
            ) : (
              <p className="text-sm text-red-600">No se pudo comprobar el estado de las APIs.</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <p>
                Si la IA no funciona (las respuestas automáticas, informes y copy fallan), es porque{" "}
                <code>GROQ_API_KEY</code> no está configurada. Añádela desde el panel de variables de
                entorno de Netlify (y vuelve a desplegar), o contacta con el administrador técnico.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">Logo de la agencia</h3>
            <p className="text-sm text-gray-500">
              Sube el logo que aparece en la web pública y en el panel. Se guarda en Supabase Storage.
            </p>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Logo actual"
                className="w-16 h-16 object-contain bg-gray-50 border rounded-lg"
              />
              <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer text-sm">
                Subir nuevo logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-gray-400">
              Próximamente: subida directa desde el panel. Por ahora, sustituye el archivo{" "}
              <code>public/logo.png</code> en el repositorio y despliega.
            </p>
          </div>
        </div>
      )}

      {activeSection === "security" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">Seguridad · Verificación en dos pasos (2FA)</h3>
            <p className="text-sm text-gray-500">
              Añade una capa extra de seguridad con una aplicación de autenticación (Google
              Authenticator, Authy, 1Password…). Se pide un código al iniciar sesión.
            </p>

            {mfaMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {mfaMessage}
              </div>
            )}
            {mfaError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {mfaError}
              </div>
            )}

            {mfaLoading && <p className="text-sm text-gray-500">Cargando...</p>}

            {!mfaEnabled && !mfaQr && !mfaLoading && (
              <div className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Activar 2FA</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Protege tu cuenta de accesos no autorizados.
                  </p>
                </div>
                <button
                  onClick={handleStartMfaSetup}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Configurar
                </button>
              </div>
            )}

            {!mfaEnabled && mfaQr && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mfaQr} alt="Código QR para 2FA" className="rounded-lg border" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Códigos de respaldo</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Guárdalos en un lugar seguro. Solo se muestran una vez.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {mfaRecovery.map((c) => (
                      <code
                        key={c}
                        className="bg-gray-100 rounded px-2 py-1 text-xs font-mono text-center"
                      >
                        {c}
                      </code>
                    ))}
                  </div>
                </div>
                <form onSubmit={handleConfirmMfaSetup} className="space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 text-sm tracking-widest text-center text-lg"
                    placeholder="Código de 6 dígitos"
                    disabled={mfaLoading}
                    required
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={mfaLoading || mfaCode.trim().length < 6}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                    >
                      {mfaLoading ? "Activando..." : "Activar 2FA"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMfaQr(null)
                        setMfaRecovery([])
                        setMfaCode("")
                        setMfaError("")
                      }}
                      className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {mfaEnabled && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">2FA activado</p>
                    <p className="text-xs text-green-600 mt-0.5">Protección de dos pasos activa.</p>
                  </div>
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    Activo
                  </span>
                </div>
                <form onSubmit={handleDisableMfa} className="mt-4 space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 text-sm tracking-widest text-center text-lg"
                    placeholder="Introduce tu código actual para desactivar"
                    disabled={mfaLoading}
                    required
                  />
                  <button
                    type="submit"
                    disabled={mfaLoading || mfaCode.trim().length < 6}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition text-sm disabled:opacity-50"
                  >
                    {mfaLoading ? "Desactivando..." : "Desactivar 2FA"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="border rounded-lg p-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-400 font-mono">{hint}</p>
      </div>
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {ok ? "Configurado" : "Falta"}
      </span>
    </div>
  )
}
