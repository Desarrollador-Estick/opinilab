import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  getClient,
  getClientServices,
  getInvoices,
  getContracts,
  getReviews,
} from "@/lib/supabase/queries"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { DeleteClientButton } from "./delete-button"
import { CreateClientAccountButton } from "./create-client-account-button"
import { ServicesPanel } from "./services-panel"

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client, error } = await getClient(supabase, id)
  if (error || !client) notFound()

  const [
    servicesResult,
    invoicesResult,
    contractsResult,
    reviewsResult,
  ] = await Promise.all([
    getClientServices(supabase, id),
    getInvoices(supabase, id),
    getContracts(supabase, id),
    getReviews(supabase, id),
  ])

  const services = servicesResult.data ?? []
  const invoices = invoicesResult.data ?? []
  const contracts = contractsResult.data ?? []
  const reviews = reviewsResult.data ?? []

  const { data: catalogResult } = await supabase
    .from("services")
    .select("id, name, category, base_price, billing_cycle")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true })
  const catalog = catalogResult ?? []

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  const { data: linkedAccount } = await supabase
    .from("profiles")
    .select("email, created_at")
    .eq("client_id", id)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/clientes"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Volver a clientes
          </Link>
          <h2 className="text-2xl font-bold mt-2">{client.business_name}</h2>
          <p className="text-gray-500">{client.contact_name} · {client.email}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Link
              href={`/dashboard/clientes/${client.id}/pagar`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
            >
              💳 Cobrar
            </Link>
            <Link
              href={`/dashboard/clientes/${client.id}/editar`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition"
            >
              Editar
            </Link>
            <DeleteClientButton clientId={client.id} />
          </div>
          {linkedAccount ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs">
              <span>✓ Portal activo</span>
              <span className="text-emerald-500">·</span>
              <span className="font-medium">{linkedAccount.email}</span>
            </div>
          ) : (
            <CreateClientAccountButton clientId={client.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Estado</p>
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(client.status)}`}
          >
            {client.status}
          </span>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Presupuesto Mensual</p>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(client.monthly_budget)}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Facturación Total</p>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Reseñas</p>
          <p className="text-xl font-bold mt-1">{reviews.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-lg border-b pb-2 mb-4">
          Información del Negocio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Teléfono" value={client.phone} />
          <InfoRow label="Sitio Web" value={client.website} link />
          <InfoRow label="NIF/CIF" value={client.nif_cif} />
          <InfoRow label="Dirección" value={client.address} />
          <InfoRow label="Ciudad" value={client.city} />
          <InfoRow label="Provincia" value={client.province} />
          <InfoRow label="Código Postal" value={client.postal_code} />
          <InfoRow label="Industria" value={client.industry} />
          <InfoRow label="Fuente del Lead" value={client.lead_source} />
          <InfoRow label="Google Maps" value={client.google_maps_url} link />
          <InfoRow
            label="Cliente desde"
            value={formatDate(client.created_at)}
          />
          {client.notes && (
            <div className="md:col-span-2">
              <p className="text-gray-500 text-xs mb-1">Notas</p>
              <p className="text-gray-700">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServicesPanel clientId={client.id} services={services} catalog={catalog} />

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Facturas</h3>
            <Link
              href={`/dashboard/facturas/nueva?client_id=${client.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              + Crear factura
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">
              Sin facturas
            </p>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {inv.invoice_number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(inv.issue_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatCurrency(inv.total)}
                    </p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Contratos</h3>
            <Link
              href={`/dashboard/contratos/nuevo?client_id=${client.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              + Crear contrato
            </Link>
          </div>
          {contracts.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">
              Sin contratos
            </p>
          ) : (
            <div className="space-y-2">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{contract.title}</p>
                    <p className="text-xs text-gray-500">
                      {contract.contract_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatCurrency(contract.value)}
                    </p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}
                    >
                      {contract.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Reseñas</h3>
          </div>
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">
              Sin reseñas
            </p>
          ) : (
            <div className="space-y-2">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {review.reviewer_name || "Anónimo"}
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-sm ${star <= (review.rating ?? 0) ? "text-yellow-400" : "text-gray-300"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {review.review_text}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {review.platform} ·{" "}
                    {review.review_date ? formatDate(review.review_date) : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  link,
}: {
  label: string
  value: string | null
  link?: boolean
}) {
  if (!value) return null
  return (
    <div>
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm break-all"
        >
          {value}
        </a>
      ) : (
        <p className="text-gray-700 text-sm">{value}</p>
      )}
    </div>
  )
}
