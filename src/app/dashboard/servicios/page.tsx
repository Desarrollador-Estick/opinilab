"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface Service {
  id: string
  name: string
  description: string | null
  category: "reviews" | "social_media" | "seo" | "ads" | "email" | "branding" | "web" | null
  base_price: number
  billing_cycle: "one_time" | "monthly" | "quarterly" | "yearly" | null
  is_active: boolean
  created_at: string
}

const categories = [
  { value: "reviews", label: "Reseñas" },
  { value: "social_media", label: "Redes Sociales" },
  { value: "seo", label: "SEO" },
  { value: "ads", label: "Publicidad" },
  { value: "email", label: "Email Marketing" },
  { value: "branding", label: "Branding" },
  { value: "web", label: "Web" },
]

const cycles = [
  { value: "monthly", label: "Mensual" },
  { value: "one_time", label: "Pago único" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
]

const emptyForm = {
  name: "",
  description: "",
  category: "reviews",
  base_price: 0,
  billing_cycle: "monthly",
}

export default function ServiciosPage() {
  const supabase = createClient()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Service | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true })
    setServices(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function resetForm() {
    setForm(emptyForm)
    setEditing(null)
    setCreating(false)
    setMessage("")
  }

  async function handleToggleActive(service: Service) {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id)
    if (!error) load()
  }

  async function handleDelete(service: Service) {
    if (!confirm(`¿Eliminar el servicio "${service.name}"?`)) return
    const { error } = await supabase.from("services").delete().eq("id", service.id)
    if (!error) load()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category as "reviews" | "social_media" | "seo" | "ads" | "email" | "branding" | "web",
      base_price: Number(form.base_price),
      billing_cycle: form.billing_cycle as "one_time" | "monthly" | "quarterly" | "yearly",
    }

    if (!payload.name) {
      setMessage("El nombre es obligatorio")
      setSaving(false)
      return
    }

    const { error } = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert(payload)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      resetForm()
      load()
    }
    setSaving(false)
  }

  function startEdit(service: Service) {
    setEditing(service)
    setCreating(true)
    setForm({
      name: service.name,
      description: service.description ?? "",
      category: service.category ?? "",
      base_price: service.base_price,
      billing_cycle: service.billing_cycle ?? "",
    })
    setMessage("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Servicios y Precios</h2>
          <p className="text-gray-500">Controla los servicios que ofreces y sus precios</p>
        </div>
        {!creating && (
          <button
            onClick={() => {
              resetForm()
              setCreating(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Nuevo Servicio
          </button>
        )}
        {creating && (
          <button onClick={resetForm} className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition">
            Cancelar
          </button>
        )}
      </div>

      {message && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {message}
        </div>
      )}

      {creating && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">{editing ? "Editar Servicio" : "Nuevo Servicio"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="Gestión de Reseñas Google"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Precio base (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ciclo de facturación</label>
              <select
                value={form.billing_cycle}
                onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                {cycles.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="Describe brevemente qué incluye este servicio"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Ciclo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Cargando servicios...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No hay servicios aún. Crea el primero.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{s.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {categories.find((c) => c.value === s.category)?.label ?? s.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {Number(s.base_price).toFixed(2)}€
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {cycles.find((c) => c.value === s.billing_cycle)?.label ?? s.billing_cycle}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium transition ${
                          s.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title={s.is_active ? "Haz clic para desactivar" : "Haz clic para activar"}
                      >
                        <span className={`w-2 h-2 rounded-full ${s.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                        {s.is_active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="px-2 py-1 rounded-md border text-xs hover:bg-gray-50 transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="px-2 py-1 rounded-md border text-xs text-red-600 border-red-200 hover:bg-red-50 transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
