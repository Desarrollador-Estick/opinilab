import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"

// Generate monthly report for a client
export async function POST(request: Request) {
  try {
    const { client_id, period_start, period_end } = await request.json()

    // El cron de Vercel no tiene sesión: usamos service role si está configurada.
    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await createClient()

    // Gather data for the report
    const [reviews, invoices, posts, tasks] = await Promise.all([
      supabase
        .from("reviews")
        .select("*")
        .eq("client_id", client_id)
        .gte("created_at", period_start)
        .lte("created_at", period_end),
      supabase
        .from("invoices")
        .select("*")
        .eq("client_id", client_id)
        .gte("issue_date", period_start)
        .lte("issue_date", period_end),
      supabase
        .from("social_posts")
        .select("*")
        .eq("client_id", client_id)
        .gte("created_at", period_start)
        .lte("created_at", period_end),
      supabase
        .from("tasks")
        .select("*")
        .eq("client_id", client_id)
        .eq("status", "done")
        .gte("completed_at", period_start)
        .lte("completed_at", period_end),
    ])

    const reportContent = {
      period: { start: period_start, end: period_end },
      reviews: {
        total: reviews.data?.length || 0,
        avg_rating: reviews.data?.length
          ? reviews.data.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.data.length
          : 0,
        responded: reviews.data?.filter((r) => r.status === "responded").length || 0,
      },
      revenue: {
        total_invoiced: invoices.data?.reduce((sum, i) => sum + i.total, 0) || 0,
        total_paid: invoices.data?.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0) || 0,
        pending: invoices.data?.filter((i) => i.status === "sent" || i.status === "overdue").reduce((sum, i) => sum + i.total, 0) || 0,
      },
      social: {
        posts_published: posts.data?.filter((p) => p.status === "published").length || 0,
        total_engagement: posts.data?.reduce((sum, p) => sum + (p.engagement_likes ?? 0) + (p.engagement_comments ?? 0) + (p.engagement_shares ?? 0), 0) || 0,
      },
      tasks_completed: tasks.data?.length || 0,
    }

    // Save report
    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        client_id,
        title: `Informe ${new Date(period_start).toLocaleDateString("es-ES")} - ${new Date(period_end).toLocaleDateString("es-ES")}`,
        report_type: "monthly",
        period_start,
        period_end,
        content: reportContent,
        status: "generated",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, report, content: reportContent })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al generar reporte" }, { status: 500 })
  }
}
