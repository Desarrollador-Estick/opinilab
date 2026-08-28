"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"
import { createClient } from "@/lib/supabase/client"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface ServiceOption {
  id: string
  name: string
  base_price: number
  billing_cycle: string
}

export default function PagarPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [services, setServices] = useState<ServiceOption[]>([])
  const [businessName, setBusinessName] = useState("")
  const [selectedService, setSelectedService] = useState("")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loadingServices, setLoadingServices] = useState(true)
  const [initError, setInitError] = useState("")
  const [initiating, setInitiating] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [{ data: client }, { data: servicesData }] = await Promise.all([
        supabase.from("clients").select("business_name").eq("id", id).single(),
        supabase.from("services").select("id, name, base_price, billing_cycle").eq("is_active", true),
      ])
      setBusinessName(client?.business_name ?? "")
      setServices(servicesData ?? [])
      setLoadingServices(false)
    })()
  }, [id, supabase])

  async function handleInitiatePayment() {
    if (!selectedService) return
    setInitiating(true)
    setInitError("")
    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: id, service_id: selectedService }),
      })
      const data = await res.json()
      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret)
      } else {
        setInitError(data.error || "Error al iniciar el pago")
      }
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "Error al conectar con el servidor de pago")
    } finally {
      setInitiating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/clientes/${id}`}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Volver al cliente
        </Link>
        <h2 className="text-2xl font-bold mt-2">Cobrar a {businessName}</h2>
        <p className="text-gray-500">
          Se cobra la cuota de alta + el mes corriente en un único pago por adelantado.
        </p>
      </div>

      {!clientSecret ? (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">1. Elige el servicio</h3>
          {loadingServices ? (
            <p className="text-gray-400 text-sm">Cargando servicios...</p>
          ) : services.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No hay servicios activos. Crea uno en{" "}
              <Link href="/dashboard/servicios" className="text-blue-600">
                Servicios
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {services.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    selectedService === s.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="service"
                      value={s.id}
                      checked={selectedService === s.id}
                      onChange={() => setSelectedService(s.id)}
                    />
                    <span className="font-medium text-sm">
                      {s.name}
                      <span className="text-gray-400 text-xs ml-2">
                        {s.billing_cycle === "one_time" ? "Pago único" : "Mensual"}
                      </span>
                    </span>
                  </div>
                  <span className="font-semibold text-sm">
                    {Number(s.base_price).toFixed(2)}€/mes
                  </span>
                </label>
              ))}
            </div>
          )}

          {initError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {initError}
            </div>
          )}

          <button
            onClick={handleInitiatePayment}
            disabled={!selectedService || initiating}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            {initiating ? "Preparando pago..." : "Continuar al pago"}
          </button>
          <p className="text-xs text-gray-400 text-center">
            El importe total incluye el mes corriente + la cuota de alta. Solo en modo test.
          </p>
        </div>
      ) : (
        <CheckoutForm
          clientSecret={clientSecret}
          businessName={businessName}
          onDone={() => setClientSecret(null)}
        />
      )}
    </div>
  )
}

function CheckoutForm({
  clientSecret,
  businessName,
}: {
  clientSecret: string
  businessName: string
  onDone: () => void
}) {
  const options: StripeElementsOptions = { clientSecret, appearance: { theme: "stripe" } }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="font-semibold mb-4">2. Datos de pago</h3>
      <Elements stripe={stripePromise} options={options}>
        <StripeForm businessName={businessName} />
      </Elements>
    </div>
  )
}

function StripeForm({ businessName }: { businessName: string }) {
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
        return_url: `${window.location.origin}/dashboard/clientes`,
      },
      redirect: "if_required",
    })

    if (submitError) {
      setError(submitError.message ?? "Error al procesar el pago")
      setProcessing(false)
      return
    }

    if (paymentIntent?.status === "succeeded") {
      setMessage("¡Pago completado! Activando tu servicio...")
      setProcessing(false)
      // Pequeña pausa para que el webhook actualice la BD, luego vamos al dashboard
      window.setTimeout(() => {
        window.location.href = "/dashboard/clientes"
      }, 1500)
    } else {
      // Si no se pudo confirmar del todo, no nos quedamos colgados
      setError("El pago no se pudo completar. Revisa los datos de la tarjeta.")
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {message}
        </div>
      )}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
        <p>
          <strong>Modo test:</strong> usa la tarjeta{" "}
          <code className="bg-white border px-1 rounded">4242 4242 4242 4242</code>, fecha de
          caducidad futura y CVC cualquiera.
        </p>
        <p className="mt-1">Pagando el servicio de {businessName}.</p>
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
