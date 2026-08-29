"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function PortalLoginPage() {
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

    // Determinar rol: clientes van al portal; agencia al dashboard.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .maybeSingle()

    const role = profile?.role ?? "client"

    const params = new URLSearchParams(window.location.search)
    const redirectedFrom = params.get("redirectedFrom")
    if (redirectedFrom && redirectedFrom.startsWith("/portal")) {
      router.push(redirectedFrom)
    } else if (role === "client") {
      router.push("/portal")
    } else {
      router.push("/dashboard")
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold text-gray-900">OpiniLab</h1>
          <p className="text-gray-500 mt-1">Portal de cliente</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
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
                className="w-full border rounded-xl px-4 py-2 text-sm"
                placeholder="tu@empresa.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl px-4 py-2 text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {loading ? "Accediendo..." : "Acceder al portal"}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400 text-center">
            Si no tienes acceso, contacta con tu agencia.
          </p>
        </div>
      </div>
    </div>
  )
}
