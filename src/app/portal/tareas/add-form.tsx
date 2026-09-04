"use client"

import { useState } from "react"
import { addAiTaskAction, AiTaskState } from "./actions"
import { AI_TASK_LABEL, AiTaskCategory } from "./constants"

export function AddTaskForm({
  categories,
  quotaExhausted,
}: {
  categories: AiTaskCategory[]
  quotaExhausted: boolean
}) {
  const [state, setState] = useState<AiTaskState | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const formData = new FormData(e.currentTarget)

    const files = formData.getAll("images") as File[]
    let imageInfo: string = ""
    if (files.length > 0) {
      const infoParts: string[] = []
      for (const file of files) {
        infoParts.push(`${file.name} (${file.type || "image"})`)
      }
      imageInfo = "IMAGES: " + infoParts.join("; ")
    }

    const existingNote = formData.get("request_note") as string || ""
    const noteWithImages = existingNote
      ? existingNote + "\n" + imageInfo
      : imageInfo

    const finalFormData = new FormData(e.currentTarget)
    finalFormData.delete("images")
    finalFormData.set("request_note", noteWithImages)

    const res = await addAiTaskAction(finalFormData)
    setState(res)
    setPending(false)
    if (res.success) {
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
          Tipo de tarea
        </label>
        <select
          name="service_category"
          className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
          required
        >
          <option value="">Selecciona un tipo…</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {AI_TASK_LABEL[c]}
            </option>
          ))}
        </select>
        {categories.length === 0 && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            No tienes servicios contratados activos para asignar tareas.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
          Nota para el equipo (opcional)
        </label>
        <textarea
          name="request_note"
          rows={3}
          placeholder="Por ejemplo: preferencias de tono, producto/servicio concreto, etc."
          className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 resize-none"
        />
        {quotaExhausted && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 font-medium">
            El cupo de tareas gratis está agotado. Tu tarea entrará en la lista de
            espera y se procesará en cuanto se reactive el cupo.
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
          Imágenes para la IA (opcional)
        </label>
        <p className="text-xs mb-2" style={{ color: "var(--color-muted-foreground)" }}>
          Sube imágenes (logo, fotos de producto, banners) que la IA usará al generar contenido.
        </p>
        <input
          type="file"
          name="images"
          multiple
          className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm cursor-pointer bg-[var(--color-muted)] focus:outline-none transition-all duration-200"
          accept="image/*"
        />
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-medium">
          {state.error}
        </div>
      )}
      {state?.success && !state.waiting && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
          {state.message || "Tarea en cola. Se procesará enseguida."}
        </div>
      )}
      {state?.success && state.waiting && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 font-medium">
          {state.message ||
            "Tarea añadida a la lista de espera. Se procesará cuando se reactive el cupo."}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || categories.length === 0}
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Asignar tarea"}
      </button>
    </form>
  )
}
