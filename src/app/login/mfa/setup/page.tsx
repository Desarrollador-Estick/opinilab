"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginMfaSetupPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const router = useRouter()

  const startSetup = async () => {
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/mfa/setup", { method: "POST" })
    const json = await res.json()
    if (!json.success) {
      setError(json.error || "No se pudo iniciar la configuración.")
      setLoading(false)
      return
    }
    setQrDataUrl(json.qrDataUrl)
    setRecoveryCodes(json.recoveryCodes)
    setLoading(false)
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/mfa/verify", {
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
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border p-6 shadow-sm text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-semibold text-gray-800">2FA activado</h2>
            <p className="text-sm text-gray-600 mt-2">
              Ya puedes acceder al panel de administración.
            </p>
            <button
              onClick={() => {
                router.push("/dashboard")
                router.refresh()
              }}
              className="mt-5 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Ir al panel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🚀 Agencia Marketing</h1>
          <p className="text-gray-500 mt-2">Configura la verificación en dos pasos</p>
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {!qrDataUrl ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Por seguridad, el administrador debe activar la verificación en dos pasos (2FA)
                antes de usar el panel. Escanea el código QR con tu aplicación de autenticación
                (Google Authenticator, Authy, 1Password…).
              </p>
              <button
                onClick={startSetup}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Generando..." : "Comenzar configuración"}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Código QR para 2FA" className="rounded-lg border" />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Códigos de respaldo</p>
                <p className="text-xs text-gray-500 mb-2">
                  Guárdalos en un lugar seguro. Solo se muestran una vez. Sirven para entrar si
                  pierdes el acceso a tu aplicación de autenticación.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((c) => (
                    <code
                      key={c}
                      className="bg-gray-100 rounded px-2 py-1 text-xs font-mono text-center"
                    >
                      {c}
                    </code>
                  ))}
                </div>
              </div>

              <form onSubmit={confirm} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm tracking-widest text-center text-lg"
                  placeholder="Código de 6 dígitos"
                  required
                />
                <button
                  type="submit"
                  disabled={loading || code.trim().length < 6}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Verificando..." : "Activar 2FA"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
