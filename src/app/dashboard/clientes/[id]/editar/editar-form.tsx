"use client"

import { useActionState } from "react"
import Link from "next/link"
import { updateClientAction } from "../../actions"
import type { Database } from "@/types/database"

type ClientRow = Database["public"]["Tables"]["clients"]["Row"]

export default function EditarClienteForm({ client }: { client: ClientRow }) {
  const [state, formAction] = useActionState<{ error?: string }, FormData>(
    async (_prev, formData) => {
      const res = await updateClientAction(client.id, formData)
      return res ?? {}
    },
    {}
  )

  const statusValue = (client.status as string) || "active"

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">
          Información del Negocio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Negocio *
            </label>
            <input
              name="business_name"
              required
              defaultValue={client.business_name}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de Contacto *
            </label>
            <input
              name="contact_name"
              required
              defaultValue={client.contact_name ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              name="email"
              type="email"
              required
              defaultValue={client.email ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              name="phone"
              type="tel"
              defaultValue={client.phone ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sitio Web
            </label>
            <input
              name="website"
              type="url"
              defaultValue={client.website ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIF/CIF
            </label>
            <input
              name="nif_cif"
              defaultValue={client.nif_cif ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Dirección</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              name="address"
              defaultValue={client.address ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad
            </label>
            <input
              name="city"
              defaultValue={client.city ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provincia
            </label>
            <input
              name="province"
              defaultValue={client.province ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Postal
            </label>
            <input
              name="postal_code"
              defaultValue={client.postal_code ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Maps URL
            </label>
            <input
              name="google_maps_url"
              type="url"
              defaultValue={client.google_maps_url ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">
          Detalles Comerciales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industria
            </label>
            <input
              name="industry"
              defaultValue={client.industry ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Presupuesto Mensual (€)
            </label>
            <input
              name="monthly_budget"
              type="number"
              min="0"
              step="0.01"
              defaultValue={client.monthly_budget ?? 0}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fuente del Lead
            </label>
            <select
              name="lead_source"
              defaultValue={client.lead_source ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              <option value="google_maps">Google Maps</option>
              <option value="referral">Referido</option>
              <option value="website">Sitio Web</option>
              <option value="cold_outreach">Contacto Frío</option>
              <option value="social">Redes Sociales</option>
              <option value="directory">Directorio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="status"
              defaultValue={statusValue}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="active">Activo</option>
              <option value="prospect">Prospecto</option>
              <option value="paused">Pausado</option>
              <option value="churned">Churned (Perdido)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Link
          href={`/dashboard/clientes/${client.id}`}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Guardar Cambios
        </button>
      </div>
    </form>
  )
}
