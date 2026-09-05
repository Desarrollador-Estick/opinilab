import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/database"

type Tables = Database["public"]["Tables"]

// ============================================
// CLIENTS
// ============================================

export async function getClients(
  supabase: SupabaseClient<Database>,
  search?: string,
  status?: string
) {
  let query = supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
    )
  }

  if (status && status !== "all") {
    query = query.eq("status", status as NonNullable<Tables["clients"]["Row"]["status"]>)
  }

  return query
}

export async function getClient(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return supabase.from("clients").select("*").eq("id", id).single()
}

export async function createClientRecord(
  supabase: SupabaseClient<Database>,
  data: Tables["clients"]["Insert"]
) {
  return supabase.from("clients").insert(data).select().single()
}

export async function updateClient(
  supabase: SupabaseClient<Database>,
  id: string,
  data: Tables["clients"]["Update"]
) {
  return supabase
    .from("clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
}

export async function deleteClient(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return supabase.from("clients").delete().eq("id", id)
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(supabase: SupabaseClient<Database>) {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0]

  const [
    clientsResult,
    activeClientsResult,
    monthlyRevenueResult,
    pendingInvoicesResult,
    activeLeadsResult,
    pendingTasksResult,
    reviewsResult,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("invoices")
      .select("total")
      .eq("status", "paid")
      .gte("paid_at", firstDayOfMonth),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent", "overdue"]),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("status", "in", '("won","lost")'),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["todo", "in_progress", "review"]),
    supabase.from("reviews").select("rating"),
  ])

  const monthlyRevenue = monthlyRevenueResult.data?.reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  ) ?? 0

  const reviews = reviewsResult.data ?? []
  const totalReviews = reviews.length
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / totalReviews
      : 0

  return {
    totalClients: clientsResult.count ?? 0,
    activeClients: activeClientsResult.count ?? 0,
    monthlyRevenue,
    pendingInvoices: pendingInvoicesResult.count ?? 0,
    activeLeads: activeLeadsResult.count ?? 0,
    pendingTasks: pendingTasksResult.count ?? 0,
    totalReviews,
    avgRating: Math.round(avgRating * 10) / 10,
  }
}

export async function getRecentClients(supabase: SupabaseClient<Database>) {
  return supabase
    .from("clients")
    .select("id, business_name, contact_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5)
}

// ============================================
// DASHBOARD AUTOMATION METRICS
// ============================================

export async function getDashboardAutomationMetrics(
  supabase: SupabaseClient<Database>
) {
  const now = new Date()
  const todayStart = now.toISOString().split("T")[0]

  const [
    scrapedLeadsResult,
    emailsSentResult,
    pendingAiTasksResult,
    unansweredReviewsResult,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("source", "auto_scraped")
      .gte("created_at", todayStart),
    supabase
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabase
      .from("ai_tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "waiting", "processing"]),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ])

  return {
    scrapedLeadsToday: scrapedLeadsResult.count ?? 0,
    emailsSentToday: emailsSentResult.count ?? 0,
    pendingAiTasks: pendingAiTasksResult.count ?? 0,
    unansweredReviews: unansweredReviewsResult.count ?? 0,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

// ============================================
// DASHBOARD ALERTS
// ============================================

export async function getDashboardAlerts(supabase: SupabaseClient<Database>) {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * DAY_MS).toISOString()

  const [
    unansweredReviewsResult,
    staleLeadsResult,
    overdueInvoicesResult,
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, reviewer_name, client_id")
      .eq("status", "new")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("leads")
      .select("id, business_name, status, last_contact_at, created_at")
      .not("status", "in", '("won","lost")')
      .lte("created_at", threeDaysAgo),
    supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, clients(business_name)")
      .eq("status", "overdue")
      .order("due_date", { ascending: false })
      .limit(5),
  ])

  const staleLeads = (staleLeadsResult.data ?? []).filter(
    (lead) => !lead.last_contact_at
  )

  return {
    unansweredReviews: unansweredReviewsResult.data ?? [],
    staleLeads,
    overdueInvoices: overdueInvoicesResult.data ?? [],
  }
}

// ============================================
// DASHBOARD NEXT STEPS
// ============================================

export async function getDashboardNextSteps(
  supabase: SupabaseClient<Database>
) {
  const now = new Date()
  const upcoming = new Date(now.getTime() + 5 * DAY_MS).toISOString()

  const [newLeadsResult, pendingReportsResult, upcomingInvoicesResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, business_name, city, source")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("reports")
        .select("id, title, status, clients(business_name)")
        .eq("status", "generated")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("invoices")
        .select("id, invoice_number, total, due_date, clients(business_name)")
        .in("status", ["draft", "sent"])
        .gte("due_date", now.toISOString().split("T")[0])
        .lte("due_date", upcoming.split("T")[0])
        .order("due_date", { ascending: true })
        .limit(3),
    ])

  return {
    newLeads: newLeadsResult.data ?? [],
    pendingReports: pendingReportsResult.data ?? [],
    upcomingInvoices: upcomingInvoicesResult.data ?? [],
  }
}

// ============================================
// DASHBOARD TREND (30 days)
// ============================================

export async function getDashboardTrend(supabase: SupabaseClient<Database>) {
  const now = new Date()
  const start = new Date(now.getTime() - 29 * DAY_MS)
  const startISO = start.toISOString().split("T")[0]

  const [leadsResult, clientsResult, invoicesResult] = await Promise.all([
    supabase.from("leads").select("created_at").gte("created_at", startISO),
    supabase
      .from("clients")
      .select("created_at")
      .gte("created_at", startISO),
    supabase
      .from("invoices")
      .select("created_at")
      .gte("created_at", startISO),
  ])

  const buckets: {
    date: string
    label: string
    leads: number
    clients: number
    invoices: number
  }[] = []

  for (let i = 0; i < 30; i++) {
    const d = new Date(start.getTime() + i * DAY_MS)
    buckets.push({
      date: d.toISOString().split("T")[0],
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      leads: 0,
      clients: 0,
      invoices: 0,
    })
  }

  const bucketByDate = new Map(buckets.map((b) => [b.date, b]))

  for (const row of leadsResult.data ?? []) {
    const key = (row.created_at as string).slice(0, 10)
    const bucket = bucketByDate.get(key)
    if (bucket) bucket.leads += 1
  }
  for (const row of clientsResult.data ?? []) {
    const key = (row.created_at as string).slice(0, 10)
    const bucket = bucketByDate.get(key)
    if (bucket) bucket.clients += 1
  }
  for (const row of invoicesResult.data ?? []) {
    const key = (row.created_at as string).slice(0, 10)
    const bucket = bucketByDate.get(key)
    if (bucket) bucket.invoices += 1
  }

  return buckets
}

// ============================================
// DASHBOARD SYSTEM STATUS
// ============================================

export async function getDashboardSystemStatus(
  supabase: SupabaseClient<Database>
) {
  const [scraperLogResult, settingsResult] = await Promise.all([
    supabase
      .from("lead_scraper_log")
      .select("run_date, leads_created, errors")
      .order("run_date", { ascending: false })
      .limit(1),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "lead_scraper_config")
      .single(),
  ])

  const scraperConfig = settingsResult.data?.value as
    | { enabled?: boolean }
    | null
  const lastRun = scraperLogResult.data?.[0] ?? null

  return {
    scraper: {
      enabled: scraperConfig?.enabled ?? false,
      lastRunDate: lastRun?.run_date ?? null,
      lastRunLeads: lastRun?.leads_created ?? 0,
      lastRunErrors: lastRun?.errors ?? null,
    },
  }
}

export async function getRecentLeads(supabase: SupabaseClient<Database>) {
  return supabase
    .from("leads")
    .select("id, business_name, contact_name, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(5)
}

// ============================================
// LEADS
// ============================================

export async function getLeads(
  supabase: SupabaseClient<Database>,
  status?: string
) {
  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status as NonNullable<Tables["leads"]["Row"]["status"]>)
  }

  return query
}

export async function createLeadRecord(
  supabase: SupabaseClient<Database>,
  data: Tables["leads"]["Insert"]
) {
  return supabase.from("leads").insert(data).select().single()
}

export async function updateLead(
  supabase: SupabaseClient<Database>,
  id: string,
  data: Tables["leads"]["Update"]
) {
  return supabase
    .from("leads")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
}

export async function deleteLead(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return supabase.from("leads").delete().eq("id", id)
}

// ============================================
// INVOICES
// ============================================

export async function getInvoices(
  supabase: SupabaseClient<Database>,
  clientId?: string,
  status?: string
) {
  let query = supabase
    .from("invoices")
    .select("*, clients(business_name)")
    .order("created_at", { ascending: false })

  if (clientId) {
    query = query.eq("client_id", clientId)
  }

  if (status && status !== "all") {
    query = query.eq("status", status as NonNullable<Tables["invoices"]["Row"]["status"]>)
  }

  return query
}

export async function createInvoiceRecord(
  supabase: SupabaseClient<Database>,
  clientId: string,
  items: { description: string; quantity: number; unit_price: number }[],
  notes?: string
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )
  const taxRate = 21
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-${month}-01`)

  const sequence = (count ?? 0) + 1
  const invoiceNumber = `FAC-${year}-${month}-${String(sequence).padStart(3, "0")}`

  const dueDate = new Date(now)
  dueDate.setDate(dueDate.getDate() + 30)

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      issue_date: now.toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0],
      notes: notes || null,
    })
    .select()
    .single()

  if (invoiceError || !invoice) return { data: null, error: invoiceError }

  const invoiceItems = items.map((item) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.quantity * item.unit_price,
  }))

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItems)

  if (itemsError) return { data: null, error: itemsError }

  return { data: invoice, error: null }
}

// ============================================
// CONTRACTS
// ============================================

export async function getContracts(
  supabase: SupabaseClient<Database>,
  clientId?: string
) {
  let query = supabase
    .from("contracts")
    .select("*, clients(business_name)")
    .order("created_at", { ascending: false })

  if (clientId) {
    query = query.eq("client_id", clientId)
  }

  return query
}

export async function createContractRecord(
  supabase: SupabaseClient<Database>,
  clientId: string,
  data: {
    title: string
    content?: string
    value: number
    start_date: string
    end_date?: string
  }
) {
  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })

  const year = new Date().getFullYear()
  const sequence = (count ?? 0) + 1
  const contractNumber = `CON-${year}-${String(sequence).padStart(3, "0")}`

  return supabase
    .from("contracts")
    .insert({
      client_id: clientId,
      contract_number: contractNumber,
      ...data,
    })
    .select()
    .single()
}

// ============================================
// REVIEWS
// ============================================

export async function getReviews(
  supabase: SupabaseClient<Database>,
  clientId?: string
) {
  let query = supabase
    .from("reviews")
    .select("*, clients(business_name)")
    .order("created_at", { ascending: false })

  if (clientId) {
    query = query.eq("client_id", clientId)
  }

  return query
}

export async function createReviewRequest(
  supabase: SupabaseClient<Database>,
  clientId: string,
  customer: {
    customer_name: string
    customer_phone?: string
    customer_email?: string
  }
) {
  return supabase
    .from("review_requests")
    .insert({ client_id: clientId, ...customer })
    .select()
    .single()
}

// ============================================
// TASKS
// ============================================

export async function getTasks(
  supabase: SupabaseClient<Database>,
  assignedTo?: string,
  status?: string
) {
  let query = supabase
    .from("tasks")
    .select("*, clients(business_name)")
    .order("created_at", { ascending: false })

  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo)
  }

  if (status && status !== "all") {
    query = query.eq("status", status as NonNullable<Tables["tasks"]["Row"]["status"]>)
  }

  return query
}

export async function createTaskRecord(
  supabase: SupabaseClient<Database>,
  data: Tables["tasks"]["Insert"]
) {
  return supabase.from("tasks").insert(data).select().single()
}

export async function updateTask(
  supabase: SupabaseClient<Database>,
  id: string,
  data: Tables["tasks"]["Update"]
) {
  return supabase.from("tasks").update(data).eq("id", id).select().single()
}

// ============================================
// PAYMENTS
// ============================================

export async function getPayments(
  supabase: SupabaseClient<Database>,
  invoiceId: string
) {
  return supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false })
}

export async function createPaymentRecord(
  supabase: SupabaseClient<Database>,
  invoiceId: string,
  data: {
    amount: number
    payment_method?: Tables["payments"]["Insert"]["payment_method"]
    reference?: string
    notes?: string
  }
) {
  const { data: payment, error } = await supabase
    .from("payments")
    .insert({ invoice_id: invoiceId, ...data })
    .select()
    .single()

  if (error || !payment) return { data: null, error }

  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId)

  const totalPaid = (allPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )

  const { data: invoice } = await supabase
    .from("invoices")
    .select("total")
    .eq("id", invoiceId)
    .single()

  if (invoice && totalPaid >= Number(invoice.total)) {
    await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", invoiceId)
  }

  return { data: payment, error: null }
}

// ============================================
// CLIENT SERVICES
// ============================================

export async function getClientServices(
  supabase: SupabaseClient<Database>,
  clientId: string
) {
  return supabase
    .from("client_services")
    .select("*, services(name, category, base_price)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
}

// ============================================
// LEAD CONVERSION
// ============================================

export async function convertLeadToClient(
  supabase: SupabaseClient<Database>,
  leadId: string,
  clientData: Tables["clients"]["Insert"]
) {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert(clientData)
    .select()
    .single()

  if (clientError || !client) return { data: null, error: clientError }

  await supabase
    .from("leads")
    .update({
      status: "won",
      converted_client_id: client.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  return { data: client, error: null }
}
