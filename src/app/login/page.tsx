"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Determinar el rol para enviar a /dashboard (agencia) o /portal (cliente).
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .maybeSingle()

    const role = profile?.role ?? "client"

    // --- 2FA / MFA (solo roles de agencia) ---
    if (role && role !== "client") {
      let mfaEnabled = false
      try {
        const res = await fetch("/api/auth/mfa/status")
        const json = await res.json()
        mfaEnabled = Boolean(json.enabled)
      } catch {
        mfaEnabled = false
      }
      if (mfaEnabled) {
        router.push("/login/mfa")
        router.refresh()
        return
      }
      // manager/member sin 2FA: entran directo (siguen el flujo normal de abajo).
    }

    // Respetar la URL de origen si el rol lo permite.
    const params = new URLSearchParams(window.location.search)
    const redirectedFrom = params.get("redirectedFrom")
    if (redirectedFrom) {
      const clientArea = redirectedFrom.startsWith("/portal")
      const isClient = role === "client"
      if (clientArea === isClient) {
        router.push(redirectedFrom)
        router.refresh()
        return
      }
    }

    if (role === "client") {
      router.push("/portal")
    } else {
      router.push("/dashboard")
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            🚀 Agencia Marketing
          </Link>
          <p className="text-gray-500 mt-2">Inicia sesión en tu panel</p>
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            ¿Acceso de cliente? Tu cuenta la crea tu agencia.
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Volver a la web
          </Link>
        </div>
      </div>
    </div>
  )
}
