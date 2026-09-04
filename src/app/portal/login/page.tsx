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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)" }}
    >
      {/* Decorative blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/30">
            <span className="text-white font-extrabold text-2xl">O</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            OpiniLab
          </h1>
          <p className="text-blue-200/60 mt-1 font-medium">Portal de cliente</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-100/80 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-200/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all duration-200"
                placeholder="tu@empresa.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100/80 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-200/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all duration-200"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-gray-900 py-3 rounded-xl font-semibold text-base hover:bg-gray-50 transition-all duration-300 shadow-2xl shadow-white/10 disabled:opacity-50"
            >
              {loading ? "Accediendo..." : "Acceder al portal"}
            </button>
          </form>

          <p className="mt-6 text-xs text-blue-200/40 text-center">
            Si no tienes acceso, contacta con tu agencia.
          </p>
        </div>
      </div>
    </div>
  )
}
