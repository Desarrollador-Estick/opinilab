"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  issue_date: string
  due_date: string | null
  notes: string | null
  client?: {
    id: string
    business_name: string
    contact_name: string | null
  }
}

export default function PublicPayPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [alreadyPaid, setAlreadyPaid] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/public/invoice/${token}`)
        const data = await res.json()
        if (!data.success) {
          setError(data.error || "No se pudo cargar la factura")
          setLoading(false)
          return
        }
        if (data.invoice.status === "paid_or_cancelled") {
          setAlreadyPaid(true)
          setInvoice(data.invoice)
        } else {
          setInvoice(data.invoice)
          setItems(data.items || [])
        }
      } catch {
        setError("Error de conexión. Inténtalo de nuevo.")
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  async function handleInitiatePayment() {
    setError("")
    try {
      const res = await fetch(`/api/public/pay/${token}`, { method: "POST" })
      const data = await res.json()
      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret)
      } else {
        setError(data.error || "Error al iniciar el pago")
      }
    } catch {
      setError("Error al iniciar el pago. Inténtalo de nuevo.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <Shell>
        <div className="bg-white rounded-xl border p-10 text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-xl font-bold mb-2">Enlace no válido</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {alreadyPaid ? (
        <div className="bg-white rounded-xl border p-10 text-center space-y-3">
          <p className="text-5xl">✅</p>
          <h2 className="text-2xl font-bold">Esta factura ya está pagada</h2>
          <p className="text-gray-500 text-sm">No es necesario realizar ningún pago adicional.</p>
        </div>
      ) : !clientSecret ? (
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Pago de factura</h2>
            <p className="text-gray-500 text-sm mt-1">Factura {invoice?.invoice_number}</p>
          </div>

          {/* Detalle */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex justify-between text-sm">
              <span className="text-gray-600">Concepto</span>
              <span className="text-gray-600">Importe</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex justify-between text-sm border-t">
                <span>{item.description}</span>
                <span className="font-medium">{item.unit_price.toFixed(2)}€</span>
              </div>
            ))}
            <div className="px-4 py-3 border-t bg-gray-50 flex justify-between font-bold text-sm">
              <span>Total (IVA {invoice?.tax_rate}% incl.)</span>
              <span>{Number(invoice?.total || 0).toFixed(2)}€</span>
            </div>
          </div>

          {invoice?.notes && (
            <p className="text-sm text-gray-500">{invoice.notes}</p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
            Al pagar guardaremos tu tarjeta para los próximos cobros mensuales. Si prefieres no guardarla con
            cobros automáticos, puedes hacer el pago y después avisarnos.
          </div>

          <button
            onClick={handleInitiatePayment}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Continuar al pago
          </button>
          <p className="text-xs text-gray-400 text-center">Pago seguro procesado por Stripe. Solo en modo test.</p>
        </div>
      ) : (
        <CheckoutForm
          clientSecret={clientSecret}
          invoiceNumber={invoice?.invoice_number || ""}
          businessName={invoice?.client?.business_name || ""}
        />
      )}
    </Shell>
  )
}

function CheckoutForm({
  clientSecret,
  invoiceNumber,
  businessName,
}: {
  clientSecret: string
  invoiceNumber: string
  businessName: string
}) {
  const options: StripeElementsOptions = { clientSecret, appearance: { theme: "stripe" } }

  return (
    <div className="bg-white rounded-xl border p-6">
      <Elements stripe={stripePromise} options={options}>
        <StripeForm invoiceNumber={invoiceNumber} businessName={businessName} />
      </Elements>
    </div>
  )
}

function StripeForm({ invoiceNumber, businessName }: { invoiceNumber: string; businessName: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError("")
    setMessage("")

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pagar/${window.location.pathname.split("/").pop()}`,
      },
      redirect: "if_required",
    })

    if (submitError) {
      setError(submitError.message ?? "Error al procesar el pago")
      setProcessing(false)
      return
    }

    if (paymentIntent?.status === "succeeded") {
      setMessage("¡Pago completado con éxito!")
      setProcessing(false)
    } else {
      setError("El pago no se pudo completar. Revisa los datos de la tarjeta e inténtalo de nuevo.")
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold">Datos de pago</h3>
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{message}</div>
      )}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
        <p>
          <strong>Modo test:</strong> usa la tarjeta{" "}
          <code className="bg-white border px-1 rounded">4242 4242 4242 4242</code>, fecha de caducidad futura y CVC
          cualquiera.
        </p>
        <p className="mt-1">
          {invoiceNumber} · {businessName}
        </p>
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
      >
        {processing ? "Procesando pago..." : "Pagar ahora"}
      </button>
    </form>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-center">
        <Link href="/" className="text-xl font-bold">{process.env.NEXT_PUBLIC_APP_NAME || "Agencia Marketing"}</Link>
      </header>
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-gray-400">
        <p>Pago procesado por Stripe · {process.env.NEXT_PUBLIC_APP_NAME || "Agencia Marketing"}</p>
      </footer>
    </div>
  )
}
