/**
 * WhatsApp Business Cloud API client for OpiniLab.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Requires env vars:
 *   WHATSAPP_PHONE_NUMBER_ID    — Phone number ID from Meta Business Suite
 *   WHATSAPP_ACCESS_TOKEN       — System user access token
 */

const GRAPH_API = "https://graph.facebook.com/v21.0"

interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
}

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    return null
  }
  return { phoneNumberId, accessToken }
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null
}

/**
 * Send a free-form text message via WhatsApp Cloud API.
 * Free-form messages only work within the 24h customer service window.
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
