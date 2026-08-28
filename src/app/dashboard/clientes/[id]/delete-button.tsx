"use client"

import { useRouter } from "next/navigation"
import { deleteClientAction } from "../actions"
import { useState } from "react"

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer.")) {
      return
    }

    setLoading(true)
    const result = await deleteClientAction(clientId)
    if (result?.error) {
      alert("Error al eliminar: " + result.error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-100 transition disabled:opacity-50"
    >
      {loading ? "Eliminando..." : "Eliminar"}
    </button>
  )
}
