import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getClients } from "@/lib/supabase/queries"
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils"
import { SearchFilters } from "./search-filters"

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: clients } = await getClients(
    supabase,
    params.search,
    params.status
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-gray-500">
            {clients?.length ?? 0} clientes registrados
          </p>
        </div>
        <Link
          href="/dashboard/clientes/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>➕</span> Nuevo Cliente
        </Link>
      </div>

      <SearchFilters />

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Negocio
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Contacto
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Email
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Ciudad
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Presupuesto
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Desde
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!clients || clients.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  <div className="space-y-2">
                    <p className="text-4xl">👥</p>
                    <p>No hay clientes</p>
                    <Link
                      href="/dashboard/clientes/nuevo"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Añadir primer cliente →
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clientes/${client.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {client.business_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.contact_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.city || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(client.monthly_budget)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(client.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clientes/${client.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
