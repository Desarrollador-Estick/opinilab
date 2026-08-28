import { NextResponse } from "next/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"

// Datos públicos de una factura a partir de su token de pago.
// NO requiere sesión: quien tenga el token puede ver la factura.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ success: false, error: "Token no válido" }, { status: 400 })
    }

    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await (await import("@/lib/supabase/server")).createClient()

    // También permitimos consultar por id de factura (fallback interno) — no exponer.
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, subtotal, tax_rate, tax_amount, total, issue_date, due_date, notes, payment_token, client:clients(id, business_name, contact_name)")
      .eq("payment_token", token)
      .maybeSingle()

    if (error) {
      console.error("public/invoice error:", error)
      return NextResponse.json({ success: false, error: "Error al leer la factura" }, { status: 500 })
    }

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Enlace de pago no válido" }, { status: 404 })
    }

    // No exponer la factura si ya está pagada/cancelada
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json({
        success: true,
        invoice: {
          ...invoice,
          status: "paid_or_cancelled",
        },
      })
    }

    // Líneas de la factura
    const { data: items } = await supabase
      .from("invoice_items")
      .select("id, description, quantity, unit_price, total")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true })

    return NextResponse.json({ success: true, invoice, items: items || [] })
  } catch (e) {
    console.error("public/invoice error:", e)
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
  }
}
