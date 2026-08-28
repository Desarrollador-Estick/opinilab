# Arquitectura - Agencia de Marketing y Reseñas

## Stack Tecnológico
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Hosting**: Vercel (gratis)
- **Email**: Resend (100 emails/día gratis) o SMTP propio
- **Pagos**: Stripe (sin coste hasta primeras transacciones)
- **IA**: Ollama local o APIs gratuitas (para copy, análisis)
- **Scraping**: Puppeteer/Playwright (gratis)

## Flujo Completo del Negocio

```
1. CAPTACIÓN → 2. ONBOARDING → 3. EJECUCIÓN → 4. ENTREGA → 5. COBRO → 6. SEGUIMIENTO
```

### 1. CAPTACIÓN AUTOMATIZADA
- Scraping de Google Maps → Empresas con pocas/malas reseñas
- Scraping de directorios → Empresas sin presencia digital
- Web pública con formulario → Inbound leads
- Email outbound automatizado → Cold outreach
- Redes sociales → Contenido de valor

### 2. ONBOARDING
- Formulario de intake → Datos del cliente
- Generación automática de contrato (PDF)
- Firma digital (aireflow o similar)
- Setup de servicios contratados

### 3. EJECUCIÓN
- **Reseñas**: Sistema de captación vía SMS/Email a clientes del negocio
- **Redes sociales**: Programación de contenido con IA
- **SEO**: Auditoría automática + informes
- **Publicidad**: Setup de campañas
- **Email**: Secuencias automatizadas
- **Branding**: Templates con IA + diseño manual

### 4. ENTREGA
- Informes mensuales automáticos (PDF)
- Dashboard del cliente (solo lectura)
- Notificaciones de hitos

### 5. COBRO
- Facturación automática mensual
- Recordatorios de pago
- Seguimiento de impagados
- Generación de facturas legales (QR BOE)

### 6. SEGUIMIENTO
- NPS automático
- Encuestas de satisfacción
- Renovación de contratos
- Upselling automático

## Base de Datos (Supabase)

### Tablas Principales
- `users` → Usuarios del sistema (admin, equipo, clientes)
- `clients` → Datos de clientes
- `services` → Servicios disponibles
- `client_services` → Servicios contratados por cliente
- `contracts` → Contratos generados
- `invoices` → Facturas
- `payments` → Cobros registrados
- `reviews` → Reseñas gestionadas
- `social_posts` → Posts programados
- `seo_audits` → Auditorías SEO
- `reports` → Informes generados
- `leads` → Leads captados
- `email_sequences` → Secuencias de email
- `tasks` → Tareas del equipo

## Presupuesto Mensual
| Servicio | Coste |
|----------|-------|
| Vercel (hosting) | 0€ |
| Supabase (free tier) | 0€ |
| Resend (email) | 0€ (100/día) |
| Dominio (.com) | ~10€/año |
| IA local (Ollama) | 0€ |
| **Total** | **~1€/mes** |
