import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/cookie-banner";

export const metadata: Metadata = {
  title: "OpiniLab — Tu Agencia de Marketing Digital, Potenciada con IA",
  description:
    "Gestiona clientes, automatiza campañas, demuestra resultados y cobra facturas desde una sola plataforma. La herramienta que necesitan las agencias de marketing modernas.",
  keywords: [
    "agencia de marketing",
    "gestión de clientes",
    "automatización marketing",
    "SEO",
    "redes sociales",
    "reseñas google",
    "facturación",
    "dashboard agencia",
  ],
  openGraph: {
    title: "OpiniLab — Tu Agencia de Marketing Digital, Potenciada con IA",
    description:
      "Plataforma todo-en-uno para agencias de marketing. Gestiona clientes, automatiza campañas y demuestra resultados reales.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[var(--color-background)] text-[var(--color-foreground)]">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
