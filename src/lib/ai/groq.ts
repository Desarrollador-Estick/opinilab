// Middleware de bajo nivel para la API de Groq (compatible con chat completions de OpenAI).
// Reutilizado por los endpoints que generan contenido con IA (respuestas a reseñas,
// informes GBP, etc.). Nunca se usa una clave en el cliente (navegador).
//
// Cada llamada exitosa registra una fila en `usage_logs` (vía service role) para que
// el panel "Consumo & Límites" muestre el uso real de tokens. Nunca rompe el flujo:
// si el registro falla, solo loguea en consola.

import { createServerAdminClient } from "@/lib/supabase/admin"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

export type GroqMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type GroqUsage = {
  category?: string
  clientId?: string | null
  leadId?: string | null
}

export type GroqOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
  usage?: GroqUsage
}

async function recordUsage(entry: {
  model: string
  inputTokens: number
  outputTokens: number
  usage?: GroqUsage
  status?: string
  errorMessage?: string | null
}) {
  try {
    const client = await createServerAdminClient()
    await client.from("usage_logs").insert({
      provider: "groq",
      model: entry.model,
      category: entry.usage?.category ?? null,
      client_id: entry.usage?.clientId ?? null,
      lead_id: entry.usage?.leadId ?? null,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      estimated_tokens: entry.inputTokens + entry.outputTokens,
      status: entry.status ?? "success",
      error_message: entry.errorMessage ?? null,
    })
  } catch (e) {
    console.error("[groq] No se pudo registrar usage_logs:", e)
  }
}

/**
 * Realiza una llamada de chat completions a Groq y devuelve el texto de la respuesta.
 * Lanza un Error si no hay clave configurada, si la API responde con error o si no
 * devuelve contenido. Opcionalmente registra el uso real en `usage_logs`.
 */
export async function groqChat(
  messages: GroqMessage[],
  options: GroqOptions = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY no configurada")
  }

  const {
    model = "qwen/qwen3.8-27b",
    temperature = 0.7,
    maxTokens = 800,
    usage,
  } = options

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    const msg = `Groq error ${res.status}: ${errText.slice(0, 300)}`
    await recordUsage({
      model,
      inputTokens: 0,
      outputTokens: 0,
      usage,
      status: "error",
      errorMessage: msg,
    })
    throw new Error(msg)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    await recordUsage({
      model,
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
      usage,
      status: "error",
      errorMessage: "Groq no devolvió contenido",
    })
    throw new Error("Groq no devolvió contenido")
  }

  await recordUsage({
    model,
    inputTokens: data?.usage?.prompt_tokens ?? 0,
    outputTokens: data?.usage?.completion_tokens ?? 0,
    usage,
  })

  return content
}
