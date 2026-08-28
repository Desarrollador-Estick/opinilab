"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils"
import { Database } from "@/types/database"

interface Client {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  nif_cif: string | null
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Payment {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  client?: Client
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  issue_date: string
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Cancelada",
}

export default function FacturaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [paymentRef, setPaymentRef] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [invoiceId])

  async function fetchInvoice() {
    setLoading(true)
    const { data: invData, error: invError } = await supabase
      .from("invoices")
      .select("*, client:clients(*)")
      .eq("id", invoiceId)
      .single()

    if (invError) {
      setError(invError.message)
      setLoading(false)
      return
    }

    setInvoice(invData)

    const [itemsRes, paymentsRes] = await Promise.all([
      supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId),
      supabase.from("payments").select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false }),
    ])

    if (itemsRes.data) setItems(itemsRes.data)
    if (paymentsRes.data) setPayments(paymentsRes.data)
    setLoading(false)
  }

  async function updateStatus(status: string) {
    if (!invoice) return
    const updates: Database["public"]["Tables"]["invoices"]["Update"] = {
      status: status as Database["public"]["Tables"]["invoices"]["Update"]["status"],
    }
    if (status === "paid") updates.paid_at = new Date().toISOString()

    const { error } = await supabase.from("invoices").update(updates).eq("id", invoiceId)
    if (error) {
      setError(error.message)
    } else {
      fetchInvoice()
    }
  }

  async function registerPayment() {
    if (!paymentAmount || Number(paymentAmount) <= 0) return
    setSaving(true)

    const { error } = await supabase.from("payments").insert({
      invoice_id: invoiceId,
      amount: Number(paymentAmount),
      payment_method: paymentMethod as Database["public"]["Tables"]["payments"]["Insert"]["payment_method"],
      reference: paymentRef.trim() || null,
      notes: paymentNotes.trim() || null,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + Number(paymentAmount)
    if (totalPaid >= invoice!.total) {
      await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoiceId)
    }

    setShowPaymentModal(false)
    setPaymentAmount("")
    setPaymentRef("")
    setPaymentNotes("")
    setSaving(false)
    fetchInvoice()
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.")) return
    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId)
    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard/facturas")
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Factura no encontrada</p>
        <Link href="/dashboard/facturas" className="text-blue-600 hover:underline text-sm">← Volver</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <Link href="/dashboard/facturas" className="text-sm text-gray-500 hover:text-gray-700">
            ← Volver a facturas
          </Link>
          <h2 className="text-2xl font-bold mt-1">{invoice.invoice_number}</h2>
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
            {statusLabels[invoice.status]}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
            🖨️ Imprimir
          </button>
          <button onClick={handleDelete} className="text-red-600 text-sm hover:text-red-800">
            Eliminar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 no-print">{error}</div>
      )}

      <div ref={printRef}>
        <div className="bg-white rounded-xl border p-6 print:border-0 print:rounded-none">
          <div className="flex justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-blue-600">🚀 Agencia Marketing</h3>
              <p className="text-sm text-gray-500 mt-1">CIF: B00000000</p>
              <p className="text-sm text-gray-500">Calle Ejemplo 123</p>
              <p className="text-sm text-gray-500">28001 Madrid</p>
            </div>
            <div className="text-right">
              <h4 className="text-lg font-bold">FACTURA</h4>
              <p className="font-mono text-sm">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-500 mt-1">Fecha: {formatDate(invoice.issue_date)}</p>
              {invoice.due_date && (
                <p className="text-sm text-gray-500">Vence: {formatDate(invoice.due_date)}</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 uppercase mb-1">Facturar a</p>
            <p className="font-semibold">{invoice.client?.business_name}</p>
            <p className="text-sm text-gray-600">{invoice.client?.contact_name}</p>
            {invoice.client?.address && <p className="text-sm text-gray-600">{invoice.client.address}</p>}
            {invoice.client?.city && (
              <p className="text-sm text-gray-600">
                {invoice.client.postal_code} {invoice.client.city}
                {invoice.client.province ? `, ${invoice.client.province}` : ""}
              </p>
            )}
            {invoice.client?.nif_cif && <p className="text-sm text-gray-600">CIF/NIF: {invoice.client.nif_cif}</p>}
            {invoice.client?.email && <p className="text-sm text-gray-600">{invoice.client.email}</p>}
          </div>

          <table className="w-full mb-6">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Descripción</th>
                <th className="text-right px-4 py-2 text-sm font-medium text-gray-500">Cant.</th>
                <th className="text-right px-4 py-2 text-sm font-medium text-gray-500">P. Unitario</th>
                <th className="text-right px-4 py-2 text-sm font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Base imponible:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IVA ({invoice.tax_rate}%):</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase mb-1">Notas</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {payments.length > 0 && (
        <div className="bg-white rounded-xl border p-6 no-print">
          <h3 className="font-semibold mb-4">Pagos registrados</h3>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Fecha</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Método</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Referencia</th>
                <th className="text-right px-4 py-2 text-sm font-medium text-gray-500">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-2 text-sm">{p.payment_method || "—"}</td>
                  <td className="px-4 py-2 text-sm">{p.reference || "—"}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-green-600">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 no-print">
        <h3 className="font-semibold mb-4">Acciones</h3>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <button
              onClick={() => updateStatus("sent")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Marcar como enviada
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
            >
              Registrar pago
            </button>
          )}
          {invoice.status === "draft" && (
            <button
              onClick={() => updateStatus("cancelled")}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-lg">Registrar pago</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importe (€)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                step="0.01"
                min="0"
                max={invoice.total}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={`Máximo: ${formatCurrency(invoice.total)}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                <option value="bank_transfer">Transferencia bancaria</option>
                <option value="card">Tarjeta</option>
                <option value="cash">Efectivo</option>
                <option value="paypal">PayPal</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="Nº de transferencia, recibo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={registerPayment}
                disabled={saving || !paymentAmount}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
