"use client"

import { useState } from "react"
import Link from "next/link"

const REQUEST_TYPES = [
  { value: "acceso", label: "Acceso a mis datos" },
  { value: "rectificacion", label: "Rectificación" },
  { value: "supresion", label: "Supresión / derecho al olvido" },
  { value: "limitacion", label: "Limitación del tratamiento" },
  { value: "portabilidad", label: "Portabilidad" },
  { value: "oposicion", label: "Oposición" },
  { value: "baja_marketing", label: "Baja de comunicaciones comerciales" },
]

export default function ProteccionDatosPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [requestType, setRequestType] = useState("")
  const [details, setDetails] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !requestType) {
      setError("El email y el derecho solicitado son obligatorios.")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/privacy/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, request_type: requestType, details }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Error")
      setSent(true)
    } catch {
      setError("No se pudo registrar la solicitud. Inténtalo más tarde o escríbenos a info@opinilab.com.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mb-8 font-[family-name:var(--font-heading)]">
          Protección de datos y tus derechos
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-8">
          Documento informativo conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley 34/2002 (LSSI-CE) · Última actualización: 12 de septiembre de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-[var(--color-muted-foreground)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              1. Quién trata tus datos (responsable)
            </h2>
            <p className="mb-3">
              El responsable del tratamiento de los datos recogidos en esta web y en nuestras campañas de captación de clientes es:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{process.env.NEXT_PUBLIC_COMPANY_NAME || "OpinILab"}</strong> {process.env.NEXT_PUBLIC_COMPANY_NIF ? `· NIF ${process.env.NEXT_PUBLIC_COMPANY_NIF}` : ""}</li>
              {process.env.NEXT_PUBLIC_COMPANY_ADDRESS && <li>Domicilio: {process.env.NEXT_PUBLIC_COMPANY_ADDRESS}</li>}
              <li>Contacto de protección de datos: <a href="mailto:info@opinilab.com" className="text-[var(--color-primary)] underline">info@opinilab.com</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              2. Qué datos tratamos y con qué base
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contactos empresariales (campañas de captación):</strong> nombre de contacto, email, teléfono y datos públicos del negocio. Base: <em>interés legítimo</em> (art. 6.1.f RGPD) al tratarse de contactos profesionales en fuentes accesibles al público (directorios y Google Maps). Puedes oponerte, sin coste y sin explicar motivos, con el enlace de baja de cada email.</li>
              <li><strong>Usuarios de la web:</strong> visitas anónimas con tecnologías de almacenamiento local solo cuando aceptas las cookies de analítica. Base: <em>consentimiento</em>.</li>
              <li><strong>Clientes:</strong> identificación, facturación y gestión del servicio. Base: <em>ejecución de contrato</em> y <em>obligación legal</em> (fiscal).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              3. Con quién compartimos datos (encargados de tratamiento)
            </h2>
            <p className="mb-3">Los datos se tratan con proveedores que actúan como encargados del tratamiento y que ofrecen garantías contractuales (DPA):</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase</strong> (hosting de base de datos, UE).</li>
              <li><strong>Vercel / Vercel Inc.</strong> (alojamiento web, EE. UU. — cláusulas contractuales estándar).</li>
              <li><strong>Resend</strong> (envío de emails, EE. UU.).</li>
              <li><strong>Groq (Groq Inc.)</strong> (IA generativa para asistencia, EE. UU.).</li>
              <li><strong>Stripe</strong> (pagos; no almacenamos datos de tarjeta).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              4. Cuánto tiempo conservamos tus datos
            </h2>
            <p className="mb-3">
              Los contactos de campañas de captación que no responden o rechazan se anonimizan automáticamente a los 120 días. Los registros de navegación se purgan a los 12 meses y los registros de email a los 24. Los datos de clientes se conservan mientras dure la relación contractual y, después, el plazo legal aplicable (facturación).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              5. Tus derechos (ARCO + RGPD)
            </h2>
            <p className="mb-3">
              Puedes ejercer en cualquier momento y de forma gratuita tus derechos de <strong>acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición</strong>, así como <strong>revocar el consentimiento</strong> o <strong>darte de baja</strong> de las comunicaciones comerciales. Si no quedas satisfecho, puedes reclamar ante la <strong>Agencia Española de Protección de Datos (aepd.es)</strong>.
            </p>
            <p>
              Utiliza el formulario siguiente y te responderemos en un máximo de un mes.
            </p>
          </section>
        </div>

        <div className="mt-12 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4 font-[family-name:var(--font-heading)]">
            Envía tu solicitud
          </h2>

          {sent ? (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-800 dark:text-green-300">
              Solicitud registrada. Hemos anotado tu petición y te responderemos en el plazo máximo de un mes (normalmente mucho antes). Para las bajas de marketing, la baja es efectiva de inmediato al procesarla.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm text-[var(--color-muted-foreground)] mb-1">Nombre (opcional)</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-[var(--color-muted-foreground)] mb-1">Email *</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm text-[var(--color-muted-foreground)] mb-1">Derecho que deseas ejercer *</span>
                <select
                  required
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Selecciona un derecho…</option>
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm text-[var(--color-muted-foreground)] mb-1">Detalles (opcional)</span>
                <textarea
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Por ejemplo: en qué campaña o con qué email te contactamos, qué datos quieres ver o corregir…"
                />
              </label>

              {/* Honeypot anti-bots */}
              <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" onChange={() => {}} />

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {sending ? "Enviando…" : "Enviar solicitud"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-sm text-[var(--color-muted-foreground)]">
          Más información en nuestra{" "}
          <Link href="/privacidad" className="text-[var(--color-primary)] underline">política de privacidad</Link>,{" "}
          <Link href="/terminos" className="text-[var(--color-primary)] underline">términos de servicio</Link> y{" "}
          <Link href="/cookies" className="text-[var(--color-primary)] underline">política de cookies</Link>.
        </p>
      </div>
    </div>
  )
}