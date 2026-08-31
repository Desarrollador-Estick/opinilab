import Link from "next/link"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer" aria-label="OpiniLab - Inicio">
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-lg flex items-center justify-center shadow-md shadow-blue-200/50">
                <span className="text-white text-sm font-bold font-[family-name:var(--font-heading)]">O</span>
              </div>
              <span className="text-lg font-bold text-[var(--color-foreground)] font-[family-name:var(--font-heading)]">
                OpiniLab
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {[
                { href: "#servicios", label: "Servicios" },
                { href: "#como-funciona", label: "Cómo funciona" },
                { href: "#resultados", label: "Resultados" },
                { href: "#faq", label: "FAQ" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-muted)] transition-all duration-200 cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] font-medium transition-colors px-3 py-2"
              >
                Iniciar sesión
              </Link>
              <a
                href="#contacto"
                className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:from-[var(--color-primary-dark)] hover:to-[var(--color-primary)] transition-all duration-300 shadow-md shadow-blue-200/50 cursor-pointer"
              >
                Pedir presupuesto
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold font-[family-name:var(--font-heading)]">O</span>
                </div>
                <span className="text-lg font-bold text-white font-[family-name:var(--font-heading)]">OpiniLab</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 max-w-xs">
                Agencia de marketing digital. Gestionamos las reseñas de tu negocio en Google, tus redes sociales, tu SEO y tus anuncios para que tu negocio crezca.
              </p>
              <div className="flex gap-3">
                {[
                  { label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                  { label: "LinkedIn", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                  { label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
                ].map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                    aria-label={social.label}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={social.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider font-[family-name:var(--font-heading)]">
                Servicios
              </h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#servicios" className="hover:text-white transition-colors cursor-pointer">Gestión de reseñas</a></li>
                <li><a href="#servicios" className="hover:text-white transition-colors cursor-pointer">Community Management</a></li>
                <li><a href="#servicios" className="hover:text-white transition-colors cursor-pointer">SEO</a></li>
                <li><a href="#servicios" className="hover:text-white transition-colors cursor-pointer">Publicidad online</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider font-[family-name:var(--font-heading)]">
                Empresa
              </h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#como-funciona" className="hover:text-white transition-colors cursor-pointer">Cómo funciona</a></li>
                <li><a href="#resultados" className="hover:text-white transition-colors cursor-pointer">Resultados</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors cursor-pointer">Preguntas frecuentes</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider font-[family-name:var(--font-heading)]">
                Contacto
              </h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#contacto" className="hover:text-white transition-colors cursor-pointer">Pedir presupuesto</a></li>
                <li><a href="#contacto" className="hover:text-white transition-colors cursor-pointer">Auditoría gratuita</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors cursor-pointer">Política de privacidad</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">&copy; 2026 OpiniLab. Todos los derechos reservados.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors cursor-pointer">Términos</a>
              <a href="#" className="hover:text-white transition-colors cursor-pointer">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors cursor-pointer">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
