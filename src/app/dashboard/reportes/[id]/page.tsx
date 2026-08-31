"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatCurrency } from "@/lib/utils"

interface Report {
  id: string
  client_id: string
  clients?: { business_name: string; email: string } | null
  title: string
  report_type: string
  period_start: string | null
  period_end: string | null
  content: Record<string, unknown> | null
  status: string
  created_at: string
}

interface ReportSection {
  title: string
  value: string | number
  subtitle?: string
}

function extractSections(content: Record<string, unknown> | null): ReportSection[] {
  if (!content) return []
  const sections: ReportSection[] = []

  const knownKeys: Record<string, string> = {
    reviews: "Reseñas",
    revenue: "Ingresos",
    social: "Redes Sociales",
    tasks_completed: "Tareas Completadas",
  }

  for (const [key, label] of Object.entries(knownKeys)) {
    const val = content[key]
    if (val === undefined || val === null) continue

    if (typeof val === "object" && val !== null) {
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        if (subVal === undefined || subVal === null) continue
        sections.push({
          title: `${label} - ${subKey.replace(/_/g, " ")}`,
          value: typeof subVal === "number" && subKey.includes("total")
            ? formatCurrency(subVal)
            : String(subVal),
        })
      }
    } else {
      sections.push({ title: label, value: String(val) })
    }
  }

  return sections
}

export default function ReportDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const id = params.id as string
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  async function loadReport() {
    const { data } = await supabase
      .from("reports")
      .select("*, clients(business_name, email)")
      .eq("id", id)
      .single()
    setReport(data as Report | null)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSend() {
    if (!report) return
    setSending(true)
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: report.clients?.email,
        template: "report",
        data: {
          client_name: report.clients?.business_name,
          report_title: report.title,
          report_id: report.id,
        },
      }),
    })
    const data = await res.json()
    if (data.success) {
      await supabase
        .from("reports")
        .update({ status: "sent" })
        .eq("id", id)
      setReport({ ...report, status: "sent" })
    }
    setSending(false)
    alert(data.success ? "Reporte enviado" : "Error al enviar")
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando reporte...</div>
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Reporte no encontrado</p>
        <Link href="/dashboard/reportes" className="text-blue-600 hover:text-blue-800 text-sm">
          Volver a reportes
        </Link>
      </div>
    )
  }

  const sections = extractSections(report.content)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="no-print">
        <Link
          href="/dashboard/reportes"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Volver a Reportes
        </Link>
      </div>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold">{report.title}</h2>
          <p className="text-gray-500">{report.clients?.business_name || "Sin cliente"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Imprimir / PDF
          </button>
          {report.status !== "sent" && (
            <button
              onClick={handleSend}
              disabled={sending || !report.clients?.email}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Enviar al Cliente"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 print:shadow-none print:border-none">
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Periodo: {formatDate(report.period_start || "")} - {formatDate(report.period_end || "")}
          </p>
          <p className="text-sm text-gray-500">
            Generado: {formatDate(report.created_at)} | Tipo: {report.report_type}
          </p>
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${
              report.status === "sent"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {report.status}
          </span>
        </div>

        {sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{section.title}</p>
                <p className="text-xl font-bold mt-1">{section.value}</p>
                {section.subtitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{section.subtitle}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>Este reporte no tiene datos procesados</p>
          </div>
        )}

        {report.content && (
          <details className="mt-6">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Ver JSON completo
            </summary>
            <pre className="mt-2 bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto">
              {JSON.stringify(report.content, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
