"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addClientToolAction } from "./actions"
import { TOOL_TYPE_OPTIONS, TOOL_TYPE_LABEL } from "./constants"

export function AddToolForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    tool_type: "gbp",
    tool_name: "",
    url: "",
    username: "",
    password_enc: "",
    notes: "",
    image_urls: [] as string[],
    image_files: [] as File[],
  })

  function reset() {
    setForm({
      tool_type: "gbp",
      tool_name: "",
      url: "",
      username: "",
      password_enc: "",
      notes: "",
      image_urls: [],
      image_files: [],
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError("")

    // 1) Preparar el FormData para la acción
    const fd = new FormData()
    fd.set("tool_type", form.tool_type)
    fd.set("tool_name", form.tool_name)
    fd.set("url", form.url)
    fd.set("username", form.username)
    fd.set("password_enc", form.password_enc)
    fd.set("notes", form.notes)

    // 2) Añadir las URLs de imagen (que ya vienen del state) al field notes
    const imagesTag = form.image_urls.length > 0 ? `---IMAGES---${form.image_urls.join("; ")}` : ""
    fd.set("notes", `${form.notes}${form.notes ? " " : ""}${imagesTag}`)

    const result = await addClientToolAction(clientId, fd)
    if (result?.error) {
      setError(result.error)
      setBusy(false)
      return
    }
    reset()
    setOpen(false)
    setBusy(false)
    router.refresh()
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files as FileList
    if (!files || files.length === 0) return
    // Guardamos los archivos en state
    setForm({ ...form, image_files: Array.from(files) })
    // Crear URLs temporales para preview
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      urls.push(URL.createObjectURL(files[i]))
    }
    // Añadir las nuevas URLs al state sin borrar las anteriores
    setForm({ ...form, image_urls: [...form.image_urls, ...urls] })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
      >
        + Añadir herramienta
      </button>
    )
  }

  const field = "w-full border rounded-lg px-3 py-2 text-sm"
  const label = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Nueva herramienta</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            reset()
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ✕ Cerrar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Tipo</label>
          <select
            value={form.tool_type}
            onChange={(e) => setForm({ ...form, tool_type: e.target.value })}
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
            value={form.tool_name}
            onChange={(e) => setForm({ ...form, tool_name: e.target.value })}
            className={field}
            placeholder="Ej: Perfil de Google de MiNegocio"
            required
          />
        </div>
        <div>
          <label className={label}>URL</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className={field}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className={label}>Usuario</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className={field}
            placeholder="Ej: correo de la cuenta"
          />
        </div>
        <div>
          <label className={label}>Contraseña</label>
          <input
            type="password"
            value={form.password_enc}
            onChange={(e) => setForm({ ...form, password_enc: e.target.value })}
            className={field}
            placeholder="Contraseña de acceso"
          />
        </div>
        <div>
          <label className={label}>Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={field}
            placeholder="Cualquier dato adicional que necesitemos"
          />
        </div>
      </div>

      <div>
        <label className={label}>Imágenes para la herramienta (opcional)</label>
        <p className="text-xs text-gray-500 mb-1">
          Sube imágenes (capturas de pantalla, diseños, banners) que se asociarán a esta herramienta. Se guardarán en el registro junto con las notas.
        </p>
        <input
          type="file"
          multiple
          className="w-full border rounded-lg px-3 py-2 text-sm cursor-pointer bg-gray-50 select-none"
          accept="image/*"
          onChange={handleImageChange}
        />
        {form.image_urls.length > 0 && (
          <div className="mt-2 text-xs">
            {form.image_urls.slice(0, 3).map((u, i) => (
              <span key={i} className="bg-gray-200 rounded px-2 py-1 text-indigo-600 ml-1">
                img {i + 1}
              </span>
            ))}
            {form.image_urls.length > 3 && (
              <span className="text-gray-500 ml-1">+{form.image_urls.length - 3} más</span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            reset()
          }}
          className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || !form.tool_name.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  )
}