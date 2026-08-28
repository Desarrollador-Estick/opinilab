# Guía: SUPABASE_SERVICE_ROLE_KEY + migraciones de seguridad

Documento de referencia para el proyecto de agencia de marketing (OpiniLab).
Autor: asistente de desarrollo. Fecha: 2026-08-27.

---

## 1. Por qué necesitas la SERVICE_ROLE_KEY (contexto)

Se corrigieron **21 avisos del Security Advisor** de Supabase. El problema era que
todas las políticas RLS estaban escritas como:

```sql
create policy "Admin full access" on public.clients for all using (true);
```

Sin `to authenticated`, esa política aplica a **todos los roles**, incluido el rol
`anon` (la clave pública `sb_publishable_...` que viaja en el navegador). Eso
permitía que **cualquiera con la clave anon leyera y escribiera todas las tablas**
(clientes, facturas, pagos, leads, etc.).

La solución (`supabase/migrations/006_rls_hardening.sql`) reemplaza esas políticas
por versiones solo para `authenticated`.

**Consecuencia obligatoria:** ahora las escrituras que ocurren SIN sesión de usua
webhooks de Stripe, crons, formulario público, pago público — necesitan la clave
`service_role` para operar (la `service_role` **omite RLS**).

---

## 2. Obtener la clave (paso a paso)

### Opción A — Dashboard de Supabase (la más fiable)

1. Abre [https://supabase.com/dashboard](https://supabase.com/dashboard) e inicia sesión.
2. En la lista de proyectos, haz clic en tu proyecto (**vygatycudhthcezzbkuh**).
3. En el menú lateral izquierdo: **⚙️ Settings** → **API**.
   - En algunos paneles nuevos es: **Settings** → **API Keys**.
4. Busca la sección **Project API keys**:
   - `anon` / `publishable key` (empieza por `sb_publishable_` o `eyJ...` con rol `anon`) — **NO es esta**.
   - `service_role` (empieza por `eyJ...` con rol `service_role`) — **⭐ ESTA ES LA TUYA**.
5. Pulsa **Reveal** (👁️ / "Mostrar") en la fila de `service_role`.
6. Copia el valor completo.

> ⚠️ **Advertencia:** `service_role` es un secreto y omite RLS por completo.
> **Nunca** la pongas en código del navegador ni en variables `NEXT_PUBLIC_*`.
> Solo en variables de servidor.

### Opción B — Panel nuevo sin "API"

1. En el dashboard del proyecto, arriba a la izquierda, clic en el nombre del proyecto.
2. **Settings** (⚙️) → **API Keys**.
3. En **Secret keys** → `service_role` → **Reveal** → copiar.

### Opción C — Si solo ves claves con formato `sb_...`

En el nuevo modelo de Supabase, hay que **generar** la service role key:
1. **Settings** → **API Keys**.
2. Botón **"Generate new" / "Create service role key"**.
3. Copia el valor generado (formato `sb_secret_...` o `eyJ...` según el proyecto).

---

## 3. Dónde ponerla

### Local → archivo `.env.local`

```env
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI
```

Guarda y **reinicia el servidor** (`npm run dev`).

### Producción → Vercel

1. [https://vercel.com](https://vercel.com) → tu proyecto.
2. **Settings** → **Environment Variables**.
3. Añade `SUPABASE_SERVICE_ROLE_KEY` con el mismo valor (marca *Production*, y
   también *Preview/Development* si quieres).
4. **Redeploy** para aplicar.

---

## 4. Orden recomendado (evita romper flujos)

1. **Pon la `SUPABASE_SERVICE_ROLE_KEY`** en `.env.local` y en Vercel.
2. **Aplica las migraciones en orden** (todas idempotentes, en `supabase/migrations/`):
   - `001_initial_schema.sql` — esquema canónico completo (SOLO si la base está vacía)
   - `002_reconcile_schema.sql` — alinea columnas antiguas → canónico (si ya hay datos)
   - `003_stripe_integration.sql` — columnas Stripe
   - `004_recurring_billing.sql` — método de pago por defecto
   - `005_payment_token.sql` — token de pago público
   - `006_rls_hardening.sql` — ⭐ endurece RLS (arregla los 21 avisos).
3. Reinicia `npm run dev` y verifica el formulario de contacto y el enlace de pago público.

> **Para tu base con datos ya existentes:** solo necesitas aplicar **002 → 006**.
> 001 es únicamente para una base nueva.

---

## 5. Otras migraciones pendientes / recordatorios

- **`002_reconcile_schema.sql`** — alinea el esquema de la base real al de
  `src/types/database.ts` (email_sends con `to/from/resend_id`, review_requests con
  `platform/message/completed_at`, automation_logs con `entity_*`, etc.).
- Los scripts antiguos `CLEAN_AND_MIGRATE.sql` y `FULL_MIGRATION.sql` se movieron a
  `supabase/legacy/` (obsoletos). No ejecutarlos.
- **`NEXT_PUBLIC_APP_URL`** en producción debe ser `https://opinilab.com` para que
  los enlaces de pago/factura en los emails apunten al dominio real.
- **`RESEND_API_KEY`** sigue siendo placeholder (`re_TU_KEY`) → los emails se
  registran en `email_sends` pero **no se envían de verdad** hasta poner la clave real.
- **`CRON_SECRET`** (opcional, para producción): protege `/api/invoices/run-monthly`
  y `/api/automation` para que solo los cron de Vercel puedan invocarlos con la
  cabecera `x-cron-secret`.

---

## 6. Verificar que la clave funciona

Una clave `service_role` correcta:
- Empieza por `eyJ...` (es un JWT) **o** por `sb_secret_...` según el panel.
- No es la `anon`/`publishable` (`sb_publishable_...`).

Prueba rápida: reinicia el dev server y usa el formulario de `/api/contact`
debería crear un lead sin error. Si falla con error de RLS, la service role no
está bien configurada o no se aplicó la migración.
