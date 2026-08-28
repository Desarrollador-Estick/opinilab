"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, getStatusColor } from "@/lib/utils"
import { Database } from "@/types/database"

interface Task {
  id: string
  client_id: string | null
  clients?: { business_name: string } | null
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
}

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
}

const statusLabels: Record<string, string> = {
  todo: "Por hacer",
  in_progress: "En progreso",
  review: "Revisión",
  done: "Hecho",
}

export default function TareasPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterAssignee, setFilterAssignee] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [tasksRes, teamRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, clients(business_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["admin", "manager", "member"]),
    ])
    setTasks((tasksRes.data as Task[]) || [])
    setTeam((teamRes.data as TeamMember[]) || [])
    setLoading(false)
  }

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false
    if (filterPriority !== "all" && t.priority !== filterPriority) return false
    if (filterAssignee !== "all" && t.assigned_to !== filterAssignee) return false
    return true
  })

  const todoCount = tasks.filter((t) => t.status === "todo").length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const reviewCount = tasks.filter((t) => t.status === "review").length
  const doneCount = tasks.filter((t) => t.status === "done").length

  async function updateStatus(taskId: string, newStatus: string) {
    setUpdatingId(taskId)
    const update: Database["public"]["Tables"]["tasks"]["Update"] = { status: newStatus as Database["public"]["Tables"]["tasks"]["Update"]["status"] }
    if (newStatus === "done") update.completed_at = new Date().toISOString()
    await supabase.from("tasks").update(update).eq("id", taskId)
    setUpdatingId(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tareas</h2>
          <p className="text-gray-500">Gestión de tareas del equipo</p>
        </div>
        <Link
          href="/dashboard/tareas/nueva"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Nueva Tarea
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterStatus(filterStatus === "todo" ? "all" : "todo")}
          className={`bg-white rounded-xl border p-4 text-center hover:shadow-md transition ${
            filterStatus === "todo" ? "border-blue-300 ring-1 ring-blue-200" : ""
          }`}
        >
          <p className="text-2xl font-bold text-gray-400">{todoCount}</p>
          <p className="text-xs text-gray-500">Por hacer</p>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === "in_progress" ? "all" : "in_progress")}
          className={`bg-white rounded-xl border p-4 text-center hover:shadow-md transition ${
            filterStatus === "in_progress" ? "border-blue-300 ring-1 ring-blue-200" : ""
          }`}
        >
          <p className="text-2xl font-bold text-blue-500">{inProgressCount}</p>
          <p className="text-xs text-gray-500">En progreso</p>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === "review" ? "all" : "review")}
          className={`bg-white rounded-xl border p-4 text-center hover:shadow-md transition ${
            filterStatus === "review" ? "border-blue-300 ring-1 ring-blue-200" : ""
          }`}
        >
          <p className="text-2xl font-bold text-yellow-500">{reviewCount}</p>
          <p className="text-xs text-gray-500">Revisión</p>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === "done" ? "all" : "done")}
          className={`bg-white rounded-xl border p-4 text-center hover:shadow-md transition ${
            filterStatus === "done" ? "border-blue-300 ring-1 ring-blue-200" : ""
          }`}
        >
          <p className="text-2xl font-bold text-green-500">{doneCount}</p>
          <p className="text-xs text-gray-500">Hecho</p>
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4 flex gap-4 flex-wrap">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todas las prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todos los asignados</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name || m.email}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500 self-center">
          {filtered.length} tarea{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Tarea</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Cliente</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Prioridad</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Asignado</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Vence</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  Cargando tareas...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-2">✅</p>
                  <p>No hay tareas{filterStatus !== "all" ? " con este estado" : ""}</p>
                </td>
              </tr>
            ) : (
              filtered.map((task) => {
                const assignee = team.find((m) => m.id === task.assigned_to)
                const isOverdue =
                  task.due_date &&
                  task.status !== "done" &&
                  new Date(task.due_date) < new Date()
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {task.clients?.business_name || "General"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}
                      >
                        {priorityLabels[task.priority] || task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {assignee?.full_name || assignee?.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {task.due_date ? (
                        <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
                          {formatDate(task.due_date)}
                          {isOverdue && " (vencida)"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        disabled={updatingId === task.id}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${getStatusColor(task.status)} disabled:opacity-50`}
                      >
                        <option value="todo">Por hacer</option>
                        <option value="in_progress">En progreso</option>
                        <option value="review">Revisión</option>
                        <option value="done">Hecho</option>
                      </select>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
