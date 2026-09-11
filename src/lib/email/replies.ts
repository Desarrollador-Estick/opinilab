import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { groqChat } from "@/lib/ai/groq"

// Agente de ventas IA: interpreta las respuestas entrantes de los leads
// (vía Resend Inbound) y las prepara para responder. Siempre con dos frenos
// de seguridad:
//   - La respuesta se genera SOLO con datos reales del lead + la oferta de
//     lanzamiento; el modelo tiene prohibido inventar precios, plazos o
//     promesas.
//   - Un 'sí' NUNCA se cierra solo: queda como borrador (draft) y el cierre
//     (contrato/factura) lo aprueba un humano en /dashboard/leads.
//
// Necesita para funcionar de verdad:
//   - Resend Inbound configurado (dominio entrante con MX en el DNS) apuntando
//     al webhook /api/email/inbound.
//   - INBOUND_REPLY_TO en Vercel con la dirección entrante (p.ej.
//     responde@inbound.opinilab.com) para que los emails de campaña lleven
//     Reply-To → las réplicas vuelven al agente.

export type LeadReplyType =
  | "yes"
  | "no"
  | "question"
  | "objection"
  | "unsubscribe"
  | "unresolved"

export interface ReplyClassification {
  type: LeadReplyType
  confidence: number
  reason: string
}

export interface InboundPayload {
  fromEmail: string
  fromName: string | null
  toAddr: string | null
  subject: string | null
  text: string | null
  html: string | null
  messageId: string | null
  inReplyTo: string | null
}

export const REPLY_TYPE_LABELS: Record<LeadReplyType, string> = {
  yes: "Sí, quiere contratar",
  no: "No interesado",
  question: "Pregunta",
  objection: "Objeción",
  unsubscribe: "Pide baja",
  unresolved: "Sin clasificar",
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase()
}

/** Guarda en la BD una respuesta entrante y devuelve la fila creada. */
export async function insertIncomingReply(
  supabase: SupabaseClient<Database>,
  payload: InboundPayload,
  leadId: string | null
): Promise<{ id: string | null; error?: string }> {
  const { data, error } = await supabase
    .from("email_replies")
    .insert({
      lead_id: leadId,
      email_from: normalizeEmail(payload.fromEmail),
      from_name: payload.fromName,
      to_addr: payload.toAddr,
      subject: payload.subject,
      text_body: payload.text,
      message_id: payload.messageId,
      in_reply_to: payload.inReplyTo,
      reply_status: "pending",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle()

  if (error) {
    return { id: null, error: error.message }
  }
  return { id: data?.id ?? null }
}

/** Recorta la cita (partes del mensaje original) que suelen traer las réplicas. */
export function stripQuotedEmail(raw: string | null | undefined): string {
  if (!raw) return ""
  const lines = raw.split(/\r?\n/)
  const out: string[] = []
  let inQuote = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      !inQuote &&
      (/^(-{3,}|_+)\s*(Original Message|Mensaje original|Forwarded|Reenviado)/i.test(trimmed) ||
        /^\s*de:\s/i.test(trimmed) ||
        /^\s*(from|sent|to|cc|subject):\s/i.test(trimmed) ||
        /^\s*(el|the)\s+\w+\s+(\d{1,2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(trimmed) ||
        /^\s*--+\s*$/.test(trimmed))
    ) {
      inQuote = true
      continue
    }
    if (inQuote) continue
    if (/^>/.test(trimmed) || /^\s*\|/.test(trimmed)) continue
    out.push(line)
  }
  return out.join("\n").trim()
}

/** Detecta rápidamente un `sí`/`no`/pregunta cuando falla la API de IA. */
export function classifyByKeywords(text: string): ReplyClassification {
  const body = ` ${text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")} `

  const has = (re: RegExp) => re.test(body)

  if (
    has(/darme de baja|darme de alta no|dejar de recibir|quitar(me)? de|baja de|no quiero recibir|spam|stop|elimina(me)? de/)
  ) {
    return { type: "unsubscribe", confidence: 0.95, reason: "palabras de baja detectadas" }
  }
  if (
    has(/si, (quiero|vamos|adelante|empezar|contrato|dale)|si quiero|me interesa|adelante|para adelante|hablemos|quiero empezar|estoy interesado|me parece bien|acepto|como hacemos para|vamos a ello|si, |\\bsi!!|sii+\\b/)
  ) {
    return { type: "yes", confidence: 0.8, reason: "indicaciones de interés" }
  }
  if (
    has(/no te (interesa|viene bien)|no (me )?(interesa|gracias)|no gracias|ya tengo|ya trabajo|por ahora no|ahora no|cuesta caro|no voy a|no tengo presupuesto|lo siento/)
  ) {
    return { type: "no", confidence: 0.8, reason: "desinterés explícito" }
  }
  if (has(/\?/) || has(/cuanto cuesta|cuanto es|que precio|que incluye|cual es el presupuesto|tarifas|que servicios|como funciona|en que consiste|que me ofreces|cudrias|condiciones/)) {
    return { type: "question", confidence: 0.75, reason: "pregunta detectada" }
  }
  if (
    has(/ya tengo alguien|ya tengo agencia|demasiado caro|muy caro|no tengo tiempo|lo pensar|cuesta mucho|no me lo puedo permitir|no me interesa vuestro|ya trabajo con otra/)
  ) {
    return { type: "objection", confidence: 0.75, reason: "objeción detectada" }
  }
  return { type: "unresolved", confidence: 0.5, reason: "sin patrón claro" }
}

const CLASSIFY_SYSTEM_PROMPT = `Eres la IA de clasificación de respuestas de ventas de OpiniLab, una agencia de marketing digital para negocios locales (reseñas de Google, visibilidad y captación de clientes). Un negocio local ha respondido a un email de captación que recibió.

Clasifica su mensaje en UNA de estas categorías:
- yes: acepta la oferta, pide empezar, quiere que le contactemos o está claramente interesado.
- no: no está interesado o rechaza la oferta.
- question: pregunta por precio, servicios, cómo funciona, condiciones o cualquier duda.
- objection: pone pegas o dudas que frenan la decisión (ya tengo proveedor, es caro, no tengo tiempo, lo pensaré...).
- unsubscribe: pide que dejemos de escribirle / darse de baja.
- unresolved: el texto no tiene relación clara con la venta o es ilegible.

Responde SOLO con JSON válido en una línea, sin texto extra:
{"type":"yes|no|question|objection|unsubscribe|unresolved","confidence":0.9,"reason":"1 frase corta en español"}`

export async function classifyLeadReply(
  text: string,
  ctx: { businessName: string; contactName: string | null; offer: string }
): Promise<ReplyClassification> {
  const stripped = stripQuotedEmail(text)
  const userPrompt = `Lead: ${ctx.businessName} (contacto: ${ctx.contactName || "anonimo"}). Oferta mostrada: ${ctx.offer}\n\nMensaje del lead:\n"""${stripped.slice(0, 1500)}"""`

  try {
    const raw = await groqChat(
      [
        { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      {
        model: "qwen/qwen3.8-27b",
        temperature: 0,
        maxTokens: 120,
        usage: { category: "sales_agent_classify" },
      }
    )
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    if (parsed && typeof parsed.type === "string" && parsed.type in REPLY_TYPE_LABELS) {
      return {
        type: parsed.type as LeadReplyType,
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
        reason: String(parsed.reason || "").slice(0, 200),
      }
    }
  } catch {
    // Si la IA falla (sin GROQ_KEY, timeout...), se usa el clasificador local.
  }

  return classifyByKeywords(stripped)
}

const FALLBACK_REPLIES: Record<LeadReplyType, (ctx: { contactName: string; businessName: string; offer: string }) => string> = {
  yes: (ctx) =>
    `¡Genial, ${ctx.contactName}! Me alegra muchísimo que quieras seguir adelante.\n\n` +
    `Para prepararte la propuesta formal necesito un dato: el enlace de tu ficha de Google Maps (si no lo tienes, lo creamos nosotros).\n\n` +
    `Nuestro equipo te envía en breve la propuesta y el siguiente paso. Si prefieres, respóndeme y me lo cuentas.`,
  question: (ctx) =>
    `Gracias por tu pregunta sobre ${ctx.businessName}.\n\n` +
    `Nuestra oferta de lanzamiento para negocios locales es de ${ctx.offer}. Nos encargamos de tus reseñas de Google, tu visibilidad online y la captación de clientes de tu zona.\n\n` +
    `Un asesor te responderá en detalle; si me cuentas tu duda concreta, te la resolvemos directamente.`,
  objection: (ctx) =>
    `Entiendo tu punto, ${ctx.contactName}.\n\n` +
    `Es justo por eso que muchos negocios como ${ctx.businessName} empiezan con nuestro plan de ${ctx.offer}: no requiere equipar marketing por tu cuenta y el análisis inicial es gratuito y sin compromiso.\n\n` +
    `Un asesor te llamará o responderá para ver si encaja; cuéntame tu inquietud y te ayudo.`,
  no: () => "",
  unsubscribe: () => "",
  unresolved: () =>
    `Gracias por escribirnos. Para ayudarte mejor, ¿podrías contarnos en qué podemos ayudarte con tu negocio o indicarnos si quieres dejar de recibir nuestros correos?`,
}

const AGENT_SYSTEM_PROMPT = `Eres la respuesta automática de ventas de OpiniLab, agencia de marketing digital para negocios locales (reseñas de Google, visibilidad y captación de clientes).

Escribe una respuesta breve, cercana y profesional en español, como la escribiría un comercial real.

REGLAS ESTRICTAS:
- SOLO puedes usar los datos del lead y la oferta de lanzamiento que se te dan. NUNCA inventes precios, plazos, condiciones ni promesas que no estén en ellos.
- Si la pregunta exige información que no tienes, responde que un asesor personal le responderá y pide el dato concreto (p. ej. el enlace de su ficha de Google Maps).
- Para un 'sí': confirma con entusiasmo y pide SIEMPRE el enlace de la ficha de Google Maps como siguiente paso; NO prometas contratos ni confirmes cobros.
- 2-4 frases máximo. No firmes con nombre inventado; termina con "Equipo de OpiniLab".`

export async function buildAgentReply(
  type: LeadReplyType,
  text: string,
  ctx: { contactName: string; businessName: string; offer: string }
): Promise<string> {
  const fallback = FALLBACK_REPLIES[type](ctx)
  const stripped = stripQuotedEmail(text)
  const userPrompt = `Lead: ${ctx.businessName} (contacto: ${ctx.contactName || "anonimo"}). Oferta de lanzamiento: ${ctx.offer}\nTipo de respuesta a dar: ${type}\n\nMensaje original del lead:\n"""${stripped.slice(0, 1200)}"""`

  try {
    const reply = await groqChat(
      [
        { role: "system", content: AGENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      {
        model: "qwen/qwen3.8-27b",
        temperature: 0.6,
        maxTokens: 320,
        usage: { category: "sales_agent_reply" },
      }
    )
    if (reply.trim().length > 8) {
      return reply.trim()
    }
  } catch {
    // Si la IA no está disponible, se usa la plantilla fallback.
  }
  return fallback
}