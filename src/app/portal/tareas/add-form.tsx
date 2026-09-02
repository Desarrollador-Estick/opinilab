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

    // 1) Obtener información de las imágenes subidas (nombres y tipos)
    const files = formData.getAll("images") as File[]
    let imageInfo: string = ""
    if (files.length > 0) {
      const infoParts: string[] = []
      for (const file of files) {
        infoParts.push(`${file.name} (${file.type || "image"})`)
      }
      imageInfo = "IMAGES: " + infoParts.join("; ")
    }

    // 2) Añadir la info de imágenes al request_note (sobreescribe o concatena)
    const existingNote = formData.get("request_note") as string || ""
    const noteWithImages = existingNote
      ? existingNote + "\n" + imageInfo
      : imageInfo

    // 3) Preparar formData final: quitar images y forzar request_note con la info
    const finalFormData = new FormData(e.currentTarget)
    finalFormData.delete("images")
    finalFormData.set("request_note", noteWithImages)

    // 4) Llamar a la acción
    const res = await addAiTaskAction(finalFormData)
    setState(res)
    setPending(false)
    if (res.success) {
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de tarea
        </label>
        <select
          name="service_category"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
          <p className="text-xs text-amber-700 mt-1">
            No tienes servicios contratados activos para asignar tareas.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nota para el equipo (opcional)
        </label>
        <textarea
          name="request_note"
          rows={3}
          placeholder="Por ejemplo: preferencias de tono, producto/servicio concreto, etc."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        {quotaExhausted && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            El cupo de tareas gratis está agotado. Tu tarea entrará en la lista de
            espera y se procesará en cuanto se reactive el cupo.
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Imágenes para la IA (opcional)
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Sube imágenes (logo, fotos de producto, banners) que la IA usará al generar
          contenido para el servicio seleccionado. Puedes subir varias a la vez.
        </p>
        <input
          type="file"
          name="images"
          multiple
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer bg-gray-50 select-none"
          accept="image/*"
        />
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && !state.waiting && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {state.message || "Tarea en cola. Se procesará enseguida."}
        </div>
      )}
      {state?.success && state.waiting && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          {state.message ||
            "Tarea añadida a la lista de espera. Se procesará cuando se reactive el cupo."}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || categories.length === 0}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
      >
        {pending ? "Enviando…" : "Asignar tarea"}
      </button>
    </form>
  )
}