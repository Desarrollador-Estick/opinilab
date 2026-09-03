"use client"

import { useState } from "react"
import Link from "next/link"

const CONSENT_KEY = "cookie-consent"

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false
    return !localStorage.getItem(CONSENT_KEY)
  })

  const decide = (value: "accepted" | "rejected") => {
    localStorage.setItem(CONSENT_KEY, value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-[#0f172a] text-white rounded-2xl shadow-2xl border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2 font-[family-name:var(--font-heading)]">
              Utilizamos cookies
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Utilizamos cookies para mejorar su experiencia, analizar el tráfico y personalizar el contenido. Al continuar navegando, usted acepta nuestro uso de cookies. Para más información, consulte nuestra{" "}
              <Link href="/cookies" className="text-blue-400 hover:text-blue-300 underline">
                Política de Cookies
              </Link>.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => decide("rejected")}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-white/20 text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Rechazar
            </button>
            <button
              onClick={() => decide("accepted")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
