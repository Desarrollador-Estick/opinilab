"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const TRACK_ENDPOINT = "/api/analytics/track"

let visitorId: string | null = null
function getVisitorId() {
  if (visitorId) return visitorId
  try {
    visitorId = localStorage.getItem("opinilab_vid") || ""
    if (!visitorId) {
      visitorId =
        Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem("opinilab_vid", visitorId)
    }
  } catch {
    visitorId = Math.random().toString(36).slice(2)
  }
  return visitorId
}

function fire(event_type: "visit" | "click", label?: string, url?: string) {
  let path = "/"
  try {
    path = window.location.pathname || "/"
  } catch {}
  const payload = {
    event_type,
    label: label || null,
    path,
    url: url || null,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    visitor_id: getVisitorId(),
  }
  try {
    navigator.sendBeacon?.(
      TRACK_ENDPOINT,
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    )
  } catch {}
}

export default function TrackingProvider() {
  const pathname = usePathname()

  useEffect(() => {
    fire("visit")

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest("a[href], button") as
        | HTMLAnchorElement
        | HTMLButtonElement
        | null
      if (!el) return

      const trackLabel = el.getAttribute("data-track")
      const text = (el.textContent || "").trim().slice(0, 40)
      let href: string | null = null
      if (el instanceof HTMLAnchorElement) href = el.getAttribute("href")
      const label =
        trackLabel ||
        (el instanceof HTMLAnchorElement
          ? `link:${href || "absent"}`
          : text
            ? `boton:${text}`
            : "boton")

      fire("click", label, href || undefined)
    }

    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [pathname])

  return null
}
