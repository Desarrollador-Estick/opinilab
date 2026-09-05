import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  getDashboardStats,
  getRecentClients,
  getRecentLeads,
  getDashboardAutomationMetrics,
  getDashboardAlerts,
  getDashboardNextSteps,
  getDashboardTrend,
  getDashboardSystemStatus,
} from "@/lib/supabase/queries"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    statsResult,
    recentClientsResult,
    recentLeadsResult,
    automationMetrics,
    alerts,
    nextSteps,
    trend,
    systemStatus,
  ] = await Promise.all([
    getDashboardStats(supabase),
    getRecentClients(supabase),
    getRecentLeads(supabase),
    getDashboardAutomationMetrics(supabase),
    getDashboardAlerts(supabase),
    getDashboardNextSteps(supabase),
    getDashboardTrend(supabase),
    getDashboardSystemStatus(supabase),
  ])

  const stats = statsResult
  const recentClients = recentClientsResult.data ?? []
  const recentLeads = recentLeadsResult.data ?? []

  const totalAlerts =
    automationMetrics.unansweredReviews +
    alerts.staleLeads.length +
    alerts.overdueInvoices.length

  const [wonLeadsResult, allLeadsResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "won"),
    supabase.from("leads").select("id", { count: "exact", head: true }),
  ])
  const allLeads = allLeadsResult.count ?? 0
  const conversionRate =
    allLeads > 0 ? Math.round(((wonLeadsResult.count ?? 0) / allLeads) * 100) : 0
  const retentionRate =
    stats.totalClients > 0
      ? Math.round((stats.activeClients / stats.totalClients) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* 🔔 Alertas */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-amber-800">
            🔔 Alertas y Acciones
          </h3>
          {totalAlerts > 0 ? (
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {totalAlerts} alertas
            </span>
          ) : (
            <span className="text-xs text-amber-600">Sin alertas activas</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AlertItem
            icon="⚠️"
            text={
              automationMetrics.unansweredReviews > 0
                ? `${automationMetrics.unansweredReviews} reseñas sin responder`
                : "0 reseñas sin responder"
            }
            href="/dashboard/resenas"
            tone={
              automationMetrics.unansweredReviews > 0 ? "amber" : "neutral"
            }
          />
          <AlertItem
            icon="📧"
            text={
              alerts.staleLeads.length > 0
                ? `${alerts.staleLeads.length} leads sin follow-up (>3 días)`
                : "Sin leads sin follow-up"
            }
            href="/dashboard/leads"
            tone={alerts.staleLeads.length > 0 ? "amber" : "neutral"}
          />
          <AlertItem
            icon="💳"
            text={
              alerts.overdueInvoices.length > 0
                ? `${alerts.overdueInvoices.length} facturas vencidas`
                : "Sin facturas vencidas"
            }
            href="/dashboard/facturas"
            tone={alerts.overdueInvoices.length > 0 ? "red" : "neutral"}
          />
        </div>
      </div>

      {/* 📊 Resumen ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clientes"
          value={stats.totalClients.toString()}
          sub={`${stats.activeClients} activos este mes`}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Ingresos"
          value={formatCurrency(stats.monthlyRevenue)}
          sub="Mensuales"
          icon="💰"
          color="green"
        />
        <StatCard
          title="Leads"
          value={stats.activeLeads.toString()}
          sub={`+${automationMetrics.scrapedLeadsToday} scraper hoy`}
          icon="🎯"
          color="purple"
        />
        <StatCard
          title="Facturas"
          value={stats.pendingInvoices.toString()}
          sub="Pendientes"
          icon="📋"
          color="yellow"
        />
      </div>

      {/* 📈 Evolución + Métricas clave */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">📈 Evolución reciente</h3>
              <p className="text-xs text-gray-500">Últimos 30 días</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <LegendItem color="#3b82f6" label="Leads" />
              <LegendItem color="#10b981" label="Clientes" />
              <LegendItem color="#f59e0b" label="Facturas" />
            </div>
          </div>
          <TrendChart buckets={trend} />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold mb-4">🤖 Automatizaciones</h3>
            <div className="space-y-3">
              <MetricRow
                label="Leads capturados (scraper)"
                value={`${automationMetrics.scrapedLeadsToday}`}
                detail="hoy"
              />
              <MetricRow
                label="Emails enviados"
                value={`${automationMetrics.emailsSentToday}`}
                detail="hoy"
              />
              <MetricRow
                label="Tareas IA pendientes"
                value={`${automationMetrics.pendingAiTasks}`}
                detail={
                  automationMetrics.pendingAiTasks > 0
                    ? "en cola"
                    : "sin cola"
                }
              />
              <MetricRow
                label="Reseñas sin responder"
                value={`${automationMetrics.unansweredReviews}`}
                detail={
                  automationMetrics.unansweredReviews > 0
                    ? "requieren acción"
                    : "al día"
                }
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold mb-4">
              📊 Rendimiento general
            </h3>
            <div className="space-y-3">
              <MetricRow
                label="Conversión"
                value={`${conversionRate}%`}
                detail="leads ganados"
              />
              <MetricRow
                label="Retención"
                value={`${retentionRate}%`}
                detail="clientes activos"
              />
              <MetricRow
                label="Valoración media"
                value={
                  stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"
                }
                detail={`${stats.totalReviews} reseñas`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 Estado del sistema */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          🟢 Estado del sistema
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <SystemStatus
            label="Scraper"
            ok={systemStatus.scraper.enabled}
            detail={
              systemStatus.scraper.enabled
                ? systemStatus.scraper.lastRunDate
                  ? `última ejecución ${formatDate(systemStatus.scraper.lastRunDate)}`
                  : "sin ejecuciones aún"
                : "desactivado"
            }
          />
          <SystemStatus
            label="Stripe"
            ok
            detail={
              process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
                ? "modo LIVE"
                : "modo TEST"
            }
            warn={!process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")}
          />
          <SystemStatus
            label="IA"
            ok={Boolean(process.env.GROQ_API_KEY)}
            detail={
              automationMetrics.pendingAiTasks > 0
                ? `${automationMetrics.pendingAiTasks} tareas en cola`
                : "0 tareas en cola"
            }
          />
          <SystemStatus
            label="Email"
            ok={Boolean(process.env.RESEND_API_KEY)}
            detail={
              process.env.EMAIL_FROM
                ? process.env.EMAIL_FROM
                : "usando onboarding@resend.dev"
            }
            warn={!process.env.EMAIL_FROM}
          />
        </div>
      </div>

      {/* 📅 Próximos pasos */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Próximos pasos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {nextSteps.newLeads.length > 0 && (
            <NextStep
              icon="📞"
              text={
                <>
                  Llamar a:{" "}
                  <span className="font-medium">
                    {nextSteps.newLeads[0].business_name}
                  </span>
                </>
              }
              detail={
                nextSteps.newLeads[0].source === "auto_scraped"
                  ? "lead nuevo (scraper)"
                  : "lead nuevo"
              }
              href={`/dashboard/leads/${nextSteps.newLeads[0].id}`}
            />
          )}
          {nextSteps.pendingReports.length > 0 && (
            <NextStep
              icon="📄"
              text={
                <>
                  Enviar informe:{" "}
                  <span className="font-medium">
                    {reportClientName(nextSteps.pendingReports[0])}
                  </span>
                </>
              }
              detail={nextSteps.pendingReports[0].title}
              href="/dashboard/reportes"
            />
          )}
          {nextSteps.upcomingInvoices.length > 0 && (
            <NextStep
              icon="💰"
              text={
                <>
                  Cobrar a:{" "}
                  <span className="font-medium">
                    {invoiceClientName(nextSteps.upcomingInvoices[0])}
                  </span>
                </>
              }
              detail={
                nextSteps.upcomingInvoices[0].due_date
                  ? `vencimiento ${formatDate(nextSteps.upcomingInvoices[0].due_date.split("T")[0])}`
                  : "próximamente"
              }
              href="/dashboard/facturas"
            />
          )}
          {nextSteps.newLeads.length === 0 &&
            nextSteps.pendingReports.length === 0 &&
            nextSteps.upcomingInvoices.length === 0 && (
              <p className="text-gray-500 text-sm col-span-3 text-center py-4">
                No hay próximos pasos pendientes. ¡Todo en orden!
              </p>
            )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            href="/dashboard/clientes/nuevo"
            label="Nuevo Cliente"
            icon="➕"
          />
          <QuickAction href="/dashboard/leads" label="Captar Lead" icon="🎯" />
          <QuickAction
            href="/dashboard/facturas/nueva"
            label="Crear Factura"
            icon="📄"
          />
          <QuickAction
            href="/dashboard/marketing"
            label="Programar Post"
            icon="📱"
          />
        </div>
      </div>

      {/* Clientes / Leads recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Clientes Recientes</h3>
            <Link
              href="/dashboard/clientes"
              className="text-sm text-blue-600 hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay clientes aún</p>
          ) : (
            <div className="space-y-3">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/dashboard/clientes/${client.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {client.business_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {client.contact_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}
                    >
                      {client.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(client.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Leads Recientes</h3>
            <Link
              href="/dashboard/leads"
              className="text-sm text-blue-600 hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay leads aún</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{lead.business_name}</p>
                    <p className="text-xs text-gray-500">
                      {lead.contact_name || "Sin contacto"}
                      {lead.source && ` · ${lead.source}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(lead.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function reportClientName(report: {
  clients: { business_name: string } | null
}): string {
  return report.clients?.business_name ?? "cliente"
}

function invoiceClientName(invoice: {
  clients: { business_name: string } | null
}): string {
  return invoice.clients?.business_name ?? "cliente"
}

function StatCard({
  title,
  value,
  sub,
  icon,
  color,
}: {
  title: string
  value: string
  sub: string
  icon: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function AlertItem({
  icon,
  text,
  detail,
  href,
  tone,
}: {
  icon: string
  text: string
  detail?: string
  href: string
  tone: "amber" | "red" | "neutral"
}) {
  const toneClasses: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    neutral: "bg-white text-gray-600",
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
        tone === "neutral"
          ? "border-gray-200 hover:border-gray-300"
          : tone === "red"
            ? "border-red-200 hover:border-red-300"
            : "border-amber-200 hover:border-amber-300"
      } ${toneClasses[tone]}`}
    >
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-sm font-medium">{text}</p>
        {detail && <p className="text-xs opacity-80">{detail}</p>}
      </div>
    </Link>
  )
}

function MetricRow({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        {detail && <p className="text-xs text-gray-400">{detail}</p>}
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function SystemStatus({
  label,
  ok,
  detail,
  warn,
}: {
  label: string
  ok: boolean
  detail?: string
  warn?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${ok ? (warn ? "bg-yellow-400" : "bg-green-500") : "bg-red-500"}`}
      />
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function TrendChart({
  buckets,
}: {
  buckets: { date: string; label: string; leads: number; clients: number; invoices: number }[]
}) {
  const max = Math.max(
    1,
    ...buckets.map((b) => Math.max(b.leads, b.clients, b.invoices))
  )
  const totalLeads = buckets.reduce((sum, b) => sum + b.leads, 0)
  const totalClients = buckets.reduce((sum, b) => sum + b.clients, 0)
  const totalInvoices = buckets.reduce((sum, b) => sum + b.invoices, 0)

  // Mostrar una marca cada 6 días
  const visibleDates = buckets.map((b) => b.date)
  void visibleDates

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <MiniTotal label="Leads" value={totalLeads} color="#3b82f6" />
        <MiniTotal label="Clientes" value={totalClients} color="#10b981" />
        <MiniTotal label="Facturas" value={totalInvoices} color="#f59e0b" />
      </div>
      <div className="flex items-end gap-[3px]" style={{ height: "120px" }}>
        {buckets.map((bucket) => (
          <div
            key={bucket.date}
            className="flex-1 flex flex-col justify-end gap-[2px] group relative"
            title={`${bucket.label} · Leads ${bucket.leads} · Clientes ${bucket.clients} · Facturas ${bucket.invoices}`}
          >
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.max(2, (bucket.invoices / max) * 100)}%`,
                backgroundColor: "#f59e0b",
              }}
            />
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.max(2, (bucket.clients / max) * 100)}%`,
                backgroundColor: "#10b981",
              }}
            />
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.max(2, (bucket.leads / max) * 100)}%`,
                backgroundColor: "#3b82f6",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
        {buckets.map((b, i) =>
          i % 6 === 0 ? (
            <span key={b.date}>{b.label}</span>
          ) : (
            <span key={b.date} />
          )
        )}
      </div>
    </div>
  )
}

function MiniTotal({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function NextStep({
  icon,
  text,
  detail,
  href,
}: {
  icon: string
  text: React.ReactNode
  detail?: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-800">{text}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
      </div>
    </Link>
  )
}

function QuickAction({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  )
}