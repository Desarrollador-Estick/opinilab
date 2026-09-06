"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/database"
import { deleteClientToolAction, updateClientToolAction } from "./actions"
import { TOOL_TYPE_OPTIONS } from "./constants"

type Tool = Database["public"]["Tables"]["client_tools"]["Row"]

function parseImageNotes(notes: string | null): string[] {
  if (!notes) return []
  const marker = "---IMAGES---"
  const idx = notes.indexOf(marker)
  if (idx === -1) return []
  const after = notes.substring(idx + marker.length)
  return after.split("; ").filter((s) => s.trim())
}

function cleanNotes(notes: string | null): string {
  if (!notes) return ""
  const idx = notes.indexOf("---IMAGES---")
  return idx === -1 ? notes : notes.substring(0, idx).trimEnd()
}

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
  const [error, setError] = useState("")
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  async function handleDelete(tool: Tool) {
    if (!confirm(`¿Eliminar "${tool.tool_name}"?`)) return
    setError("")
    const result = await deleteClientToolAction(clientId, tool.id)
    if (result?.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function handleUpdate(
    e: React.FormEvent<HTMLFormElement>,
    tool: Tool
  ) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError("")
    const result = await updateClientToolAction(clientId, tool, fd)
    if (result?.error) {
      setError(result.error)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  if (tools.length === 0) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
        Aún no has añadido ninguna herramienta.
      </div>
    )
  }

  const field = "w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
  const label = "block text-sm font-medium mb-2"

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {tools.map((tool) => {
        const images = parseImageNotes(tool.notes)

        if (editingId === tool.id) {
          return (
            <form
              key={tool.id}
              onSubmit={(e) => handleUpdate(e, tool)}
              className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>
                  Editar herramienta
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-muted)] transition-all duration-200"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label} style={{ color: "var(--color-foreground)" }}>Tipo</label>
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
                  <label className={label} style={{ color: "var(--color-foreground)" }}>Nombre *</label>
                  <input
                    type="text"
                    name="tool_name"
                    defaultValue={tool.tool_name}
                    className={field}
                    placeholder="Ej: Perfil de Google de MiNegocio"
                    required
                  />
                </div>
                <div>
                  <label className={label} style={{ color: "var(--color-foreground)" }}>URL</label>
                  <input
                    type="url"
                    name="url"
                    defaultValue={tool.url ?? ""}
                    className={field}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className={label} style={{ color: "var(--color-foreground)" }}>Usuario</label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={tool.username ?? ""}
                    className={field}
                    placeholder="Ej: correo de la cuenta"
                  />
                </div>
                <div>
                  <label className={label} style={{ color: "var(--color-foreground)" }}>Contraseña</label>
                  <input
                    type="password"
                    name="password_enc"
                    defaultValue={tool.password_enc ?? ""}
                    className={field}
                    placeholder="Contraseña de acceso"
                  />
                </div>
                <div>
                  <label className={label} style={{ color: "var(--color-foreground)" }}>Notas</label>
                  <textarea
                    name="notes"
                    defaultValue={cleanNotes(tool.notes)}
                    className={field}
                    rows={2}
                    placeholder="Cualquier dato adicional que necesitemos"
                  />
                </div>
              </div>
            </form>
          )
        }

        const isRevealed = !!revealed[tool.id]

        return (
          <div
            key={tool.id}
            className="bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
                    {typeLabel[tool.tool_type] ?? tool.tool_type}
                  </span>
                  <p className="font-semibold" style={{ color: "var(--color-foreground)" }}>{tool.tool_name}</p>
                </div>

                <div className="mt-3 space-y-1.5 text-sm">
                  {tool.url && (
                    <p>
                      <span style={{ color: "var(--color-muted-foreground)" }}>URL: </span>
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {tool.url}
                      </a>
                    </p>
                  )}
                  {tool.username && (
                    <p>
                      <span style={{ color: "var(--color-muted-foreground)" }}>Usuario: </span>
                      <span style={{ color: "var(--color-foreground)" }}>{tool.username}</span>
                    </p>
                  )}
                  {tool.password_enc && (
                    <p>
                      <span style={{ color: "var(--color-muted-foreground)" }}>Contraseña: </span>
                      <span className="font-mono" style={{ color: "var(--color-foreground)" }}>
                        {isRevealed ? tool.password_enc : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRevealed({ ...revealed, [tool.id]: !isRevealed })}
                        className="ml-2 text-xs font-medium hover:underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {isRevealed ? "Ocultar" : "Mostrar"}
                      </button>
                    </p>
                  )}
                  {tool.notes && (
                    <p className="whitespace-pre-line">
                      <span style={{ color: "var(--color-muted-foreground)" }}>Notas: </span>
                      <span style={{ color: "var(--color-foreground)" }}>{cleanNotes(tool.notes)}</span>
                    </p>
                  )}
                  {images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {images.map((imgUrl, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={imgUrl}
                          alt="Herramienta imagen"
                          className="w-16 h-16 object-cover rounded-xl border border-[var(--color-border)]"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setEditingId(tool.id)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-muted)] transition-all duration-200"
                  style={{ color: "var(--color-foreground)" }}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(tool)}
                  className="px-3 py-1.5 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}