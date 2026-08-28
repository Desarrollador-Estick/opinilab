"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Client {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string | null
}

export default function SolicitarResenaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, business_name, contact_name, email, phone")
      .eq("status", "active")
      .order("business_name")
      .then(({ data }) => setClients((data as Client[]) || []))
  }, [])

  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId)
      if (client) {
        setCustomerName(client.contact_name)
        setCustomerPhone(client.phone || "")
        setCustomerEmail(client.email)
      }
    }
  }, [clientId, clients])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!customerName.trim()) {
      setError("El nombre del cliente es obligatorio")
      return
    }
    if (!customerEmail && !customerPhone) {
      setError("Introduce al menos un email o teléfono")
      return
    }

    setLoading(true)
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId || null,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setSuccess(true)
      setTimeout(() => router.push("/dashboard/reseñas"), 2000)
    } else {
      setError(data.error || "Error al enviar la solicitud")
    }
  }

  const previewMessage = `Hola ${customerName || "{nombre}"},

Esperamos que estés bien. Desde nuestra agencia queríamos agradecerte por confiar en nosotros.

¿Podrías tomarte un momento para dejarnos una reseña? Tu opinión nos ayuda a seguir mejorando y a que otros negocios nos conozcan.

${customerEmail ? "Haz clic aquí para dejarnos tu reseña: [enlace]" : "Responde a este mensaje con tu valoración del 1 al 5 y un comentario corto."}

¡Muchas gracias por tu tiempo!

Un saludo,
Tu equipo de marketing`

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/reseñas"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Volver a Reseñas
        </Link>
        <h2 className="text-2xl font-bold mt-2">Solicitar Reseña</h2>
        <p className="text-gray-500">Envía una solicitud de reseña a un cliente</p>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-green-800 font-medium text-lg">Solicitud enviada correctamente</p>
          <p className="text-green-600 text-sm mt-1">Redirigiendo...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">Cliente</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Seleccionar cliente (opcional)</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                <option value="">Sin cliente asociado</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">Datos del destinatario</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="Nombre del cliente"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm"
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm"
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-3">Vista previa del mensaje</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap border">
              {previewMessage}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar Solicitud"}
            </button>
            <Link
              href="/dashboard/reseñas"
              className="px-6 py-2 rounded-lg border hover:bg-gray-50 transition"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
