import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos y Condiciones — OpiniLab",
  description:
    "Conoce los términos y condiciones de uso de los servicios de OpiniLab.",
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mb-8 font-[family-name:var(--font-heading)]">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-8">
          Última actualización: 3 de septiembre de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-[var(--color-muted-foreground)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              1. Aceptación de los términos
            </h2>
            <p>
              Al acceder y utilizar los servicios de OpiniLab (en adelante, &ldquo;el Servicio&rdquo;), usted acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo con alguno de estos términos, no debe utilizar el Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              2. Descripción del servicio
            </h2>
            <p>
              OpiniLab es una plataforma de marketing digital que ofrece servicios de gestión de reseñas, community management, SEO, publicidad online y otros servicios de marketing para negocios locales. La plataforma incluye herramientas de gestión de clientes, automatización con inteligencia artificial y análisis de resultados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              3. Registro y cuenta
            </h2>
            <p className="mb-3">
              Para utilizar el Servicio, usted debe crear una cuenta proporcionando información veraz y completa. Usted es responsable de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Todas las actividades que se realicen bajo su cuenta.</li>
              <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              4. Condiciones de contratación
            </h2>
            <p className="mb-3">
              Los servicios se contratan bajo las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Sin permanencia:</strong> los servicios se contratan mes a mes sin permanencia obligatoria.</li>
              <li><strong>Aviso de cancelación:</strong> para cancelar el servicio, el cliente debe comunicarlo con un mínimo de 30 días de antelación.</li>
              <li><strong>Precios:</strong> los precios se establecen en el momento de la contratación y pueden ser revisados con un aviso mínimo de 30 días.</li>
              <li><strong>Facturación:</strong> los pagos se procesan mensualmente a través de Stripe. El incumplimiento de pago puede resultar en la suspensión del servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              5. Obligaciones del cliente
            </h2>
            <p className="mb-3">
              El cliente se compromete a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar acceso a las plataformas necesarias para la prestación del servicio (Google Business, redes sociales, etc.).</li>
              <li>Responder a las comunicaciones en un plazo razonable.</li>
              <li>No utilizar el Servicio para fines ilícitos o que puedan dañar la reputación de terceros.</li>
              <li>Mantener actualizada su información de contacto y facturación.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              6. Propiedad intelectual
            </h2>
            <p>
              Todo el contenido, diseños, logotipos y código fuente de la plataforma OpiniLab son propiedad de OpiniLab y están protegidos por las leyes de propiedad intelectual. El cliente no adquiere ningún derecho de propiedad sobre la plataforma, solo una licencia de uso limitada durante la vigencia del contrato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              7. Limitación de responsabilidad
            </h2>
            <p className="mb-3">
              OpiniLab no será responsable de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Resultados específicos de marketing, ya que estos dependen de múltiples factores externos.</li>
              <li>Interrupciones del servicio causadas por fuerza mayor, mantenimiento de terceros o problemas técnicos fuera de nuestro control.</li>
              <li>Pérdidas de datos causadas por el incumplimiento del cliente de sus obligaciones de respaldo.</li>
              <li>Decisiones comerciales del cliente basadas en los datos o reportes proporcionados por el Servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              8. Garantía y soporte
            </h2>
            <p>
              OpiniLab se compromete a prestar el servicio con la máxima calidad y profesionalidad. El soporte técnico está disponible de lunes a viernes durante horario laboral. Los tiempos de respuesta varían según la complejidad de la consulta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              9. Resolución de disputas
            </h2>
            <p>
              Cualquier disputa derivada de estos Términos y Condiciones se resolverá preferentemente mediante negociación directa entre las partes. Si no se llega a un acuerdo, las partes se someten a la jurisdicción de los tribunales de España.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              10. Modificaciones
            </h2>
            <p>
              OpiniLab se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones serán comunicadas a los clientes con un mínimo de 15 días de antelación y entrarán en vigor tras ese período.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              11. Contacto
            </h2>
            <p>
              Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Email: <a href="mailto:info@opinilab.com" className="text-[var(--color-primary)] hover:underline">info@opinilab.com</a></li>
              <li>Sitio web: <a href="https://opinilab.com" className="text-[var(--color-primary)] hover:underline">opinilab.com</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
