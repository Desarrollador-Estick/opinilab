"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientAccountAction } from "../account-actions"

export function CreateClientAccountButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const formData = new FormData()
    formData.set("client_id", clientId)
    formData.set("email", email)
    formData.set("full_name", fullName)

    const result = await createClientAccountAction({}, formData)
    setLoading(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    setEmail("")
    setFullName("")
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition"
        >
          👤 Crear acceso de cliente
        </button>
      ) : (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Crear cuenta de cliente</h4>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              ✓ Cuenta creada. Le hemos enviado por email una contraseña temporal. Al
              entrar por primera vez deberá crear una nueva.
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre (opcional)</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Nombre del contacto"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email de acceso</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="cliente@empresa.com"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Se generará una contraseña temporal aleatoria que enviaremos por email al
              cliente. No se muestra en pantalla.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear acceso"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
