import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { client_id, items, notes } = await request.json()

    const supabase = await createClient()

    // Get next invoice number
    const { count } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })

    const year = new Date().getFullYear()
    const sequence = (count || 0) + 1
    const invoice_number = `FAC-${year}-${String(sequence).padStart(4, "0")}`

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)
    const tax_rate = 21
    const tax_amount = subtotal * (tax_rate / 100)
    const total = subtotal + tax_amount

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id,
        invoice_number,
        status: "draft",
        subtotal,
        tax_rate,
        tax_amount,
        total,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Create invoice items
    const invoiceItems = items.map((item: any) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)
    if (itemsError) throw itemsError

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al crear factura" }, { status: 500 })
  }
}
