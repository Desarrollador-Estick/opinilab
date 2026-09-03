import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidad — OpiniLab",
  description:
    "Conoce cómo OpiniLab recopila, usa y protege tu información personal.",
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mb-8 font-[family-name:var(--font-heading)]">
          Política de Privacidad
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-8">
          Última actualización: 3 de septiembre de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-[var(--color-muted-foreground)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              1. Información que recopilamos
            </h2>
            <p className="mb-3">
              En OpiniLab recopilamos información que usted nos proporciona directamente al utilizar nuestros servicios:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Datos de identificación:</strong> nombre, apellidos, correo electrónico, teléfono y nombre de su negocio.</li>
              <li><strong>Datos de facturación:</strong> información de pago procesada a través de Stripe (no almacenamos datos de tarjeta de crédito).</li>
              <li><strong>Datos de uso:</strong> información sobre cómo utiliza nuestra plataforma, incluyendo páginas visitadas, acciones realizadas y preferencias.</li>
              <li><strong>Datos de terceros:</strong> información de su perfil de Google Business, redes sociales y plataformas publicitarias que usted nos autoriza a gestionar.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              2. Cómo utilizamos su información
            </h2>
            <p className="mb-3">
              Utilizamos su información para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Prestar y mejorar nuestros servicios de marketing digital.</li>
              <li>Gestionar su cuenta y proporcionar soporte al cliente.</li>
              <li>Procesar pagos y gestionar facturación.</li>
              <li>Enviar comunicaciones relacionadas con el servicio (actualizaciones, reportes, facturas).</li>
              <li>Analizar el uso de la plataforma para mejorar la experiencia del usuario.</li>
              <li>Cumplir obligaciones legales y fiscales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              3. Base legal del tratamiento
            </h2>
            <p className="mb-3">
              El tratamiento de sus datos se basa en:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Ejecución de un contrato:</strong> el tratamiento es necesario para prestar los servicios contratados.</li>
              <li><strong>Consentimiento:</strong> cuando usted nos proporciona datos de terceros (redes sociales, Google Business) nos autoriza expresamente a gestionarlos.</li>
              <li><strong>Interés legítimo:</strong> para mejorar nuestros servicios y prevenir fraude.</li>
              <li><strong>Obligación legal:</strong> para cumplir con normativas fiscales y de facturación.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              4. Conservación de datos
            </h2>
            <p>
              Conservamos sus datos personales mientras mantenga una cuenta activa en nuestra plataforma. Una vez cancelado el servicio, sus datos serán eliminados o anonimizados en un plazo máximo de 30 días, salvo que exista una obligación legal de conservarlos por un período superior.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              5. Compartición de datos
            </h2>
            <p className="mb-3">
              No vendemos ni compartimos sus datos personales con terceros, excepto en los siguientes casos:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Proveedores de servicios:</strong> Stripe (pagos), Supabase (base de datos y autenticación), Vercel (alojamiento), Groq (procesamiento de IA). Estos proveedores acceden a los datos estrictamente para prestar el servicio.</li>
              <li><strong>Plataformas de terceros:</strong> Google, redes sociales y plataformas publicitarias, únicamente cuando usted nos autoriza a gestionar su presencia online.</li>
              <li><strong>Obligación legal:</strong> cuando sea requerido por autoridades competentes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              6. Seguridad de los datos
            </h2>
            <p>
              Implementamos medidas técnicas y organizativas adecuadas para proteger sus datos personales contra acceso no autorizado, alteración, divulgación o destrucción. Estas incluyen cifrado HTTPS, autenticación segura y políticas de acceso restringido. Sin embargo, ningún sistema de transmisión de datos por Internet es 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              7. Sus derechos
            </h2>
            <p className="mb-3">
              Conforme al RGPD y la legislación vigente, usted tiene derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acceso:</strong> solicitar una copia de los datos personales que mantenemos sobre usted.</li>
              <li><strong>Rectificación:</strong> solicitar la corrección de datos inexactos.</li>
              <li><strong>Supresión:</strong> solicitar la eliminación de sus datos personales.</li>
              <li><strong>Limitación:</strong> solicitar la limitación del tratamiento de sus datos.</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en un formato estructurado y de uso común.</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos en determinadas circunstancias.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, puede contactarnos a través de{" "}
              <a href="mailto:info@opinilab.com" className="text-[var(--color-primary)] hover:underline">
                info@opinilab.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              8. Cookies
            </h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el tráfico y personalizar el contenido. Para más información, consulte nuestra{" "}
              <a href="/cookies" className="text-[var(--color-primary)] hover:underline">
                Política de Cookies
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              9. Transferencias internacionales
            </h2>
            <p>
              Algunos de nuestros proveedores de servicios pueden estar ubicados fuera del Espacio Económico Europeo. En esos casos, nos aseguramos de que existan garantías adecuadas para proteger sus datos, como cláusulas contractuales estándar o decisiones de adecuación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              10. Cambios en esta política
            </h2>
            <p>
              Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento. Los cambios serán publicados en esta página con la fecha de la última actualización. Le recomendamos revisar periódicamente esta política.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-3 font-[family-name:var(--font-heading)]">
              11. Contacto
            </h2>
            <p>
              Si tiene preguntas sobre esta Política de Privacidad o sobre el tratamiento de sus datos, puede contactarnos:
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
