"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginMfaPage() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/mfa/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    })
    const json = await res.json()

    if (!json.success) {
      setError(json.error || "Código inválido.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🚀 Agencia Marketing</h1>
          <p className="text-gray-500 mt-2">Verificación en dos pasos</p>
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <p className="text-sm text-gray-600 mb-4">
            Abre tu aplicación de autenticación (Google Authenticator, Authy, 1Password…) e
            introduce el código de 6 dígitos, o un código de respaldo.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Código</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm tracking-widest text-center text-lg"
                placeholder="••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.trim().length < 6}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Verificar"}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link href="/auth/logout" className="text-sm text-gray-500 hover:text-gray-700">
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
