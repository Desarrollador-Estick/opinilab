import Link from "next/link"
import { PortalNav } from "./portal-nav"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
      <header className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow duration-300">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight">
                OpiniLab
              </h1>
              <p className="text-[11px] text-blue-300/60 font-medium">Portal de cliente</p>
            </div>
          </Link>

          <PortalNav />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">O</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
              OpiniLab
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
            © 2026 OpiniLab. Marketing digital para negocios locales.
          </p>
        </div>
      </footer>
    </div>
  )
}
