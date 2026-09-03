import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Cookies — OpiniLab",
  description:
    "Conoce cómo OpiniLab utiliza las cookies y tecnologías de rastreo.",
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mb-8 font-[family-name:var(--font-heading)]">
          Política de Cookies
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-8">
          Última actualización: 3 de septiembre de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-[var(--color-muted-foreground)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              1. ¿Qué son las cookies?
            </h2>
            <p>
              Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (ordenador, tablet o móvil) cuando visita un sitio web. Permiten al sitio web recordar sus acciones y preferencias durante un período de tiempo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              2. Cookies que utilizamos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-[var(--color-border)] rounded-lg overflow-hidden">
                <thead className="bg-[var(--color-muted)]">
                  <tr>
                    <th className="text-left p-3 font-semibold text-[var(--color-foreground)]">Cookie</th>
                    <th className="text-left p-3 font-semibold text-[var(--color-foreground)]">Tipo</th>
                    <th className="text-left p-3 font-semibold text-[var(--color-foreground)]">Duración</th>
                    <th className="text-left p-3 font-semibold text-[var(--color-foreground)]">Propósito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <tr>
                    <td className="p-3">sb-access-token</td>
                    <td className="p-3">Sesión</td>
                    <td className="p-3">Sesión</td>
                    <td className="p-3">Autenticación del usuario (Supabase)</td>
                  </tr>
                  <tr>
                    <td className="p-3">sb-refresh-token</td>
                    <td className="p-3">Necesaria</td>
                    <td className="p-3">30 días</td>
                    <td className="p-3">Mantener la sesión del usuario</td>
                  </tr>
                  <tr>
                    <td className="p-3">cookie-consent</td>
                    <td className="p-3">Funcional</td>
                    <td className="p-3">365 días</td>
                    <td className="p-3">Recordar la preferencia de consentimiento de cookies</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              3. Cookies de terceros
            </h2>
            <p className="mb-3">
              Utilizamos servicios de terceros que pueden establecer cookies en su dispositivo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> procesamiento de pagos. Las cookies de Stripe son necesarias para procesar transacciones de forma segura.</li>
              <li><strong>Vercel Analytics:</strong> análisis del tráfico web. Nos ayuda a entender cómo se utiliza la plataforma para mejorar el servicio.</li>
              <li><strong>Google Fonts:</strong> carga de fuentes tipográficas para mejorar la experiencia visual.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              4. Cómo gestionar las cookies
            </h2>
            <p className="mb-3">
              Puede configurar su navegador para aceptar o rechazar cookies, o para notificarle cuando se establece una cookie:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
              <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies y datos del sitio</li>
              <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies y datos de sitios web</li>
              <li><strong>Edge:</strong> Configuración → Cookies y permisos de sitio</li>
            </ul>
            <p className="mt-3">
              Tenga en cuenta que deshabilitar ciertas cookies puede afectar el funcionamiento de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              5. Cookies necesarias
            </h2>
            <p>
              Las cookies necesarias son esenciales para el funcionamiento de la plataforma. Sin ellas, no sería posible iniciar sesión, procesar pagos o utilizar las funcionalidades principales. Estas cookies no requieren consentimiento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              6. Cambios en esta política
            </h2>
            <p>
              Nos reservamos el derecho de actualizar esta Política de Cookies en cualquier momento. Los cambios serán publicados en esta página con la fecha de la última actualización.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              7. Contacto
            </h2>
            <p>
              Si tiene preguntas sobre esta Política de Cookies, puede contactarnos a través de{" "}
              <a href="mailto:info@opinilab.com" className="text-[var(--color-primary)] hover:underline">
                info@opinilab.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
