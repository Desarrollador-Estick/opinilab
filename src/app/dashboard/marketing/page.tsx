"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"

interface SocialPost {
  id: string
  client_id: string
  social_account_id: string | null
  clients?: { business_name: string } | null
  platform: "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok"
  content: string | null
  media_urls: string[] | null
  scheduled_at: string | null
  published_at: string | null
  status: "draft" | "scheduled" | "published" | "archived"
  engagement_likes: number | null
  engagement_comments: number | null
  engagement_shares: number | null
  created_at: string
}

interface Client {
  id: string
  business_name: string
}

const platforms = ["Instagram", "Facebook", "TikTok", "LinkedIn", "Twitter"]

export default function MarketingPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [activeTab, setActiveTab] = useState<"calendar" | "create" | "analytics">("calendar")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [postContent, setPostContent] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMessage, setAiMessage] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [postsRes, clientsRes] = await Promise.all([
      supabase
        .from("social_posts")
        .select("*, clients(business_name)")
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, business_name")
        .eq("status", "active")
        .order("business_name"),
    ])
    setPosts((postsRes.data as SocialPost[]) || [])
    setClients((clientsRes.data as Client[]) || [])
    setLoading(false)
  }

  const filteredPosts = posts.filter((p) => {
    if (!p.scheduled_at && !p.published_at) return true
    const date = p.scheduled_at || p.published_at
    return date?.startsWith(selectedMonth)
  })

  const publishedPosts = posts.filter((p) => p.status === "published")
  const scheduledPosts = posts.filter((p) => p.status === "scheduled")
  const totalEngagement = posts.reduce(
    (sum, p) => sum + (p.engagement_likes ?? 0) + (p.engagement_comments ?? 0) + (p.engagement_shares ?? 0),
    0
  )

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlatform || !postContent.trim()) return
    setCreating(true)
    const { error } = await supabase.from("social_posts").insert({
      client_id: selectedClient as string,
      platform: selectedPlatform.toLowerCase() as "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok",
      content: postContent,
      scheduled_at: scheduledDate || null,
      status: (scheduledDate ? "scheduled" : "draft") as "draft" | "scheduled",
    })
    if (!error) {
      setPostContent("")
      setSelectedPlatform("")
      setScheduledDate("")
      setSelectedClient("")
      loadData()
      setActiveTab("calendar")
    }
    setCreating(false)
  }

  async function handleGenerateAi() {
    setAiMessage("")
    if (!selectedClient) {
      setAiMessage("Selecciona un cliente para que la IA genere contenido editorial a su nombre.")
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch("/api/services/run-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selectedClient, category: "social_media" }),
      })
      const json = await res.json()
      if (!json.success) {
        setAiMessage(json.error || "No se pudo generar el contenido con IA.")
        return
      }
      setPostContent(json.content || "")
    } catch {
      setAiMessage("Error al conectar con la IA.")
    } finally {
      setAiLoading(false)
    }
  }

  function generateCalendarDays() {
    const [year, month] = selectedMonth.split("-").map(Number)
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const days: { date: Date; posts: SocialPost[] }[] = []
    const startPad = (firstDay.getDay() + 6) % 7

    for (let i = 0; i < startPad; i++) {
      days.push({ date: new Date(year, month - 1, -startPad + i + 1), posts: [] })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const dayPosts = filteredPosts.filter(
        (p) => (p.scheduled_at || p.published_at || "").startsWith(dateStr)
      )
      days.push({ date: new Date(year, month - 1, d), posts: dayPosts })
    }
    while (days.length % 7 !== 0) {
      days.push({ date: new Date(year, month, days.length - startPad - lastDay.getDate() + 1), posts: [] })
    }
    return days
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Marketing & Redes Sociales</h2>
          <p className="text-gray-500">Gestión de contenido y campañas</p>
        </div>
        <button
          onClick={() => setActiveTab("create")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Crear Post
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["calendar", "create", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "calendar" ? "📅 Calendario" : tab === "create" ? "✏️ Crear" : "📊 Analítica"}
          </button>
        ))}
      </div>

      {activeTab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-4 py-2 text-sm"
            />
            <div className="flex gap-3 text-sm text-gray-500">
              <span>Publicados: <strong className="text-gray-800">{publishedPosts.length}</strong></span>
              <span>Programados: <strong className="text-gray-800">{scheduledPosts.length}</strong></span>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500">
                  {d}
                </div>
              ))}
              {generateCalendarDays().map((day, i) => {
                const isCurrentMonth = day.date.toISOString().startsWith(selectedMonth)
                return (
                  <div
                    key={i}
                    className={`bg-white p-2 min-h-[80px] ${isCurrentMonth ? "" : "opacity-30"}`}
                  >
                    <p className="text-xs text-gray-500 mb-1">{day.date.getDate()}</p>
                    {day.posts.map((post) => (
                      <div
                        key={post.id}
                        className={`text-xs px-1.5 py-0.5 rounded mb-0.5 truncate ${
                          post.status === "published"
                            ? "bg-green-100 text-green-700"
                            : post.status === "scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                        title={post.content || ""}
                      >
                        {post.platform}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {filteredPosts.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Cliente</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Plataforma</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Contenido</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{post.clients?.business_name || "General"}</td>
                      <td className="px-4 py-3 text-sm capitalize">{post.platform}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{post.content}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(post.scheduled_at || post.published_at || "")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            post.status === "published"
                              ? "bg-green-100 text-green-800"
                              : post.status === "scheduled"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Crear Nuevo Post</h3>
          <form onSubmit={handleCreatePost} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium mb-1">Cliente</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                <option value="">Sin cliente (general)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Plataforma *</label>
              <div className="flex gap-2">
                {platforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPlatform(p.toLowerCase())}
                    className={`px-3 py-1.5 border rounded-lg text-sm transition ${
                      selectedPlatform === p.toLowerCase()
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contenido *</label>
              <textarea
                rows={4}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
                placeholder="Escribe tu post o usa la IA para generarlo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Programar para (opcional)</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !selectedPlatform || !postContent.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
              >
                {creating ? "Creando..." : scheduledDate ? "Programar" : "Guardar Borrador"}
              </button>
              <button
                type="button"
                disabled={aiLoading || !selectedClient}
                onClick={handleGenerateAi}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition text-sm disabled:opacity-50"
              >
                {aiLoading ? "Generando..." : "Generar con IA"}
              </button>
            </div>
            {aiMessage && (
              <p className={`text-sm ${aiMessage.startsWith("Selecciona") ? "text-amber-600" : "text-red-600"}`}>
                {aiMessage}
              </p>
            )}
          </form>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Posts publicados</p>
              <p className="text-2xl font-bold">{publishedPosts.length}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Programados</p>
              <p className="text-2xl font-bold">{scheduledPosts.length}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total engagement</p>
              <p className="text-2xl font-bold">{totalEngagement}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-gray-500">Engagement medio</p>
              <p className="text-2xl font-bold">
                {publishedPosts.length > 0
                  ? Math.round(totalEngagement / publishedPosts.length)
                  : 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Engagement por plataforma</h3>
            <div className="space-y-3">
              {platforms.map((p) => {
                const platformPosts = publishedPosts.filter(
                  (pp) => pp.platform === p.toLowerCase()
                )
                const likes = platformPosts.reduce((s, pp) => s + (pp.engagement_likes ?? 0), 0)
                const comments = platformPosts.reduce((s, pp) => s + (pp.engagement_comments ?? 0), 0)
                const shares = platformPosts.reduce((s, pp) => s + (pp.engagement_shares ?? 0), 0)
                const total = likes + comments + shares
                return (
                  <div key={p} className="flex items-center gap-4">
                    <span className="w-24 text-sm font-medium">{p}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: totalEngagement > 0 ? `${(total / totalEngagement) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-20 text-right">
                      ❤️ {likes} 💬 {comments} 🔄 {shares}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-3">Estado de cuentas conectadas</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {platforms.map((p) => (
                <div key={p} className="border rounded-lg p-3 text-center">
                  <p className="text-sm font-medium">{p}</p>
                  <p className="text-xs text-yellow-600 mt-1">No conectada</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              La conexión de redes sociales está pendiente de integración con la API de cada plataforma.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
