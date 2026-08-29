"use client"

import { useActionState } from "react"
import { createClientAction, type CreateClientState } from "../actions"
import Link from "next/link"

export default function NuevoClientePage() {
  const [state, formAction] = useActionState<CreateClientState, FormData>(
    createClientAction,
    {}
  )
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/clientes"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Volver a clientes
        </Link>
        <h2 className="text-2xl font-bold mt-2">Nuevo Cliente</h2>
        <p className="text-gray-500">Añade un nuevo cliente al sistema</p>
      </div>

      {state.accountCreated && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-800">
            ✓ Cliente creado con acceso al portal
          </p>
          <p className="mt-2 text-emerald-800">
            Usuario: <span className="font-semibold">{state.email}</span>
            <br />
            Contraseña:{" "}
            <span className="font-mono font-semibold">{state.generatedPassword}</span>
          </p>
          <p className="mt-2 text-emerald-700">
            Se ha enviado un email con estas credenciales al cliente.
          </p>
        </div>
      )}
      {state.success && !state.accountCreated && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">✓ Cliente creado correctamente</p>
          {state.accountNotice && (
            <p className="mt-1 text-emerald-700">{state.accountNotice}</p>
          )}
        </div>
      )}
      {state.error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <form action={formAction} className="space-y-6">
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
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Restaurante El Rincón"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Contacto *
              </label>
              <input
                name="contact_name"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Juan García"
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
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="info@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                name="phone"
                type="tel"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="+34 600 000 000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sitio Web
              </label>
              <input
                name="website"
                type="url"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="https://www.ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIF/CIF
              </label>
              <input
                name="nif_cif"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="B12345678"
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
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Calle Mayor 1, 2ºB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              <input
                name="city"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Madrid"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provincia
              </label>
              <input
                name="province"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Madrid"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Postal
              </label>
              <input
                name="postal_code"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="28001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps URL
              </label>
              <input
                name="google_maps_url"
                type="url"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="https://maps.google.com/..."
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
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Restauración, Salud, Legal..."
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
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuente del Lead
              </label>
              <select
                name="lead_source"
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
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="active">Activo</option>
                <option value="prospect">Prospecto</option>
                <option value="paused">Pausado</option>
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
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Notas adicionales sobre el cliente..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link
            href="/dashboard/clientes"
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Crear Cliente
          </button>
        </div>
      </form>
    </div>
  )
}
