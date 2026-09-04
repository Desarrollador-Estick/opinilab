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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2
          className="text-3xl md:text-4xl font-extrabold tracking-tight"
          style={{ color: "var(--color-foreground)" }}
        >
          Hola, {profile.full_name || client?.contact_name || "cliente"} 👋
        </h2>
        <p className="text-lg mt-2" style={{ color: "var(--color-muted-foreground)" }}>
          {client?.business_name || "Tu negocio"} · Bienvenido a tu portal
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-200 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-lg">💰</span>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>
              Pendiente de pago
            </p>
          </div>
          <p
            className="text-3xl font-extrabold"
            style={{ color: "var(--color-primary)" }}
          >
            {formatCurrency(amountsDue)}
          </p>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              {pendingCount} factura{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-200 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-lg">📋</span>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>
              Contratos
            </p>
          </div>
          <p
            className="text-3xl font-extrabold"
            style={{ color: "var(--color-primary)" }}
          >
            {contracts.length}
          </p>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-200 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-white text-lg">📈</span>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>
              Informes
            </p>
          </div>
          <p
            className="text-3xl font-extrabold"
            style={{ color: "var(--color-primary)" }}
          >
            {reports.length}
          </p>
        </div>
      </div>

      {/* Contratos */}
      <section className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>
            📋 Mis contratos
          </h3>
        </div>
        <div className="p-6">
          {contracts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--color-muted-foreground)" }}>
              No hay contratos
            </p>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex flex-wrap items-center justify-between p-4 rounded-xl border border-[var(--color-border)] hover:border-blue-200 hover:shadow-md transition-all duration-300 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                      {contract.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                      {contract.contract_number} · {formatDate(contract.start_date)}
                      {contract.end_date ? ` → ${formatDate(contract.end_date)}` : ""}
                    </p>
                    {contract.content && (
                      <p className="text-xs mt-1 whitespace-pre-line line-clamp-2" style={{ color: "var(--color-muted-foreground)" }}>
                        {contract.content}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>
                      {formatCurrency(contract.value)}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}
                    >
                      {contract.status}
                    </span>
                    {contract.pdf_url && (
                      <a
                        href={contract.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        PDF ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Facturas */}
      <section className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>
            💳 Mis facturas
          </h3>
        </div>
        <div className="p-6">
          {invoices.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--color-muted-foreground)" }}>
              No hay facturas
            </p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const payable = invoice.status === "sent" || invoice.status === "overdue"
                return (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between p-4 rounded-xl border border-[var(--color-border)] hover:border-blue-200 hover:shadow-md transition-all duration-300 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                        {invoice.invoice_number}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                        Emitida el {formatDate(invoice.issue_date)}
                        {invoice.due_date && ` · Vence el ${formatDate(invoice.due_date)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>
                        {formatCurrency(invoice.total)}
                      </span>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
                      >
                        {invoice.status}
                      </span>
                      {payable && invoice.payment_token ? (
                        <Link
                          href={`/pagar/${invoice.payment_token}`}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                          Pagar ↗
                        </Link>
                      ) : null}
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium hover:underline"
                          style={{ color: "var(--color-primary)" }}
                        >
                          PDF ↗
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Evolución */}
      <section className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>
            📈 Mi evolución e informes
          </h3>
        </div>
        <div className="p-6">
          {reports.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--color-muted-foreground)" }}>
              Aún no hay informes disponibles
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-wrap items-center justify-between p-4 rounded-xl border border-[var(--color-border)] hover:border-blue-200 hover:shadow-md transition-all duration-300 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                      {report.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                      {report.report_type}
                      {report.period_start && report.period_end
                        ? ` · ${formatDate(report.period_start)} → ${formatDate(report.period_end)}`
                        : ""}{" "}
                      · {formatDate(report.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status === "sent" ? "paid" : report.status === "generated" ? "active" : "draft")}`}
                    >
                      {report.status}
                    </span>
                    {report.pdf_url && (
                      <a
                        href={report.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        Ver informe ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {!client && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-2xl text-sm font-medium">
          No se encontró la ficha de tu negocio. Contacta con tu agencia.
        </div>
      )}
    </div>
  )
}
