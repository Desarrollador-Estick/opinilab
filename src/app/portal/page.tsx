import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"

export default async function PortalHomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/portal/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, full_name")
    .eq("id", user.id)
    .maybeSingle()

  // Seguridad en profundidad: solo clientes pueden estar aquí.
  if (!profile || profile.role !== "client" || !profile.client_id) {
    redirect("/dashboard")
  }

  const clientId = profile.client_id

  const [
    clientResult,
    contractsResult,
    invoicesResult,
    reportsResult,
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase
      .from("contracts")
      .select("id, title, contract_number, status, value, content, pdf_url, start_date, end_date")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, issue_date, due_date, payment_token, pdf_url")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id, title, report_type, status, period_start, period_end, pdf_url, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ])

  const client = clientResult.data
  const contracts = contractsResult.data ?? []
  const invoices = invoicesResult.data ?? []
  const reports = reportsResult.data ?? []

  const amountsDue = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  const pendingCount = invoices.filter(
    (inv) => inv.status === "sent" || inv.status === "overdue"
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Hola, {profile.full_name || client?.contact_name || "cliente"} 👋
        </h2>
        <p className="text-gray-500 mt-1">
          {client?.business_name || "Tu negocio"} · Bienvenido a tu portal
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Pendiente de pago</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">
            {formatCurrency(amountsDue)}
          </p>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {pendingCount} factura{pendingCount !== 1 ? "s" : ""} pendiente
              {pendingCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Contratos</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{contracts.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Informes</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{reports.length}</p>
        </div>
      </div>

      {/* Contratos */}
      <section className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-lg border-b pb-2 mb-4">📋 Mis contratos</h3>
        {contracts.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No hay contratos</p>
        ) : (
          <div className="space-y-2">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex flex-wrap items-center justify-between p-3 bg-gray-50 rounded-lg gap-2"
              >
                <div>
                  <p className="font-medium text-sm">{contract.title}</p>
                  <p className="text-xs text-gray-500">
                    {contract.contract_number} ·{" "}
                    {formatDate(contract.start_date)}
                    {contract.end_date ? ` → ${formatDate(contract.end_date)}` : ""}
                  </p>
                  {contract.content && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-line line-clamp-3">
                      {contract.content}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">
                    {formatCurrency(contract.value)}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}
                  >
                    {contract.status}
                  </span>
                  {contract.pdf_url && (
                    <a
                      href={contract.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Descargar PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Facturas */}
      <section className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-lg border-b pb-2 mb-4">💳 Mis facturas</h3>
        {invoices.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No hay facturas</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => {
              const payable = invoice.status === "sent" || invoice.status === "overdue"
              return (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between p-3 bg-gray-50 rounded-lg gap-2"
                >
                  <div>
                    <p className="font-medium text-sm">{invoice.invoice_number}</p>
                    <p className="text-xs text-gray-500">
                      Emitida el {formatDate(invoice.issue_date)}
                      {invoice.due_date && ` · Vence el ${formatDate(invoice.due_date)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">
                      {formatCurrency(invoice.total)}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
                    >
                      {invoice.status}
                    </span>
                    {payable && invoice.payment_token ? (
                      <Link
                        href={`/pagar/${invoice.payment_token}`}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                      >
                        Pagar ahora
                      </Link>
                    ) : null}
                    {invoice.pdf_url && (
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Evolución: informes */}
      <section className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-lg border-b pb-2 mb-4">📈 Mi evolución e informes</h3>
        {reports.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            Aún no hay informes disponibles
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between p-3 bg-gray-50 rounded-lg gap-2"
              >
                <div>
                  <p className="font-medium text-sm">{report.title}</p>
                  <p className="text-xs text-gray-500">
                    {report.report_type}
                    {report.period_start && report.period_end
                      ? ` · ${formatDate(report.period_start)} → ${formatDate(report.period_end)}`
                      : ""}{" "}
                    · {formatDate(report.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status === "sent" ? "paid" : report.status === "generated" ? "active" : "draft")}`}
                  >
                    {report.status}
                  </span>
                  {report.pdf_url && (
                    <a
                      href={report.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Ver informe
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!client && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
          No se encontró la ficha de tu negocio. Contacta con tu agencia.
        </div>
      )}
    </div>
  )
}
