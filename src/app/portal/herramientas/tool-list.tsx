"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/database"
import { deleteClientToolAction, updateClientToolAction } from "./actions"
import { TOOL_TYPE_OPTIONS } from "./constants"

type Tool = Database["public"]["Tables"]["client_tools"]["Row"]

export function ToolList({
  clientId,
  tools,
  typeLabel,
}: {
  clientId: string
  tools: Tool[]
  typeLabel: Record<string, string>
}) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  async function handleDelete(tool: Tool) {
    if (!confirm(`¿Eliminar "${tool.tool_name}"?`)) return
    setBusy({ del: true })
    setError("")
    const result = await deleteClientToolAction(clientId, tool.id)
    if (result?.error) {
      setError(result.error)
      setBusy({})
      return
    }
    setBusy({})
    router.refresh()
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, tool: Tool) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy({ [tool.id]: true })
    setError("")
    const result = await updateClientToolAction(clientId, tool, fd)
    if (result?.error) {
      setError(result.error)
      setBusy({})
      return
    }
    setBusy({})
    setEditingId(null)
    router.refresh()
  }

  if (tools.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-500 text-sm">
        Aún no has añadido ninguna herramienta.
      </div>
    )
  }

  const field = "w-full border rounded-lg px-3 py-2 text-sm"
  const label = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {tools.map((tool) => {
        const isEditing = editingId === tool.id
        const isRevealed = !!revealed[tool.id]

        if (isEditing) {
          return (
            <form
              key={tool.id}
              onSubmit={(e) => handleUpdate(e, tool)}
              className="bg-white rounded-xl border p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Editar herramienta</h3>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  ✕ Cerrar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Tipo</label>
                  <select
                    name="tool_type"
                    defaultValue={tool.tool_type}
                    className={field}
                  >
                    {TOOL_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Nombre *</label>
                  <input
                    type="text"
                    name="tool_name"
                    defaultValue={tool.tool_name}
                    className={field}
                    required
                  />
                </div>
                <div>
                  <label className={label}>URL</label>
                  <input type="url" name="url" defaultValue={tool.url ?? ""} className={field} />
                </div>
                <div>
                  <label className={label}>Usuario</label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={tool.username ?? ""}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Contraseña</label>
                  <input
                    type="text"
                    name="password_enc"
                    defaultValue={tool.password_enc ?? ""}
                    className={field}
                    placeholder="Dejar en blanco para mantener la actual"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Notas</label>
                  <textarea
                    name="notes"
                    defaultValue={tool.notes ?? ""}
                    rows={2}
                    className={field}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!!busy[tool.id]}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy[tool.id] ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          )
        }

        return (
          <div
            key={tool.id}
            className="bg-white rounded-xl border p-4 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {typeLabel[tool.tool_type] ?? tool.tool_type}
                </span>
                <p className="font-medium text-sm">{tool.tool_name}</p>
              </div>

              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {tool.url && (
                  <p>
                    <span className="text-gray-400">URL: </span>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {tool.url}
                    </a>
                  </p>
                )}
                {tool.username && (
                  <p>
                    <span className="text-gray-400">Usuario: </span>
                    {tool.username}
                  </p>
                )}
                {tool.password_enc && (
                  <p>
                    <span className="text-gray-400">Contraseña: </span>
                    <span className="font-mono">
                      {isRevealed ? tool.password_enc : "••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealed({ ...revealed, [tool.id]: !isRevealed })}
                      className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      {isRevealed ? "Ocultar" : "Ver"}
                    </button>
                  </p>
                )}
                {tool.notes && (
                  <p className="whitespace-pre-line text-gray-500">
                    <span className="text-gray-400">Notas: </span>
                    {tool.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => setEditingId(tool.id)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(tool)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium text-red-600 border-red-200 hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
