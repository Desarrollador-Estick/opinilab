import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  getDashboardStats,
  getRecentClients,
  getRecentLeads,
} from "@/lib/supabase/queries"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [statsResult, recentClientsResult, recentLeadsResult] =
    await Promise.all([
      getDashboardStats(supabase),
      getRecentClients(supabase),
      getRecentLeads(supabase),
    ])

  const stats = statsResult
  const recentClients = recentClientsResult.data ?? []
  const recentLeads = recentLeadsResult.data ?? []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clientes Activos"
          value={stats.activeClients}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Ingresos Mensuales"
          value={formatCurrency(stats.monthlyRevenue)}
          icon="💰"
          color="green"
        />
        <StatCard
          title="Leads Activos"
          value={stats.activeLeads}
          icon="🎯"
          color="purple"
        />
        <StatCard
          title="Facturas Pendientes"
          value={stats.pendingInvoices}
          icon="📋"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tareas Pendientes"
          value={stats.pendingTasks}
          icon="✅"
          color="red"
        />
        <StatCard
          title="Total Reseñas"
          value={stats.totalReviews}
          icon="⭐"
          color="yellow"
        />
        <StatCard
          title="Valoración Media"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
          icon="⭐"
          color="green"
        />
        <StatCard
          title="Total Clientes"
          value={stats.totalClients}
          icon="📊"
          color="blue"
        />
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            href="/dashboard/clientes/nuevo"
            label="Nuevo Cliente"
            icon="➕"
          />
          <QuickAction
            href="/dashboard/leads"
            label="Captar Lead"
            icon="🎯"
          />
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
            <p className="text-gray-500 text-center py-8">
              No hay clientes aún
            </p>
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
            <p className="text-gray-500 text-center py-8">
              No hay leads aún
            </p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {lead.business_name}
                    </p>
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

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string | number
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
