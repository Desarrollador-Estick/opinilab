import type { ReactNode } from "react"
import Link from "next/link"
import ContactForm from "@/components/contact-form"
import { createClient } from "@/lib/supabase/server"

const serviceStyles: Record<string, { gradient: string; icon: ReactNode }> = {
  reviews: {
    gradient: "from-amber-400 to-orange-500",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
  social_media: {
    gradient: "from-pink-500 to-purple-600",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 7a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.3-8.4a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4z" />
      </svg>
    ),
  },
  seo: {
    gradient: "from-sky-500 to-blue-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  ads: {
    gradient: "from-emerald-500 to-teal-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  email: {
    gradient: "from-indigo-500 to-blue-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  branding: {
    gradient: "from-fuchsia-500 to-pink-600",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 16v-2m4-8h2M6 12H4m13.66-5.66l-1.41 1.41M7.76 16.24l-1.41 1.41M17.66 17.66l-1.41-1.41M7.76 7.76L6.35 6.35M12 9a3 3 0 100 6 3 3 0 000-6z" />
      </svg>
    ),
  },
  web: {
    gradient: "from-cyan-500 to-blue-500",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9S14.66 3 13 3m0 18c-1.66 0-3-4.03-3-9S11.34 3 13 3m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
}

const defaultServiceStyle: { gradient: string; icon: ReactNode } = {
  gradient: "from-blue-500 to-cyan-500",
  icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
}

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })
  const serviceList = error ? [] : (services ?? [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1e40af] text-white">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              <span className="text-sm text-blue-100 font-medium">Automatización de reseñas con IA</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
              Responde a cada reseña de Google{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-purple-300 bg-clip-text text-transparent">
                sin levantar un dedo
              </span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              OpiniLab responde automáticamente a todas las reseñas de tu ficha de Google Business Profile con IA. Tus clientes se sienten escuchados, tu reputación crece y tú te dedicas a lo que importa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#contacto"
                className="group relative bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 shadow-2xl shadow-white/10 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                Activar respuesta automática
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#como-funciona"
                className="border border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                Cómo funciona
              </a>
            </div>
          </div>

          {/* Result preview */}
          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 bg-white/10 rounded-lg px-4 py-1.5 text-xs text-gray-400 font-mono">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Panel de OpiniLab — Reseñas de Google
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Reseñas respondidas", value: "100%", change: "Automático", color: "text-green-400" },
                  { label: "Tiempo de respuesta", value: "<1h", change: "24/7", color: "text-blue-400" },
                  { label: "Valoración media", value: "4.8", change: "+0.6", color: "text-yellow-400" },
                  { label: "Clientes activos", value: "120+", change: "Creciendo", color: "text-purple-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white font-[family-name:var(--font-heading)]">{stat.value}</p>
                    <p className={`text-xs mt-1 font-medium ${stat.color}`}>{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-sm font-medium text-gray-300 mb-3 font-[family-name:var(--font-heading)]">Ejemplo de respuesta automática</p>
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-400 text-xs">★★★★★</span>
                        <span className="text-gray-300 text-xs font-medium">María G.</span>
                        <span className="text-gray-500 text-xs">hace 2 horas</span>
                      </div>
                      <p className="text-gray-400 text-xs italic">&ldquo;Increíble servicio, muy profesionales.&rdquo;</p>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-400 text-xs font-medium">Respuesta automática · OpiniLab</span>
                      </div>
                      <p className="text-gray-300 text-xs">Gracias, María. Nos alegra mucho que tu experiencia haya sido excelente. Esperamos verte de nuevo pronto.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-gray-300 mb-2 font-[family-name:var(--font-heading)]">Reseñas sin responder</p>
                  <div className="text-center">
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent font-[family-name:var(--font-heading)]">0</p>
                    <p className="text-xs text-gray-500 mt-2">IA se encarga de todas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-14 bg-white border-b border-[var(--color-border)]" aria-label="Negocios que confían en nosotros">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-400 mb-8 uppercase tracking-[0.2em] font-semibold">
          Negocios que ya confían en OpiniLab
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-30">
          {["Clínica Dental Sol", "Restaurante La Brasa", "Peluquería Estilo", "Ferretería Central", "Auto Taller Max"].map((name) => (
            <div key={name} className="text-xl font-bold text-gray-900 tracking-tight font-[family-name:var(--font-heading)]">
              {name}
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "100%", label: "Reseñas respondidas con IA" },
              { value: "<1h", label: "Tiempo medio de respuesta" },
              { value: "+0.6", label: "Subida media en valoración" },
              { value: "4.8/5", label: "Satisfacción de nuestros clientes" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-[var(--color-primary)] font-[family-name:var(--font-heading)]">
                  {stat.value}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              Nuestro servicio
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              Respuestas automáticas a reseñas de Google
            </h2>
            <p className="text-lg text-[var(--color-muted-foreground)] max-w-2xl mx-auto">
              Todo lo que tu negocio necesita para que cada reseña de Google tenga una respuesta profesional, a tiempo y en tu nombre.
            </p>
          </div>
          {serviceList.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Respuesta automática con IA",
                  description: "Cada reseña nueva recibe una respuesta personalizada generada por inteligencia artificial, en menos de 1 hora.",
                  gradient: "from-amber-400 to-orange-500",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                },
                {
                  title: "Respuestas a reseñas positivas",
                  description: "Agradecemos a tus clientes y reforzamos su experiencia positiva, fidelizándolos y animando a otros a dejarte una reseña.",
                  gradient: "from-green-400 to-emerald-500",
                  icon: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ),
                },
                {
                  title: "Respuestas a reseñas negativas",
                  description: "Respuestas empáticas y profesionales que muestran que te importa la opinión de tus clientes y que vas a mejorar.",
                  gradient: "from-blue-400 to-indigo-500",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ),
                },
                {
                  title: "Solicitud automática de reseñas",
                  description: "Enviamos emails a tus clientes pidiéndoles que dejen una reseña en Google, justo después de su experiencia.",
                  gradient: "from-purple-400 to-pink-500",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  title: "Panel de control",
                  description: "Visualiza todas las reseñas, las respuestas generadas y el historial completo desde un panel sencillo y claro.",
                  gradient: "from-cyan-400 to-blue-500",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                },
                {
                  title: "Informes mensuales",
                  description: "Cada mes recibes un informe con el número de reseñas, la valoración media, las respuestas enviadas y la evolución de tu reputación.",
                  gradient: "from-rose-400 to-red-500",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                },
              ].map((service) => (
                <div
                  key={service.title}
                  className="group relative bg-white border rounded-2xl p-6 transition-all duration-300 cursor-pointer border-[var(--color-border)] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {service.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 font-[family-name:var(--font-heading)]">
                    {service.title}
                  </h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-4">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serviceList.map((service) => {
                const style = serviceStyles[service.category ?? ""] ?? defaultServiceStyle
                return (
                  <div
                    key={service.id}
                    className={`group relative bg-white border rounded-2xl p-6 transition-all duration-300 cursor-pointer border-[var(--color-border)] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      {style.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 font-[family-name:var(--font-heading)]">
                      {service.name}
                    </h3>
                    <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-4">
                      {service.description}
                    </p>
                    <p className="text-lg font-bold text-[var(--color-primary)] font-[family-name:var(--font-heading)]">
                      {service.base_price ? `${service.base_price}€/mes` : "Precio bajo consulta"}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-center text-sm text-[var(--color-muted-foreground)] mt-10">
            ¿Quieres ver cómo funcionaría para tu negocio? Pide tu <a href="#contacto" className="text-[var(--color-primary)] font-medium hover:underline cursor-pointer">análisis gratuito de reseñas</a>.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="py-24 bg-[var(--color-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              Cómo funciona
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              En 4 pasos, tus reseñas se responden solas
            </h2>
            <p className="text-lg text-[var(--color-muted-foreground)] max-w-2xl mx-auto">
              Nosotros nos encargamos de todo. Tú solo ves cómo tu reputación crece.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Danos acceso a tu Google",
                description: "Comparte el enlace de tu ficha de Google Business Profile. Nosotros nos encargamos del resto.",
              },
              {
                step: "02",
                title: "La IA aprende tu tono",
                description: "Personalizamos las respuestas según el estilo de tu negocio: profesional, cercano, formal o divertido.",
              },
              {
                step: "03",
                title: "Respuestas automáticas 24/7",
                description: "Cada reseña nueva recibe una respuesta personalizada en menos de 1 hora, día y noche.",
              },
              {
                step: "04",
                title: "Tu reputación crece",
                description: "Más reseñas, mejor valoración y más clientes que te eligen por tu excelencia en Google.",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-purple-200 -translate-x-1/2" />
                )}
                <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] relative hover:shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-blue-50 absolute top-4 right-4 font-[family-name:var(--font-heading)] select-none">
                    {item.step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold mb-4 relative">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 relative font-[family-name:var(--font-heading)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed relative">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="resultados" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              Resultados
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              Negocios reales, reputación real
            </h2>
            <p className="text-lg text-[var(--color-muted-foreground)] max-w-2xl mx-auto">
              Esto es lo que OpiniLab hizo por la reputación de estos negocios en Google.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "Antes tenía 30 reseñas sin responder y mi nota era 3.9. En 2 meses OpiniLab las respondió todas y ahora estoy en 4.7. Los clientes notan que nos importa.",
                author: "María García",
                role: "Clínica Dental Sol",
                avatar: "MG",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                quote: "Las reseñas negativas me quitaban el sueño. Ahora OpiniLab las responde en menos de una hora con una respuesta profesional que deja al cliente contento. Mi reputación mejoró un 40%.",
                author: "Carlos Ruiz",
                role: "Restaurante La Brasa",
                avatar: "CR",
                gradient: "from-orange-500 to-red-500",
              },
              {
                quote: "Lo mejor es que funciona solo. No tengo que pensar en las reseñas, no tengo que pedir favores. OpiniLab se encarga y mi ficha de Google nunca estuvo tan bien.",
                author: "Ana Martínez",
                role: "Peluquería Estilo",
                avatar: "AM",
                gradient: "from-purple-500 to-pink-500",
              },
            ].map((t) => (
              <div key={t.author} className="bg-[var(--color-muted)] rounded-2xl p-8 border border-[var(--color-border)] hover:shadow-lg transition-shadow duration-300">
                <div className="flex gap-1 mb-4" role="img" aria-label="5 de 5 estrellas">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)] text-sm">{t.author}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "¿Cómo responde la IA a las reseñas?",
                a: "La IA analiza cada reseña (positiva o negativa) y genera una respuesta personalizada, profesional y en tu tono. Si la reseña es negativa, responde con empatía y constructividad. Si es positiva, agradece y refuerza la experiencia. Tú puedes revisar cada respuesta antes de publicarla.",
              },
              {
                q: "¿Necesito daros acceso a mi cuenta de Google?",
                a: "Solo necesitamos el enlace de tu ficha de Google Business Profile. Las respuestas se generan automáticamente y tú las publicas con un click. No pedimos acceso a tu cuenta de Google.",
              },
              {
                q: "¿Cuánto tarda en responder a una reseña?",
                a: "Menos de 1 hora en media. La IA trabaja 24/7, así que incluso las reseñas que llegan de madrugada reciben respuesta rápido.",
              },
              {
                q: "¿Puedo revisar las respuestas antes de que se publiquen?",
                a: "Sí. Puedes configurar que cada respuesta pase por tu aprobación antes de publicarse, o dejar que se publique automáticamente. Tú decides.",
              },
              {
                q: "¿Qué pasa con las reseñas negativas?",
                a: "Las reseñas negativas reciben una respuesta empática y profesional que muestra que te importa la opinión del cliente. No disculpas vacías, sino compromiso real con mejorar. Google premia a los negocios que responden a todas sus reseñas.",
              },
              {
                q: "¿Cuánto cuesta?",
                a: "49€/mes. El primer mes pagas 79€ (49€ de mensualidad + 30€ de alta del servicio). Sin permanencia, cancelas cuando quieras. Incluye respuesta automática a todas tus reseñas de Google, solicitud de reseñas y panel de control.",
              },
            ].map((faq) => (
              <details key={faq.q} className="group bg-[var(--color-muted)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer select-none font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors">
                  {faq.q}
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-200 shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contacto" className="py-24 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1e40af] text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-[family-name:var(--font-heading)]">
            ¿Listo para que tus reseñas se respondan solas?
          </h2>
          <p className="text-blue-100/80 text-lg mb-10 max-w-xl mx-auto">
            Solicita tu análisis gratuito. Te mostramos cómo OpiniLab puede mejorar la reputación de tu negocio en Google.
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  )
}
