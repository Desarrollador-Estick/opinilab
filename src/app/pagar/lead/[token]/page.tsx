"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface LeadOffer {
  leadId?: string
  businessName?: string
  contactName?: string
  email?: string
  offer?: {
    name: string
    price: number
    currency: string
    description?: string
  }
  alreadyPaid?: boolean
  stripeLive?: boolean
}

export default function PublicLeadPayPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [offer, setOffer] = useState<LeadOffer | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripeLive, setStripeLive] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/public/lead-pay/${token}`)
        const data = await res.json()
        if (!data.success) {
          setError(data.error || "No se pudo cargar la oferta")
          setLoading(false)
          return
        }
        setOffer(data)
        setStripeLive(!!data.stripeLive)
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
      const res = await fetch(`/api/public/lead-pay/${token}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al iniciar el pago")
        return
      }
      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret)
        if (typeof data.stripeLive === "boolean") setStripeLive(data.stripeLive)
      } else {
        setError(data.error || "Error al iniciar el pago")
      }
    } catch {
      setError("Error al iniciar el pago. Inténtalo de nuevo.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
      </div>
    )
  }

  if (error && !offer?.businessName) {
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

  if (offer?.alreadyPaid) {
    return (
      <Shell>
        <div className="bg-white rounded-xl border p-10 text-center space-y-3">
          <p className="text-5xl">🎉</p>
          <h2 className="text-2xl font-bold">¡Ya estás dado de alta!</h2>
          <p className="text-gray-500 text-sm">
            <strong>{offer.businessName}</strong> ya forma parte de OpiniLab. Pronto recibirás tus
            datos de acceso al portal por email.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {!clientSecret ? (
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100 text-green-600 text-2xl mb-3">
              ⭐
            </div>
            <h2 className="text-2xl font-bold">Plan de Lanzamiento</h2>
            <p className="text-gray-500 text-sm mt-1">{offer?.businessName}</p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 flex justify-between text-sm">
              <span>Gestión y respuesta automática de reseñas de Google</span>
            </div>
            <div className="bg-gray-50 px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Alta del servicio (único pago)</span>
                <span className="font-medium">30,00€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Primer mes</span>
                <span className="font-medium">49,00€</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-end">
                <span className="text-xs text-gray-500">Total primer mes · IVA incluido</span>
                <div className="text-right">
                  <div className="text-4xl font-bold">79,00€</div>
                  <div className="text-xs text-green-600 font-medium">Los siguientes meses: 49€/mes</div>
                </div>
              </div>
            </div>
          </div>

          <ul className="text-sm text-gray-600 space-y-2">
            <li>✅ Respuesta automática con IA a cada reseña de Google</li>
            <li>✅ Más reseñas nuevas de tus clientes contentos</li>
            <li>✅ Mejora tu visibilidad en tu zona</li>
          </ul>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handleInitiatePayment}
            className="w-full bg-[var(--color-primary)] text-white px-4 py-3 rounded-lg hover:opacity-90 transition font-medium"
          >
            Pagar 79€ y empezar →
          </button>
          <p className="text-xs text-gray-400 text-center">
            Pago seguro procesado por Stripe. {stripeLive ? "En modo real." : "Solo en modo test."}
            Al pagar crearemos tu cuenta de cliente y empezaremos a responder tus reseñas de inmediato.
          </p>
        </div>
      ) : (
        <CheckoutForm
          clientSecret={clientSecret}
          businessName={offer?.businessName || ""}
          stripeLive={stripeLive}
        />
      )}
    </Shell>
  )
}

function CheckoutForm({
  clientSecret,
  businessName,
  stripeLive,
}: {
  clientSecret: string
  businessName: string
  stripeLive: boolean
}) {
  const options: StripeElementsOptions = { clientSecret, appearance: { theme: "stripe" } }

  return (
    <div className="bg-white rounded-xl border p-6">
      <Elements stripe={stripePromise} options={options}>
        <StripeForm businessName={businessName} stripeLive={stripeLive} />
      </Elements>
    </div>
  )
}

function StripeForm({
  businessName,
  stripeLive,
}: {
  businessName: string
  stripeLive: boolean
}) {
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

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })

    if (submitError) {
      setError(submitError.message ?? "Error al procesar el pago")
      setProcessing(false)
      return
    }

    setMessage("¡Pago completado! Estamos dando de alta tu servicio y tu cuenta de cliente.")
    setProcessing(false)
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
        {!stripeLive && (
          <p>
            <strong>Modo test:</strong> usa la tarjeta{" "}
            <code className="bg-white border px-1 rounded">4242 4242 4242 4242</code>, fecha de
            caducidad futura y CVC cualquiera.
          </p>
        )}
        <p className="mt-1">
          Plan de Lanzamiento · 79€ primer mes (49€ + 30€ alta) · {businessName}
        </p>
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[var(--color-primary)] text-white px-4 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium"
      >
        {processing ? "Procesando pago..." : "Pagar 79€ ahora"}
      </button>
    </form>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl border-b border-[var(--color-border)] px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-lg flex items-center justify-center shadow-md shadow-blue-200/50">
            <span className="text-white text-sm font-bold font-[family-name:var(--font-heading)]">O</span>
          </div>
          <span className="text-lg font-bold text-[var(--color-foreground)] font-[family-name:var(--font-heading)]">
            {process.env.NEXT_PUBLIC_APP_NAME || "OpiniLab"}
          </span>
        </div>
      </header>
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-gray-400">
        <p>Pago procesado por Stripe · {process.env.NEXT_PUBLIC_APP_NAME || "OpiniLab"}</p>
      </footer>
    </div>
  )
}