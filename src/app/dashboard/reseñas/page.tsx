"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, getStatusColor } from "@/lib/utils"

interface Review {
  id: string
  client_id: string
  clients?: { business_name: string } | null
  platform: string
  reviewer_name: string | null
  rating: number | null
  review_text: string | null
  review_date: string | null
  response_text: string | null
  response_date: string | null
  status: string
  review_url: string | null
}

const responseTemplates = [
  {
    name: "Agradecimiento positivo",
    text: "¡Muchas gracias por tu reseña, {nombre}! Nos alegra saber que estás satisfecho con nuestro servicio. ¡Seguiremos trabajando para ofrecerte lo mejor!",
  },
  {
    name: "Respuesta neutral",
    text: "Gracias por tus comentarios, {nombre}. Valoramos mucho tu opinión y la usaremos para mejorar. Si tienes alguna consulta, no dudes en contactarnos.",
  },
  {
    name: "Gestión negativa",
    text: "{nombre}, lamentamos que no hayas tenido la experiencia que esperabás. Nos encantaría poder solucionarlo. Por favor, contáctanos directamente para poder ayudarte.",
  },
]

export default function ResenasPage() {
  const supabase = createClient()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPlatform, setFilterPlatform] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [])

  async function loadReviews() {
    setLoading(true)
    const { data } = await supabase
      .from("reviews")
      .select("*, clients(business_name)")
      .order("created_at", { ascending: false })
    setReviews((data as Review[]) || [])
    setLoading(false)
  }

  const filtered = reviews.filter((r) => {
    if (filterPlatform !== "all" && r.platform !== filterPlatform) return false
    if (filterStatus !== "all" && r.status !== filterStatus) return false
    return true
  })

  const totalReviews = reviews.length
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : "—"
  const respondedCount = reviews.filter((r) => r.status === "responded").length
  const pendingCount = reviews.filter((r) => r.status === "new").length

  async function handleRespond(reviewId: string) {
    if (!responseText.trim()) return
    setSending(true)
    const { error } = await supabase
      .from("reviews")
      .update({
        response_text: responseText,
        response_date: new Date().toISOString(),
        status: "responded",
      })
      .eq("id", reviewId)
    if (!error) {
      setRespondingTo(null)
      setResponseText("")
      loadReviews()
    }
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Reseñas</h2>
          <p className="text-gray-500">Monitorea y responde reseñas de tus clientes</p>
        </div>
        <Link
          href="/dashboard/reseñas/solicitar"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Enviar Solicitud de Reseña
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Reseñas</p>
          <p className="text-2xl font-bold">{totalReviews}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Valoración Media</p>
          <p className="text-2xl font-bold text-yellow-500">⭐ {avgRating}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Respondidas</p>
          <p className="text-2xl font-bold text-green-600">{respondedCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex gap-4 flex-wrap">
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm"
        >
          <option value="all">Todas las plataformas</option>
          <option value="google">Google</option>
          <option value="trustpilot">Trustpilot</option>
          <option value="facebook">Facebook</option>
          <option value="yelp">Yelp</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="new">Nuevas</option>
          <option value="responded">Respondidas</option>
          <option value="flagged">Marcadas</option>
          <option value="archived">Archivadas</option>
        </select>
        <span className="text-sm text-gray-500 self-center">
          {filtered.length} reseña{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando reseñas...</div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
              <p className="text-4xl mb-2">⭐</p>
              <p>No hay reseñas con los filtros seleccionados</p>
            </div>
          ) : (
            filtered.map((review) => (
              <div key={review.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{review.reviewer_name || "Anónimo"}</span>
                      <span className="text-yellow-500">
                        {"⭐".repeat(review.rating || 0)}
                      </span>
                      <span className="text-xs text-gray-400">{review.platform}</span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}
                      >
                        {review.status === "new"
                          ? "Nueva"
                          : review.status === "responded"
                            ? "Respondida"
                            : review.status === "flagged"
                              ? "Marcada"
                              : "Archivada"}
                      </span>
                      {review.clients?.business_name && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {review.clients.business_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{review.review_text}</p>

                    {review.response_text && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                        <p className="font-medium text-blue-800 text-xs mb-1">Respuesta:</p>
                        <p className="text-blue-700">{review.response_text}</p>
                      </div>
                    )}

                    {respondingTo === review.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                        <p className="text-xs font-medium text-gray-700">Plantillas rápidas:</p>
                        <div className="flex gap-2 flex-wrap">
                          {responseTemplates.map((tpl) => (
                            <button
                              key={tpl.name}
                              onClick={() =>
                                setResponseText(
                                  tpl.text.replace(
                                    "{nombre}",
                                    review.reviewer_name || "estimado cliente"
                                  )
                                )
                              }
                              className="text-xs px-2 py-1 bg-white border rounded hover:bg-blue-50 transition"
                            >
                              {tpl.name}
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          placeholder="Escribe tu respuesta..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(review.id)}
                            disabled={sending || !responseText.trim()}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            {sending ? "Enviando..." : "Enviar Respuesta"}
                          </button>
                          <button
                            onClick={() => {
                              setRespondingTo(null)
                              setResponseText("")
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm border hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-400 ml-4 shrink-0">
                    {review.review_date && (
                      <p>{formatDate(review.review_date)}</p>
                    )}
                    {review.status === "new" && respondingTo !== review.id && (
                      <button
                        onClick={() => setRespondingTo(review.id)}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Responder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
