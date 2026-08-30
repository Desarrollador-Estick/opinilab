// Middleware de bajo nivel para la API de Groq (compatible con chat completions de OpenAI).
// Reutilizado por los endpoints que generan contenido con IA (respuestas a reseñas,
// informes GBP, etc.). Nunca se usa una clave en el cliente (navegador).

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

export type GroqMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type GroqOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Realiza una llamada de chat completions a Groq y devuelve el texto de la respuesta.
 * Lanza un Error si no hay clave configurada, si la API responde con error o si no
 * devuelve contenido.
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
    model = "llama-3.3-70b-versatile",
    temperature = 0.7,
    maxTokens = 800,
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
    throw new Error(`Groq error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("Groq no devolvió contenido")
  }

  return content
}
