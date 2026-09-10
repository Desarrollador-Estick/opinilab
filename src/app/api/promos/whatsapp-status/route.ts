import { NextResponse } from "next/server"
import { isWhatsAppConfigured } from "@/lib/whatsapp/cloud-api"

export async function GET() {
  return NextResponse.json({ configured: isWhatsAppConfigured() })
}
