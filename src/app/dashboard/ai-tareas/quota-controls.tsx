"use client"

import { useState } from "react"
import {
  reactivateQuotaAction,
  updateQuotaAction,
  processNowAction,
  AiTasksAdminState,
} from "./actions"

export function QuotaControls({ quota }: { quota: number }) {
  const [state, setState] = useState<AiTasksAdminState | null>(null)
  const [pending, setPending] = useState<"quota" | "reactivate" | "process" | null>(null)

  async function run(
    key: "quota" | "reactivate" | "process",
    fn: () => Promise<AiTasksAdminState>
  ) {
    setPending(key)
    const res = await fn()
    setState(res)
    setPending(null)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Control de cupo</h3>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {state.message}
        </div>
      )}

      <form
        action={async (formData) => {
          await run("quota", () => updateQuotaAction(formData))
        }}
        className="flex items-end gap-3"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cupo total de tareas gratis
          </label>
          <input
            type="number"
            name="quota"
            min={0}
            defaultValue={quota}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending === "quota"}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Guardar cupo
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run("reactivate", reactivateQuotaAction)}
          disabled={pending === "reactivate"}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {pending === "reactivate" ? "Reactivando…" : "Reactivar cupo (vaciar espera)"}
        </button>
        <button
          type="button"
          onClick={async () =>
            run("process", async () => {
              const res = await processNowAction()
              return res
            })
          }
          disabled={pending === "process"}
          className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {pending === "process" ? "Procesando…" : "Procesar ahora"}
        </button>
      </div>
    </div>
  )
}
