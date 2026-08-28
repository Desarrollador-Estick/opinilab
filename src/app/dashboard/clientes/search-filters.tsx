"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

export function SearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")

  function applyFilters(newSearch: string, newStatus: string) {
    const params = new URLSearchParams()
    if (newSearch) params.set("search", newSearch)
    if (newStatus && newStatus !== "all") params.set("status", newStatus)

    startTransition(() => {
      router.push(`/dashboard/clientes?${params.toString()}`)
    })
  }

  return (
    <div className="bg-white rounded-xl border p-4 flex gap-4">
      <input
        type="text"
        placeholder="Buscar por nombre, email o ciudad..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") applyFilters(search, status)
        }}
        className="flex-1 border rounded-lg px-4 py-2 text-sm"
      />
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value)
          applyFilters(search, e.target.value)
        }}
        className="border rounded-lg px-4 py-2 text-sm"
      >
        <option value="all">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="paused">Pausados</option>
        <option value="churned">Dados de baja</option>
        <option value="prospect">Prospectos</option>
      </select>
      <button
        onClick={() => applyFilters(search, status)}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Buscando..." : "Buscar"}
      </button>
    </div>
  )
}
