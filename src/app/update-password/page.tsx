"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState("")
  const [invalid, setInvalid] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    async function handleRecovery() {
      const code = searchParams.get("code")
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code)
        } catch {
          setInvalid(true)
          setChecking(false)
          return
        }
      }

      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        setInvalid(true)
      }
      setChecking(false)
    }
    handleRecovery()
  }, [searchParams, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Las contraseñas no coinciden")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)
    setError("")

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/login")
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
      </div>

      {/* Update Card */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-md mx-auto mt-8 mb-16 overflow-hidden">
        <div className="p-8 text-center">
          {checking ? (
            <p className="text-gray-500 text-sm py-8">Comprobando enlace...</p>
          ) : invalid ? (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Enlace no válido
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Este enlace ha caducado o ya ha sido usado. Solicita un nuevo enlace
                para restablecer tu contraseña.
              </p>
              <a
                href="/forgot-password"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
              >
                Recuperar contraseña
              </a>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Nueva contraseña
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Elige una contraseña nueva para tu cuenta.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar contraseña"}
                </button>
              </form>
            </>
          )}
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