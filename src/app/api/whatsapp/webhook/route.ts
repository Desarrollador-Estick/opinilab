import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Webhook for WhatsApp Cloud API delivery status updates.
// Configure in Meta Business Suite → WhatsApp → Configuration → Webhooks
// URL: https://www.opinilab.com/api/whatsapp/webhook
// Verify token: WHATSAPP_VERIFY_TOKEN env var

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const entries = body?.entry || []
    for (const entry of entries) {
      const changes = entry?.changes || []
      for (const change of changes) {
        const value = change?.value
        if (!value?.statuses) continue

        for (const status of value.statuses) {
          const providerMessageId = status?.id
          const msgStatus = status?.status // sent | delivered | read | failed

          if (!providerMessageId || !msgStatus) continue

          const dbStatus =
            msgStatus === "read"
              ? "read"
              : msgStatus === "delivered"
                ? "delivered"
                : msgStatus === "failed"
                  ? "failed"
                  : "sent"

          await supabase
            .from("whatsapp_sends")
            .update({
              status: dbStatus,
              error: status?.errors?.[0]?.title || null,
              updated_at: new Date().toISOString(),
            })
            .eq("provider_message_id", providerMessageId)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Always 200 for Meta webhook
  }
}
