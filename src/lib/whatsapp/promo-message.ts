/**
 * WhatsApp Business Cloud API client for OpiniLab.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Requires env vars:
 *   WHATSAPP_PHONE_NUMBER_ID    — Phone number ID from Meta Business Suite
 *   WHATSAPP_ACCESS_TOKEN       — System user access token
 *   WHATSAPP_BUSINESS_ACCOUNT_ID — WhatsApp Business Account ID
 */

const GRAPH_API = "https://graph.facebook.com/v21.0"

interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
}

interface StatusResult {
  ok: boolean
  status?: string
  error?: string
}

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  if (!phoneNumberId || !accessToken) {
    return null
  }
  return { phoneNumberId, accessToken, businessAccountId }
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null
}

/**
 * Send a free-form text message via WhatsApp Cloud API.
 * Note: Free-form messages are only allowed within the 24h customer service window.
 * Outside that window, you need a pre-approved template message.
 */
export async function sendWhatsAppText(
  phone: string,
  message: string
): Promise<SendResult> {
  const config = getConfig()
  if (!config) {
    return { ok: false, error: "WhatsApp no configurado" }
  }

  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "").replace(/^00/, "+")

  try {
    const res = await fetch(
      `${GRAPH_API}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleaned,
          type: "text",
          text: { body: message },
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      const errMsg =
        data?.error?.message || `HTTP ${res.status}: Error al enviar WhatsApp`
      return { ok: false, error: errMsg }
    }

    const messageId = data?.messages?.[0]?.id
    return { ok: true, messageId }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red al enviar WhatsApp",
    }
  }
}

/**
 * Send a template message via WhatsApp Cloud API.
 * Templates must be pre-approved by Meta and live in your WhatsApp Business Account.
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  languageCode: string = "es",
  params?: { type: "body"; parameters: { type: "text"; text: string }[] }
): Promise<SendResult> {
  const config = getConfig()
  if (!config) {
    return { ok: false, error: "WhatsApp no configurado" }
  }

  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "").replace(/^00/, "+")

  try {
    const res = await fetch(
      `${GRAPH_API}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleaned,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(params ? { components: [params] } : {}),
          },
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      const errMsg =
        data?.error?.message || `HTTP ${res.status}: Error al enviar plantilla WhatsApp`
      return { ok: false, error: errMsg }
    }

    const messageId = data?.messages?.[0]?.id
    return { ok: true, messageId }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red al enviar plantilla",
    }
  }
}

/**
 * Check the status of a previously sent message.
 */
export async function getMessageStatus(
  messageId: string
): Promise<StatusResult> {
  const config = getConfig()
  if (!config) {
    return { ok: false, error: "WhatsApp no configurado" }
  }

  try {
    const res = await fetch(
      `${GRAPH_API}/${messageId}?fields=status`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return { ok: false, error: data?.error?.message || "Error consultando estado" }
    }

    return { ok: true, status: data?.status }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red",
    }
  }
}
