"use client"

import { useActionState } from "react"
import { changePasswordAction, type ChangePasswordState } from "./actions"

export default function CambiarPasswordPage() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    {}
  )

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl border shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900">Crea tu contraseña nueva</h2>
        <p className="text-gray-500 mt-1">
          Como es tu primer acceso, necesitas elegir una contraseña personal
          antes de usar el portal.
        </p>

        {state.success && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ Contraseña actualizada. Redirigiendo al portal...
          </div>
        )}
        {state.error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              name="new_password"
              required
              minLength={8}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Confirma la nueva contraseña
            </label>
            <input
              type="password"
              name="confirm_password"
              required
              minLength={8}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Repite la contraseña"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Guardar contraseña
          </button>
        </form>
      </div>
    </div>
  )
}
