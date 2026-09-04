"use client"

import { useActionState } from "react"
import { changePasswordAction, type ChangePasswordState } from "./actions"

export default function CambiarPasswordPage() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    {}
  )

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-sm p-8 hover:shadow-lg transition-shadow duration-300">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">🔐</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
              Crea tu contraseña
            </h2>
            <p className="text-sm mt-2" style={{ color: "var(--color-muted-foreground)" }}>
              Como es tu primer acceso, necesitas elegir una contraseña personal antes de usar el portal.
            </p>
          </div>

          {state.success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium mb-4">
              ✓ Contraseña actualizada. Redirigiendo al portal...
            </div>
          )}
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium mb-4">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                Nueva contraseña
              </label>
              <input
                type="password"
                name="new_password"
                required
                minLength={8}
                className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                Confirma la nueva contraseña
              </label>
              <input
                type="password"
                name="confirm_password"
                required
                minLength={8}
                className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                placeholder="Repite la contraseña"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
            >
              Guardar contraseña
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
