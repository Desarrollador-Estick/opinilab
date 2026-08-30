"use client"

import { useState } from "react"

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    business: "",
    message: "",
    googleMapsUrl: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Error al enviar")
      }

      setSuccess(true)
      setFormData({ name: "", email: "", phone: "", business: "", message: "", googleMapsUrl: "" })
    } catch (err: any) {
      setError(err.message || "Error al enviar el formulario")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center max-w-xl mx-auto">
        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">¡Mensaje enviado!</h3>
        <p className="text-blue-200/70 text-sm">Nos pondremos en contacto contigo en menos de 24 horas.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-left space-y-4 max-w-xl mx-auto">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Tu nombre"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition"
          required
        />
        <input
          type="email"
          placeholder="Tu email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="tel"
          placeholder="Tu teléfono"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition"
        />
        <input
          type="text"
          placeholder="Nombre de tu negocio"
          value={formData.business}
          onChange={(e) => setFormData({ ...formData, business: e.target.value })}
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition"
          required
        />
      </div>
      <input
        type="url"
        placeholder="Enlace de tu negocio en Google Maps (opcional)"
        value={formData.googleMapsUrl}
        onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition"
      />
      <textarea
        rows={3}
        placeholder="¿En qué te podemos ayudar?"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition resize-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-50 text-lg"
      >
        {loading ? "Enviando..." : "Enviar Consulta Gratis"}
      </button>
      <p className="text-center text-xs text-white/40">Sin compromiso. Respondemos en menos de 24h.</p>
    </form>
  )
}
