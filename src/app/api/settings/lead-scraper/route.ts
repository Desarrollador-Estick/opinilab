import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "lead_scraper_config")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Not found" }, { status: 500 })
  }

  return NextResponse.json(data.value)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const config = {
    enabled: Boolean(body.enabled),
    daily_limit: Math.min(Math.max(Number(body.daily_limit) || 20, 1), 100),
    categories: Array.isArray(body.categories) ? body.categories : ["restaurant"],
    countries: Array.isArray(body.countries) ? body.countries : ["ES"],
    cities: Array.isArray(body.cities) ? body.cities : ["Madrid"],
    min_rating: Number(body.min_rating) || 0,
    min_reviews: Number(body.min_reviews) || 0,
    search_radius_m: Number(body.search_radius_m) || 5000,
    exclude_without_website: Boolean(body.exclude_without_website),
  }

  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        key: "lead_scraper_config",
        value: config,
        category: "automation",
        description: "Configuración del lead scraper automático (Overpass API / OpenStreetMap)",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, config })
}
