# Informe de Protección de Datos

**Sistema:** Plataforma OpiniLab de captación y gestión de clientes (agencia de marketing digital)
**Versión del informe:** 1.0
**Fecha:** 12 de septiembre de 2026
**Normativa de referencia:** Reglamento (UE) 2016/679 (RGPD) · Ley Orgánica 3/2018 (LOPDGDD) · Ley 34/2002 (LSSI-CE)

---

## 1. Responsable del tratamiento

| Campo | Valor |
|---|---|
| Denominación | OpiniLab (empresa prestadora de servicios de marketing digital) |
| NIF | Pendiente de confirmar — configurar `COMPANY_NIF` en el entorno de producción |
| Domicilio | Pendiente de confirmar — configurar `COMPANY_ADDRESS` en el entorno de producción |
| Contacto | `info@opinilab.com` |
| Fecha de entrada en vigor de medidas documentadas | 12/09/2026 |

**Nota operativa:** la identidad del responsable (nombre comercial + NIF + dirección) debe quedar configurada en el pie legal de los emails y en las páginas legales. Los valores de entorno son: `COMPANY_NAME`, `COMPANY_NIF`, `COMPANY_ADDRESS`, `COMPANY_EMAIL`.

---

## 2. Registro de Actividades de Tratamiento (ROPA)

### 2.1 Gestión de clientes y facturación
| Atributo | Detalle |
|---|---|
| Categorías de datos | Identificación (nombre, email), datos del negocio, facturación |
| Base jurídica | Ejecución de contrato (art. 6.1.b), obligación legal fiscal (art. 6.1.c) |
| Cesiones | Stripe (pagos). No se almacenan datos de tarjeta |
| Conservación | Duración de la relación + plazo legal fiscal |
| Destinatarios | Solo el responsable y los encargados autorizados |

### 2.2 Captación de clientes (contacts profesionales B2B)
| Atributo | Detalle |
|---|---|
| Categorías de datos | Nombre de contacto, email, teléfono, datos públicos del negocio (nombre, dirección, actividad), quienes aparecen en fuentes accesibles al público |
| Origen | Directorios públicos y Google Maps (scraping de datos empresariales públicos) |
| Base jurídica | **Interés legítimo** (art. 6.1.f RGPD / art. 21 LSSI-CE), ponderado por el carácter **profesional/empresarial** de los contactos |
| Obligaciones | Información de doble canal: audiencia previa (contacto inicial), pie legal en **todos** los emails comerciales (identidad, finalidad, base, derecho de oposición/baja gratuito) y formulario de derechos en `/proteccion-datos` |
| Conservación | Leads **lost/sin respuesta: 120 días** sin actividad hasta anonimización automática. Leads en conversión activa: mientras dure la oportunidad comercial |
| Derecho clave | Oposición al marketing directo: gratuita, sin explicación de motivos, efectiva mediante enlace de baja en cada email |
| Medida de minimización | Si el interés legítimo desaparece (lost, sin respuesta, object) se anonimiza el contacto |

### 2.3 Sitio web y analítica
| Atributo | Detalle |
|---|---|
| Categorías de datos | Visitas anónimas: `visitor_id` generado en navegador (almacenamiento local), ruta, referrer, agente de usuario |
| Base jurídica | **Consentimiento** (art. 6.1.a) obtenido mediante banner de cookies |
| Conservación | Registros de eventos: **12 meses** (purga automática) |
| Particularidad | La analítica usa `localStorage`, no cookies HTTP; aun así se exige consentimiento por política de responsabilidad |
| Registros de email | `email_sends` y `email_replies`: **24 meses** (purga automática) o el plazo necesario para la gestión de la relación |

---

## 3. Encargados de tratamiento (proveedores)

| Encargado | Servicio | Ubicación | Documento/garantía |
|---|---|---|---|
| Supabase, Inc. | Base de datos/hosting de datos | UE (región `eu-west-1`) | DPA / cláusulas contractuales |
| Vercel Inc. | Alojamiento web (app y API) | EE. UU. | DPA con cláusulas contractuales estándar (SCC) de la UE |
| Resend | Envío de email (campañas y transaccionales) | EE. UU. | DPA con SCC |
| Groq Inc. | IA generativa: asistente de ventas y borradores | EE. UU. | DPA con SCC; solo se envían textos de negocio |
| Stripe, Inc. | Pasarela de pago | EE. UU. | DPA / PCI-DSS |

**Transferencias internacionales:** Vercel, Resend y Groq implican transferencias a EE. UU., amparadas por **cláusulas contractuales estándar** de la Comisión Europea. Si el uso de estas herramientas se interrumpe, se debe revisar este informe.

---

## 4. Medidas de seguridad

| Ámbito | Medida |
|---|---|
| Acceso | Solo el equipo con rol `admin/manager/member` accede a datos; autenticación por email/contraseña de Supabase Auth |
| Riesgo de fuga | Sin contraseñas en repositorio; claves prod en Vercel; la Service Role Key nunca viaja al navegador |
| Trazabilidad | `email_sends` registra todos los envíos (auditoría interna durante el plazo de retención) |
| Baja de comunicaciones | Lista `email_suppressions` respetada de forma centralizada en todos los envíos comerciales |
| Supresión aplicada | Endpoint de resolución de solicitudes aplica borrado físico (réplicas y envíos) + anonimización de leads |
| Segmentos sensibles | Sin datos de categorías especiales (art. 9 RGPD) en ningún tratamiento |

---

## 5. Ejercicio de derechos

1. **Formulario público** en `https://opinilab.com/proteccion-datos` → registra la solicitud en la tabla `privacy_requests` y **notifica al equipo por email**.
2. **Oposición/baja**: se respeta de inmediato vía el enlace de baja de cada email (token firmado) y la lista `email_suppressions`.
3. **Supresión**: al resolver, se borran `email_replies` y `email_sends` del email solicitante, se anonimizan sus leads y se añade el email a `email_suppressions`.
4. **Plazo**: respuesta en un máximo de 1 mes desde la recepción.
5. Reclamación: Agencia Española de Protección de Datos (`aepd.es`).

---

## 6. Retención y supresión automática (implementada)

| Dato | Plazo | Acción automática | Dónde |
|---|---|---|---|
| Leads `lost` sin actividad | 120 días | Anonimización PII | `runAutomationFull` (cron 09:00) |
| Leads `new/contacted` sin respuesta | 120 días desde creación | Anonimización PII | ídem |
| `page_events` | 12 meses | Borrado | ídem |
| `email_sends` | 24 meses | Borrado | ídem |
| Clientes | Relación + obligación legal | No automatizado | Manual |

---

## 7. Decisión y valoración

**Conclusión:** el sistema de captación implementa desde el 12/09/2026 los mecanismos que permiten
defender en caso de inspección de la AEPD: base de **interés legítimo** documentada (contactos B2B de
fuentes públicas), **información completa** en la audiencia previa y el pie de email, **derecho de
oposición gratuito y efectivo**, **ROPA** actualizado, **purga por retención** automatizada y **canal de
derechos funcional**.

**Pendientes humanos (concretar con el responsable):**
1. Configurar `COMPANY_NIF` y `COMPANY_ADDRESS` en Vercel para que la identidad del responsable sea completa en emails y páginas legales.
2. Confirmar que existe el DPA firmado con los encargados anteriores (plantillas de proveedores).
3. Si el scraping se amplía a otras fuentes, revisar este apartado y la base de interés legítimo.