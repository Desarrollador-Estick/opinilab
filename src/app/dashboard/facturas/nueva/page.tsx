"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, generateInvoiceNumber } from "@/lib/utils"

interface Client {
  id: string
  business_name: string
}

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

export default function NuevaFacturaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState("")
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split("T")[0]
  })
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const TAX_RATE = 21

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, business_name")
      .order("business_name")
    if (data) setClients(data)
  }

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items]
    if (field === "description") {
      updated[index].description = value as string
    } else {
      updated[index][field] = Number(value)
    }
    setItems(updated)
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const taxAmount = subtotal * (TAX_RATE / 100)
  const total = subtotal + taxAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      setError("Selecciona un cliente")
      return
    }
    if (items.some((item) => !item.description.trim())) {
      setError("Todas las líneas deben tener descripción")
      return
    }

    setLoading(true)
    setError(null)

    const { count } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })

    const invoiceNumber = generateInvoiceNumber(new Date().getFullYear(), (count || 0) + 1)

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        invoice_number: invoiceNumber,
        status: "draft",
        subtotal,
        tax_rate: TAX_RATE,
        tax_amount: taxAmount,
        total,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: dueDate,
        notes: notes.trim() || null,
      })
      .select("id")
      .single()

    if (invoiceError) {
      setError(invoiceError.message)
      setLoading(false)
      return
    }

    const invoiceItems = items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)

    if (itemsError) {
      setError(itemsError.message)
      setLoading(false)
    } else {
      router.push(`/dashboard/facturas/${invoice.id}`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nueva Factura</h2>
          <p className="text-gray-500">Crea una factura con línea de detalle</p>
        </div>
        <Link href="/dashboard/facturas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Cliente</h3>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Seleccionar cliente...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Líneas de detalle</h3>
            <button
              type="button"
              onClick={addItem}
              className="text-blue-600 text-sm hover:underline"
            >
              + Añadir línea
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-3 items-start">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="Descripción del servicio..."
                  className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  min="0"
                  step="0.5"
                  className="w-20 border rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400">€</span>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-28 border rounded-lg pl-7 pr-3 py-2 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <span className="py-2 text-sm font-medium w-24 text-right">
                  {formatCurrency(item.quantity * item.unit_price)}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="py-2 px-2 text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Resumen</h3>
          <div className="space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-gray-500">Base imponible:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">IVA ({TAX_RATE}%):</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-semibold">Total:</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Detalles</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Notas adicionales para la factura..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/facturas" className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Factura"}
          </button>
        </div>
      </form>
    </div>
  )
}
