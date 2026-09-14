import Link from "next/link"
import { createServerAdminClient } from "@/lib/supabase/admin"
import {
  DAILY_CHECKLIST_KEY,
  parseDailyChecklist,
  localDateKey,
  type DailyChecklistState,
} from "@/lib/daily-checklist"
import DailyChecklist from "./daily-checklist"

// Depende de la sesión del administrador (middleware) y de datos en tiempo real.
export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Tipos ligeros para las queries del panel
// ---------------------------------------------------------------------------

interface ReplyRow {
  id: string
  email_from: string
  from_name: string | null
  subject: string | null
  reply_type: string | null
  reply_status: string | null
  confidence: number | null
  reason: string | null
  ai_reply: string | null
  created_at: string
  leads?: { id: string; business_name: string } | null
}

interface LeadRow {
  id: string
  business_name: string
  source: string | null
  status: string
  city: string | null
  created_at: string
}

interface FollowUpRow {
  id: string
  business_name: string
  status: string
  next_follow_up_at: string | null
  last_contact_at: string | null
}

interface InvoiceRow {
  id: string
  invoice_number: string
  status: string
  total: number
  due_date: string | null
  clients?: { business_name: string } | null
}

interface ContractRow {
  id: string
  contract_number: string
  title: string
  status: string
  value: number
  created_at: string
  clients?: { business_name: string } | null
}

interface AutomationLogRow {
  id: string
  action: string
  details: string
  created_at: string
}

interface TaskRow {
  id: string
  title: string
  status: string
  due_date: string | null
  priority: string
  clients?: { business_name: string } | null
}

// ---------------------------------------------------------------------------
// Formateo
// ---------------------------------------------------------------------------

const REPLY_LABELS: Record<string, string> = {
  yes: "Sí",
  no: "No",
  question: "Pregunta",
  objection: "Objeción",
  unsubscribe: "Baja",
  unresolved: "Sin clasificar",
}

const REPLY_COLORS: Record<string, string> = {
  yes: "bg-green-100 text-green-700",
  no: "bg-gray-100 text-gray-600",
  question: "bg-blue-100 text-blue-700",
  objection: "bg-amber-100 text-amber-700",
  unsubscribe: "bg-red-100 text-red-700",
  unresolved: "bg-gray-100 text-gray-500",
}

function nf(date: string) {
  return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })
}

function nfTime(date: string) {
  return new Date(date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function currency(val: number) {
  return val.toLocaleString("es-ES", { style: "currency", currency: "EUR" })
}

// ---------------------------------------------------------------------------
// Servidor: Fetch de datos del panel
// ---------------------------------------------------------------------------

export default async function TareasDiariasPage() {
  const now = new Date()
  const todayKey = localDateKey(now)

  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const dayStartISO = dayStart.toISOString()
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const dayEndISO = dayEnd.toISOString()

  const supabase = await createServerAdminClient()

  // Fetch en paralelo: todo el panel
  const [
    repliesResult,
    leadsNewResult,
    followupsResult,
    invoicesResult,
    contractsResult,
    errorsResult,
    tasksResult,
    checklistResult,
  ] = await Promise.all([
    supabase
      .from("email_replies")
      .select(
        "id, email_from, from_name, subject, reply_type, reply_status, confidence, reason, ai_reply, created_at, leads!email_replies_lead_id_fkey(id, business_name)"
      )
      .eq("reply_status", "draft")
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("leads")
      .select("id, business_name, source, status, city, created_at")
      .gte("created_at", dayStartISO)
      .lte("created_at", dayEndISO)
      .not("status", "in", '("won","lost")')
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("leads")
      .select("id, business_name, status, next_follow_up_at, last_contact_at")
      .in("status", ["contacted", "interested", "proposal_sent", "negotiation"])
      .not("next_follow_up_at", "is", null)
      .lte("next_follow_up_at", dayEndISO)
      .order("next_follow_up_at", { ascending: true })
      .limit(15),

    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, total, due_date, clients!invoices_client_id_fkey(business_name)"
      )
      .in("status", ["sent", "overdue"])
      .order("due_date", { ascending: true })
      .limit(10),

    supabase
      .from("contracts")
      .select(
        "id, contract_number, title, status, value, created_at, clients!contracts_client_id_fkey(business_name)"
      )
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("automation_logs")
      .select("id, action, details, created_at")
      .gte("created_at", dayStartISO)
      .lte("created_at", dayEndISO)
      .or("action.ilike.%error%,details.ilike.%error%,details.ilike.%failed%")
      .order("created_at", { ascending: false })
      .limit(15),

    supabase
      .from("tasks")
      .select("id, title, status, due_date, priority, clients!tasks_client_id_fkey(business_name)")
      .not("status", "eq", "done")
      .lte("due_date", todayKey)
      .order("due_date", { ascending: true })
      .limit(10),

    supabase
      .from("settings")
      .select("value")
      .eq("key", DAILY_CHECKLIST_KEY)
      .maybeSingle(),
  ])

  const replies = (repliesResult.data ?? []) as unknown as ReplyRow[]
  const leadsNew = (leadsNewResult.data ?? []) as unknown as LeadRow[]
  const followups = (followupsResult.data ?? []) as unknown as FollowUpRow[]
  const invoices = (invoicesResult.data ?? []) as unknown as InvoiceRow[]
  const contracts = (contractsResult.data ?? []) as unknown as ContractRow[]
  const errors = (errorsResult.data ?? []) as unknown as AutomationLogRow[]
  const tasks = (tasksResult.data ?? []) as unknown as TaskRow[]
  const tasksCount = tasksResult.count ?? tasks.length
  const overdueInvoiceCount = (invoices ?? []).filter((i) => i.status === "overdue").length
  const overdueFollowups = followups.filter((f) => f.next_follow_up_at && new Date(f.next_follow_up_at) < now)

  const checklistState: DailyChecklistState = parseDailyChecklist(
    checklistResult.data?.value ?? null
  )

  const anyActionNeeded =
    replies.length > 0 ||
    leadsNew.length > 0 ||
    followups.length > 0 ||
    invoices.length > 0 ||
    contracts.length > 0 ||
    errors.length > 0 ||
    tasks.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Tareas diarias</h2>
        <p className="text-gray-500 text-sm">
          Lo que necesitas tu atención hoy ·{" "}
          <time className="font-medium text-gray-700">
            {now.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </p>
      </div>

      {/* Checklist */}
      <DailyChecklist initial={checklistState} />

      {/* Panel "Hoy": pendientes reales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountCard
          icon="🔑"
          label="Respuestas para aprobar"
          count={replies.length}
          href="#panel-respuestas"
          tone={replies.length > 0 ? "blue" : "neutral"}
        />
        <CountCard
          icon="🆕"
          label="Leads nuevos hoy"
          count={leadsNew.length}
          href="#panel-leads"
          tone={leadsNew.length > 0 ? "purple" : "neutral"}
        />
        <CountCard
          icon="⏰"
          label="Follow-ups vencidos"
          count={overdueFollowups.length}
          href="#panel-followups"
          tone={overdueFollowups.length > 0 ? "amber" : "neutral"}
        />
        <CountCard
          icon="💳"
          label="Pagos pendientes"
          count={invoices.length}
          href="#panel-facturas"
          tone={invoices.length > 0 ? (overdueInvoiceCount > 0 ? "red" : "amber") : "neutral"}
        />
      </div>

      {/* Bloque todo-OK o lista de paneles */}
      {!anyActionNeeded ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-green-800 font-semibold text-lg">¡Todo al día!</p>
          <p className="text-green-700 text-sm mt-1">
            No hay pendientes que requieran tu atención en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* RESPUESTAS A APROBAR */}
          {replies.length > 0 && (
            <PanelSection
              id="panel-respuestas"
              icon="🔑"
              title="Respuestas para aprobar"
              subtitle="Borradores del agente de ventas que debes revisar y enviar"
              count={replies.length}
              empty={null}
            >
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Negocio</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Contacto</th>
                    <th className="px-4 py-2">Confianza</th>
                    <th className="px-4 py-2">Borrador</th>
                    <th className="px-4 py-2">Cuándo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {replies.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">
                        <Link href={`/dashboard/leads/${r.leads?.id ?? ""}`} className="hover:text-blue-600">
                          {r.leads?.business_name ?? "Lead"}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${REPLY_COLORS[r.reply_type ?? "unresolved"] ?? "bg-gray-100 text-gray-500"}`}>
                          {REPLY_LABELS[r.reply_type ?? "unresolved"] ?? r.reply_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {r.from_name || r.email_from}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 max-w-[200px] truncate text-gray-600">
                        {r.ai_reply
                          ? r.ai_reply.slice(0, 80) + (r.ai_reply.length > 80 ? "…" : "")
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-400 whitespace-nowrap" title={r.created_at}>
                        {nfTime(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelSection>
          )}

          {/* LEADS NUEVOS HOY */}
          {leadsNew.length > 0 && (
            <PanelSection
              id="panel-leads"
              icon="🆕"
              title="Leads nuevos hoy"
              subtitle={`${leadsNew.length} leads capturados este día`}
              count={leadsNew.length}
              empty={null}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
                {leadsNew.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.business_name}</p>
                      <p className="text-xs text-gray-500">
                        {lead.city || "—"} · {lead.source === "auto_scraped" ? "Scraper" : lead.source || "Manual"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{nfTime(lead.created_at)}</span>
                  </Link>
                ))}
              </div>
            </PanelSection>
          )}

          {/* FOLLOW-UPS */}
          {followups.length > 0 && (
            <PanelSection
              id="panel-followups"
              icon="⏰"
              title="Follow-ups de hoy"
              subtitle={`Leads con seguimiento pendiente ${overdueFollowups.length > 0 ? `(${overdueFollowups.length} vencidos)` : ""}`}
              count={followups.length}
              empty={null}
            >
              <div className="p-4 space-y-1">
                {followups.map((f) => {
                  const isOverdue =
                    f.next_follow_up_at && new Date(f.next_follow_up_at) < now
                  return (
                    <Link
                      key={f.id}
                      href={`/dashboard/leads/${f.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${isOverdue ? "bg-red-400" : "bg-amber-400"}`}
                        />
                        <div>
                          <p className="text-sm font-medium group-hover:text-blue-600">{f.business_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{f.status.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
                          {f.next_follow_up_at
                            ? isOverdue
                              ? `Venció ${nf(f.next_follow_up_at)}`
                              : `Hoy ${nfTime(f.next_follow_up_at)}`
                            : "—"}
                        </p>
                        {f.last_contact_at && (
                          <p className="text-[10px] text-gray-400">
                            Último contacto {nf(f.last_contact_at)}
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </PanelSection>
          )}

          {/* FACTURAS PENDIENTES */}
          {invoices.length > 0 && (
            <PanelSection
              id="panel-facturas"
              icon="💳"
              title="Pagos pendientes"
              subtitle={`${invoices.length} facturas por cobrar${overdueInvoiceCount > 0 ? ` (${overdueInvoiceCount} vencidas)` : ""}`}
              count={invoices.length}
              empty={null}
            >
              <div className="p-4 space-y-1">
                {invoices.map((inv) => {
                  const isOverdue = inv.status === "overdue"
                  return (
                    <Link
                      key={inv.id}
                      href={`/dashboard/facturas/${inv.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition group"
                    >
                      <div>
                        <p className="text-sm font-medium group-hover:text-blue-600">
                          {inv.invoice_number} — {inv.clients?.business_name ?? "Cliente"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {inv.due_date
                            ? isOverdue
                              ? `Venció ${nf(inv.due_date)}`
                              : `Vence ${nf(inv.due_date)}`
                            : "Sin fecha"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums ${isOverdue ? "text-red-600" : "text-gray-900"}`}>
                          {currency(inv.total)}
                        </p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isOverdue
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isOverdue ? "Vencida" : "Por cobrar"}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </PanelSection>
          )}

          {/* CONTRATOS POR FIRMAR */}
          {contracts.length > 0 && (
            <PanelSection
              id="panel-contratos"
              icon="📋"
              title="Contratos pendientes de firma"
              subtitle={`${contracts.length} contratos enviados`}
              count={contracts.length}
              empty={null}
            >
              <div className="p-4 space-y-1">
                {contracts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/contratos/${c.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition group"
                  >
                    <div>
                      <p className="text-sm font-medium group-hover:text-blue-600">
                        {c.contract_number} — {c.clients?.business_name ?? "Cliente"}
                      </p>
                      <p className="text-xs text-gray-500">{c.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{currency(c.value)}</p>
                      <p className="text-[10px] text-gray-400">{nf(c.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </PanelSection>
          )}

          {/* TAREAS DEL EQUIPO (vencidas / vencen hoy) */}
          {tasks.length > 0 && (
            <PanelSection
              id="panel-tareas-eq"
              icon="✅"
              title="Tareas del equipo"
              subtitle={`${tasksCount} tareas pendientes (vencidas o vencen hoy)`}
              count={tasksCount}
              empty={null}
              href="/dashboard/tareas"
            >
              <div className="p-4 space-y-1">
                {tasks.map((t) => {
                  const isOverdue = t.due_date && t.due_date < todayKey
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOverdue
                              ? "bg-red-400"
                              : t.priority === "urgent"
                                ? "bg-red-400"
                                : t.priority === "high"
                                  ? "bg-orange-400"
                                  : "bg-blue-400"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">{t.title}</p>
                          <p className="text-xs text-gray-500">
                            {t.clients?.business_name ?? "General"} · {t.priority}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isOverdue ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        {t.due_date
                          ? isOverdue
                            ? `Venció ${nf(t.due_date)}`
                            : `Hoy`
                          : "Sin fecha"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </PanelSection>
          )}

          {/* ERRORES DE AUTOMATIZACIÓN */}
          {errors.length > 0 && (
            <PanelSection
              id="panel-errores"
              icon="⚠️"
              title="Errores de automatización"
              subtitle={`${errors.length} fallos registrados hoy`}
              count={errors.length}
              empty={null}
            >
              <div className="p-4 space-y-1">
                {errors.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-red-500 text-xs mt-0.5">●</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-700 font-medium">{e.action}</p>
                      <p className="text-xs text-gray-600 truncate mt-0.5" title={e.details}>
                        {e.details}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{nfTime(e.created_at)}</span>
                  </div>
                ))}
              </div>
            </PanelSection>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componentes de presentación
// ---------------------------------------------------------------------------

function CountCard({
  icon,
  label,
  count,
  href,
  tone,
}: {
  icon: string
  label: string
  count: number
  href: string
  tone: "blue" | "purple" | "amber" | "red" | "neutral"
}) {
  const toneClasses: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    amber: "bg-amber-50 border-amber-200",
    red: "bg-red-50 border-red-200",
    neutral: "bg-white border-gray-200",
  }

  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 hover:shadow-sm transition ${toneClasses[tone]}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-600 leading-tight">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-gray-900">{count}</p>
    </Link>
  )
}

function PanelSection({
  id,
  icon,
  title,
  subtitle,
  count,
  empty,
  href,
  children,
}: {
  id: string
  icon: string
  title: string
  subtitle?: string
  count: number
  empty: React.ReactNode
  href?: string
  children: React.ReactNode
}) {
  return (
    <div id={id} className="bg-white rounded-xl border overflow-hidden scroll-mt-20">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50/80">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span>{icon}</span> {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tabular-nums">{count}</span>
          {href && (
            <Link
              href={href}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Ver todo →
            </Link>
          )}
        </div>
      </div>
      {count === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">{empty}</div>
      ) : (
        <div className="divide-y">{children}</div>
      )}
    </div>
  )
}