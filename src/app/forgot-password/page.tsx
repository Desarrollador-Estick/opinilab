"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const redirectTo = `${window.location.origin}/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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

      {/* Reset Card */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-md mx-auto mt-8 overflow-hidden">
        <div className="p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Recuperar contraseña
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {sent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Email enviado</p>
              <p>
                Si {email} existe, recibirás un enlace para restablecer tu contraseña.
                Revisa también tu carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-400">
              ← Volver al inicio de sesión
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