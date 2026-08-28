"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

const sourceOptions = [
  { value: "google_maps", label: "Google Maps" },
  { value: "directory", label: "Directorio" },
  { value: "website", label: "Web" },
  { value: "referral", label: "Referido" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "social", label: "Redes Sociales" },
]

function calculateScore(fields: Record<string, string | null>): number {
  const fieldsToCheck = ["contact_name", "email", "phone", "website", "city", "industry", "source"]
  const filled = fieldsToCheck.filter((f) => fields[f] && fields[f]!.trim() !== "").length
  return Math.round((filled / fieldsToCheck.length) * 100)
}

export default function NuevoLeadPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    city: "",
    industry: "",
    source: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const score = calculateScore(form)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) {
      setError("El nombre del negocio es obligatorio")
      return
    }
    setLoading(true)
    setError(null)

    const { error: insertError } = await supabase.from("leads").insert({
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      city: form.city.trim() || null,
      industry: form.industry.trim() || null,
      source: (form.source || null) as "google_maps" | "directory" | "website" | "referral" | "cold_outreach" | "social" | null,
      notes: form.notes.trim() || null,
      score,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push("/dashboard/leads")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nuevo Lead</h2>
          <p className="text-gray-500">Añade un nuevo lead al pipeline</p>
        </div>
        <Link href="/dashboard/leads" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm text-gray-500">Score de completitud</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-medium">{score}/100</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del negocio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ej: Restaurante La Plaza"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de contacto</label>
              <input
                type="text"
                name="contact_name"
                value={form.contact_name}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Juan García"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="juan@ejemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="+34 600 000 000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://ejemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Madrid"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
              <input
                type="text"
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Restauración, Retail, Salud..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
            <select
              name="source"
              value={form.source}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Seleccionar fuente...</option>
              {sourceOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Información adicional sobre el lead..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Link
              href="/dashboard/leads"
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Crear Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
