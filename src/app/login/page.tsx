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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="py-12 px-4 max-w-4xl mx-auto text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2">
          OpiniLab
        </h1>
        <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
          Potencia tu negocio con IA. Más reseñas, mejor visibilidad y más clientes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-auto mb-12">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-4xl font-bold text-white">+38</div>
            <p className="text-sm text-gray-300 mt-1">nuevos clientes/mes</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-4xl font-bold text-white">+23%</div>
            <p className="text-sm text-gray-300 mt-1">de crecimiento en reseñas</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-4xl font-bold text-white">4.9</div>
            <p className="text-sm text-gray-300 mt-1">estrellas Google</p>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-md mx-auto mt-12 overflow-hidden">
        <div className="p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Inicia sesión
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Inicia sesión en tu panel para gestionar tu negocio
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-blue-600 hover:text-blue-400"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>

      {/* Footer link section */}
      <div className="bg-gray-800 py-6 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-300 text-sm mb-4">
            OpiniLab — Agencia de marketing digital. Gestionamos las reseñas de tu
            negocio en Google, tus redes sociales, tu SEO y tus anuncios para que tu
            negocio crezca.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/servicios" className="text-gray-300 hover:text-blue-300 text-sm font-medium underline">
              Servicios
            </a>
            <a href="#contacto" className="text-gray-300 hover:text-blue-300 text-sm font-medium underline">
              Contacto
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            © 2026 OpiniLab. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}