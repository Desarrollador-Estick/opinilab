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

    const fd = new FormData()
    fd.set("tool_type", form.tool_type)
    fd.set("tool_name", form.tool_name)
    fd.set("url", form.url)
    fd.set("username", form.username)
    fd.set("password_enc", form.password_enc)
    fd.set("notes", form.notes)

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
    setForm({ ...form, image_files: Array.from(files) })
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      urls.push(URL.createObjectURL(files[i]))
    }
    setForm({ ...form, image_urls: [...form.image_urls, ...urls] })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
      >
        + Añadir herramienta
      </button>
    )
  }

  const field = "w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
  const label = "block text-sm font-medium mb-2"

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>
          Nueva herramienta
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            reset()
          }}
          className="text-sm font-medium hover:underline"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          ✕ Cerrar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label} style={{ color: "var(--color-foreground)" }}>Tipo</label>
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
          <label className={label} style={{ color: "var(--color-foreground)" }}>Nombre *</label>
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
          <label className={label} style={{ color: "var(--color-foreground)" }}>URL</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className={field}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className={label} style={{ color: "var(--color-foreground)" }}>Usuario</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className={field}
            placeholder="Ej: correo de la cuenta"
          />
        </div>
        <div>
          <label className={label} style={{ color: "var(--color-foreground)" }}>Contraseña</label>
          <input
            type="password"
            value={form.password_enc}
            onChange={(e) => setForm({ ...form, password_enc: e.target.value })}
            className={field}
            placeholder="Contraseña de acceso"
          />
        </div>
        <div>
          <label className={label} style={{ color: "var(--color-foreground)" }}>Notas</label>
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
        <label className={label} style={{ color: "var(--color-foreground)" }}>Imágenes para la herramienta (opcional)</label>
        <p className="text-xs mb-2" style={{ color: "var(--color-muted-foreground)" }}>
          Sube imágenes (capturas de pantalla, diseños, banners) que se asociarán a esta herramienta.
        </p>
        <input
          type="file"
          multiple
          className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm cursor-pointer bg-[var(--color-muted)] transition-all duration-200"
          accept="image/*"
          onChange={handleImageChange}
        />
        {form.image_urls.length > 0 && (
          <div className="mt-2 text-xs">
            {form.image_urls.slice(0, 3).map((u, i) => (
              <span key={i} className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 font-medium ml-1" style={{ color: "var(--color-primary)" }}>
                img {i + 1}
              </span>
            ))}
            {form.image_urls.length > 3 && (
              <span className="ml-1" style={{ color: "var(--color-muted-foreground)" }}>+{form.image_urls.length - 3} más</span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            reset()
          }}
          className="px-5 py-2.5 rounded-xl text-sm border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-all duration-200 font-medium"
          style={{ color: "var(--color-foreground)" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || !form.tool_name.trim()}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {busy ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  )
}
