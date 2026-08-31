# Arquitectura — OpiniLab (Agencia de Marketing y Reseñas)

> Documento de arquitectura **real basado en el código** (`src/`), no una intención.
> Stack verificado: **Next.js 16.3.3** (App Router + Turbopack), **React 19.2.8**, **Tailwind 4**, **TypeScript 5**, **Supabase**, **Stripe**, **Resend**, **Groq**, **pdfmake**.

---

## 1. Visión de sistema (qué hace)

OpiniLab es una **plataforma SaaS vertical de agencia de marketing local**. Unifica en una sola app web cuatro caras de un mismo negocio:

| Superficie | Ruta | Quién | Qué hace |
|---|---|---|---|
| **Landing pública** | `/` `(public)/` | Visitantes | Captura de leads (formulario "pedir presupuesto" + auditoría GBP gratis) |
| **Panel de agencia** | `/dashboard/*` | Admin/equipo | Gestión de clientes, leads, servicios, reseñas, contratos, facturas, reportes, tareas, marketing, configuración |
| **Portal de cliente** | `/portal/*` | Clientes | Ver contrato, facturas (y pagarlas), informes de evolución, cambiar contraseña |
| **Pago público** | `/pagar/[token]` | Cualquiera con el enlace | Cobro de una factura vía Stripe sin necesidad de cuenta |

El ciclo de negocio completo que automatiza: **Captación → Onboarding → Ejecución (con IA) → Entrega (informes) → Cobro (Stripe) → Seguimiento (follow-ups + recordatorios automáticos)**.

---

## 2. Stack y decisiones clave

### 2.1 Next.js 16 (App Router)
- **Turbopack por defecto** como bundler (`next dev` / `next build`).
- Convención de **`proxy.ts`** en vez de `middleware.ts` (renombrado en Next 16). Se usa para **refresco de sesión Supabase + control de acceso por rol en el edge**.
- Server Components por defecto; las páginas interactivas marcan `"use client"` explícitamente.

### 2.2 Backend unificado: Supabase
- **PostgreSQL** (datos), **Auth** (sesiones + emails temporales), y **RLS** (Row Level Security) como **capaz real de autorización a nivel de datos**.
- Tres clientes distintos según el contexto (ver §3.3). Esto es central en toda la app.

### 2.3 Pagos: Stripe (modo test)
- **PaymentIntents** con `setup_future_usage: "off_session"` → guarda la tarjeta del cliente en su `Stripe Customer` para **cobros automáticos recurrentes** (día 1 de cada mes).
- **Webhook firmado** como única fuente de verdad del estado real del pago.

### 2.4 Email: Resend
- Envíos + auditoría: cada intento se registra en `email_sends` (`status: sent|failed`), incluidos los fallos por falta de API key.
- **`sendEmail()` nunca lanza errores** → un email roto nunca rompe el flujo principal (facturación, webhooks, etc.).

### 2.5 IA: Groq (OpenAI-compatible), sin clave en el cliente
- Modelo por defecto: `qwen/qwen3.8-27b`. Toda llamada pasa por el servidor y se audita en `usage_logs` (métricas de tokens para el panel de consumo).
- Usos: respuestas a reseñas, informes de Google Business Profile (GBP), propuestas de servicios, copy de redes, emails de seguimiento.

---

## 3. Capas de la aplicación

### 3.1 Rutas (App Router)

```
src/
├── proxy.ts                        # Edge: refresca sesión + redirige por rol
├── app/
│   ├── (public)/page.tsx           # Landing + formulario de captación
│   ├── (public)/layout.tsx         # Navbar + footer públicos
│   ├── layout.tsx / globals.css    # Raíz, fuentes, CSS
│   ├── components/contact-form.tsx # Form cliente (usa /api/contact)
│   ├── register/page.tsx           # DESACTIVADO (solo cuentas creadas por admin)
│   ├── login/page.tsx              # Login agencia
│   ├── dashboard/                  # Panel agencia (sidebar, 10+ módulos)
│   ├── portal/                     # Portal cliente (layout + home + cambiar-password + login)
│   ├── pagar/[token]/page.tsx      # Pago público de factura (Stripe Elements)
│   ├── api/                        # ~15 endpoints (ver §4)
│   └── auth/callback|logout        # OAuth callback + cierre de sesión
├── lib/
│   ├── supabase/{client,server,admin,middleware,queries}.ts
│   ├── email/{send,templates,client-credentials,gbp-report}.ts
│   ├── ai/{groq,gbp-report}.ts
│   ├── types/database.ts           # Tipado tipado del esquema (Database<Tables>)
│   ├── nif-password.ts, utils.ts
```

### 3.2 Tipos compartidos `src/types/database.ts`
Generado/a mano para tipar todas las queries. Define `Database["public"]["Tables"]` y cada tabla (`profiles`, `clients`, `services`, `client_services`, `contracts`, `invoices`, `invoice_items`, `payments`, `reviews`, `review_requests`, `social_posts`, `leads`, `email_sends`, `tasks`, `reports`, `automation_logs`, `usage_logs`). Todo Supabase queda fuertemente tipado (las queries que no compilan fallan en `npx tsc --noEmit`).

### 3.3 Clientes de Supabase — la decisión central

| Cliente | Módulo | Sesión | RLS | Uso |
|---|---|---|---|---|
| **Browser** | `lib/supabase/client.ts` | Cookies del navegador | ✅ | Componentes cliente (`"use client"`) |
| **Server** | `lib/supabase/server.ts` | Cookies del request (read/write) | ✅ | Server Components y rutas API autenticadas |
| **Admin (service role)** | `lib/supabase/admin.ts` | **Ninguna** (system/userless) | **❌ omite RLS** | Webhooks de Stripe, crons (`/api/automation`), envíos de email de servidor |

> ⚠️ **Regla crítica del proyecto:** el cliente **admin** (`SUPABASE_SERVICE_ROLE_KEY`) solo existe en el servidor y **jamás** en el navegador. Se activa condicionalmente con `isServiceRoleConfigured()`; si la key no está configurada, se cae a `createClient()` (server) para que la app funcione en desarrollo sin exponer la clave.

### 3.4 Patrón de control de acceso (defensa en profundidad)

1. **Edge (`proxy.ts` → `updateSession`)**: refresca tokens y redirige por rol (leído de `profiles`):
   - Sin sesión → `/dashboard` y `/portal` redirigen a su login.
   - `role=client` → no a `/dashboard` ni `/login`; fuerza `/portal/cambiar-password` si `must_change_password`.
   - `role∈{admin,manager,member}` → no entra al portal de cliente.
2. **Página**: checks adicionales server-side (p. ej. `portal/page.tsx` re-verifica `role==="client"` y `client_id`).
3. **Datos**: RLS en Postgres aplica permisos por fila — la verdadera frontera de seguridad.

> **Nota de seguridad Next 16:** el `proxy` (edge) es útil pero **no es una frontera de autorización**. La app confía en RLS + checks en página/ruta para datos sensibles. Esto es correcto según la guía oficial.

---

## 4. Endpoints (API)

| Endpoint | Métodos | Función |
|---|---|---|
| `/api/contact` | POST | Landing → crea lead + genera informe GBP (IA) + email de bienvenida unificado |
| `/api/email` | POST | Envía un email por clave de plantilla validada (`emailTemplates`) |
| `/api/automation` | GET | **Cron** (disparado por Vercel/scheduler): recordatorios de facturas vencidas, follow-ups de leads, informes mensuales (día 1) |
| `/api/invoices` · `/api/invoices/run-monthly` | POST | Alta de factura + generación de cobros mensuales |
| `/api/contracts` | POST | Crear contrato (numeración `CON-AAAA-####`) |
| `/api/leads` · `/api/leads/follow-up` | POST/PUT | CRUD de leads + scoring/follow-up |
| `/api/reviews` · `/api/reviews/ai` | POST | Alta de reseñas + generar borrador de respuesta (IA) |
| `/api/reports` | POST | Genera informe mensual (agrega reseñas/facturas/posts/tareas) |
| `/api/services/run-ai` | POST | Ejecuta IA según categoría de servicio del cliente (seo/reviews/email/social/ads/branding/web) |
| `/api/public/invoice/[token]` | GET | Factura pública por token de pago (sin login) |
| `/api/public/pay/[token]` | POST | Crea PaymentIntent público para una factura |
| `/api/stripe/create-payment-intent` | POST | Alta de servicio → Stripe customer + factura + PaymentIntent (setup fee + mes) |
| `/api/stripe/webhook` | POST | **Cobro real**: `succeeded` (marca pagada, activa cliente, guarda método) / `failed` / `canceled` |
| `/auth/callback` · `/auth/logout` | GET/POST | Callback OAuth · cierre de sesión |

---

## 5. Flujos de negocio clave

### 5.1 Captación (landing → lead → email)
`contact-form.tsx → POST /api/contact`
1. Inserta `leads` (`source="website"`, `status="new"`, `score=70` inbound).
2. `generateGbpReport()` → Groq genera un **informe gratuito de presencia en Google**.
3. `sendEmail()` → email unificado (bienvenida + onboarding + informe) al posible cliente.
4. Se registra en `email_sends` (auditoría).

### 5.2 Onboarding (lead → cliente → cuenta de portal)
- `clientes/[id]` crea la ficha de negocio y la **cuenta de portal** (rol `client`, vía `lib/email/client-credentials.ts`, password temporal + `must_change_password=true`).
- Los servicios se vinculan en `client_services` (con `custom_price` opcional).
- Auto-registro público desactivado (seguridad): **solo el admin crea cuentas**.

### 5.3 Cobro (alta de servicio + pago recurrente)
- **Alta** (`/api/stripe/create-payment-intent`): crea/recupera `Stripe Customer`, factura (setup fee + mes, IVA 21%), PaymentIntent con `setup_future_usage="off_session"`.
- **Pago público** (`/pagar/[token]` + `/api/public/pay/[token]` + `/api/public/invoice/[token]`): cualquier persona con el token puede pagar la factura sin cuenta; la tarjeta se guarda para cobros futuros.
- **Webhook** (`/api/stripe/webhook`): `succeeded` → factura `paid`, registra pago en `payments`, activa al cliente (`status=active`), guarda `stripe_default_payment_method_id`, envía email de agradecimiento. `failed` → `overdue` (no se activa al cliente). `canceled` → `cancelled`.
- **Recurrente**: el cron del día 1 cobra `off_session` a clientes con método guardado (genera `invoices` + cobra).

### 5.4 Entrega y seguimiento
- **`/api/automation` (cron)** hace 3 cosas con **deduplicación por día** (comprueba `email_sends`):
  1. Facturas `sent` con `due_date` pasada → email `paymentReminder` (una vez/día).
  2. Leads con `next_follow_up_at <= now` → email `followUp` y reprograma +7 días.
  3. Día 1 del mes → genera informes mensuales vía `/api/reports` (agrega reseñas/facturas/posts/tareas del período anterior).
- Todo se registra en `automation_logs`.

### 5.5 IA (Groq) — dónde y cómo
- **`/api/reviews/ai`**: respuestas a reseñas de Google (positivas/negativas, sin inventar datos).
- **`/api/services/run-ai`**: payload por categoría de servicio (seo → informe GBP; reviews → respuesta/guía; email → follow-up; social_media → post; ads/branding/web → propuesta).
- **`/api/contact`**: informe GBP gratuito de captación.
- Cada llamada registra tokens en `usage_logs` (panel "Consumo & Límites").

---

## 6. Base de datos (Supabase — RLS)

| Tabla | Propósito | Notas |
|---|---|---|
| `profiles` | Rol/perfil por `auth.uid` | `role`, `client_id`, `must_change_password` |
| `clients` | Fichas de negocio | `stripe_customer_id`, `stripe_default_payment_method_id`, `status` |
| `services` · `client_services` | Catálogo y contratación | `custom_price` en la relación |
| `contracts` | Contratos | `value`, fechas, `pdf_url`, numero `CON-` |
| `invoices` · `invoice_items` | Facturación | estados `draft/sent/paid/overdue/cancelled`, `payment_token` |
| `payments` | Cobros registrados | por webhook y manual |
| `reviews` · `review_requests` | Reseñas y peticiones | solicitudes SMS/email a clientes del negocio |
| `social_posts` | Posts programados | métricas de engagement |
| `leads` | Embudo de captación | `status`, `score`, `next_follow_up_at` |
| `tasks` | Tareas del equipo | por cliente y responsable |
| `reports` | Informes (mensuales/GBP) | `content` JSON agregado |
| `email_sends` | Auditoría de email | `status sent/failed`, `resend_id`, `template` |
| `automation_logs` | Bitácora del cron | |
| `usage_logs` | Consumo de tokens IA | provider `groq`, por cliente/lead |

---

## 7. Hosting / despliegue

- Pensado para **Vercel** (cron vía `vercel.json` o plataforma) + **Supabase cloud** + **Resend** + **Stripe**.
- Variables de entorno críticas (ver `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `COMPANY_NAME`, `NEXT_PUBLIC_APP_NAME`, `GROQ_API_KEY`.
- Registrado también `@netlify/plugin-nextjs` en devDependencies (hosting alternativo Netlify).

---

## 8. Estado actual del proyecto (verificado)

- **`npx tsc --noEmit` pasa 100% limpio** (verificación real; `next build` no se usa como bypass de tipos).
- **RSC**: todas las páginas `/dashboard/*` usan `"use client"` explícito; la landing se corrigió para no importar hooks de cliente en un Server Component.
- **`ignoreBuildErrors` se ha ELIMINADO** de `next.config.ts` — ahora los errores de tipos rompen el build en lugar de ocultarse.
- **Nota de entorno**: en `F:\` (unidad USB) `next build`/`next dev` fallan por **limitación del sistema de archivos** (sin soporte de symlinks/junctions), NO por el código. Para compilar/ejecutar localmente, copiar el proyecto a un disco normal (C:/D:) o desplegar.

---

## 9. Flujo de datos simplificado

```
Visitante ──► contacto-form ──► /api/contact ──► leads + Groq(GBP) + Resend(bienvenida)
                                                  │
Panel admin ──► dashboard/*  (client ") ──► Supabase (RLS)
Admin crea cliente+portal ──► client_services + Stripe Customer
          │                      │
          ▼                      ▼
 Alta servicio ──► create-payment-intent ──► factura + PaymentIntent (setup_future_usage)
          │
          ▼
 /pagar/[token] ──► public/pay ──► Stripe confirmPayment
          │
          ▼
 Stripe webhook ──► factura=paid + payments + cliente=active + método guardado
          │
          ▼
 Cron (día 1) ──► invoice recurrente off_session ──► webhook
 Cron (diario) ──► recordatorios vencimiento + follow-ups leads + informes mensuales
```
