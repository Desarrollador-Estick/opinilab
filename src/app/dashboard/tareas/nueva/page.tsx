"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Client {
  id: string
  business_name: string
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string
}

export default function NuevaTareaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [clientId, setClientId] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [dueDate, setDueDate] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([
      supabase
        .from("clients")
        .select("id, business_name")
        .order("business_name"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["admin", "manager", "member"]),
    ]).then(([clientsRes, teamRes]) => {
      setClients((clientsRes.data as Client[]) || [])
      setTeam((teamRes.data as TeamMember[]) || [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!title.trim()) {
      setError("El título es obligatorio")
      return
    }
    setLoading(true)
    const { error: insertError } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      client_id: clientId || null,
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      status: "todo",
    })
    setLoading(false)
    if (insertError) {
      setError("Error al crear la tarea: " + insertError.message)
    } else {
      router.push("/dashboard/tareas")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/tareas" className="text-sm text-blue-600 hover:text-blue-800">
          ← Volver a Tareas
        </Link>
        <h2 className="text-2xl font-bold mt-2">Nueva Tarea</h2>
        <p className="text-gray-500">Crea una nueva tarea para el equipo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Detalles de la tarea</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm"
              placeholder="Nombre de la tarea"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm"
              placeholder="Detalles de la tarea..."
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Asignación</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Cliente (opcional)</label>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Asignar a</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Prioridad</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "low", label: "Baja", color: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
              { value: "medium", label: "Media", color: "bg-blue-100 text-blue-600 hover:bg-blue-200" },
              { value: "high", label: "Alta", color: "bg-orange-100 text-orange-600 hover:bg-orange-200" },
              { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-600 hover:bg-red-200" },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value as "low" | "medium" | "high" | "urgent")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  p.color
                } ${priority === p.value ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Tarea"}
          </button>
          <Link
            href="/dashboard/tareas"
            className="px-6 py-2 rounded-lg border hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
