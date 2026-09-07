# Guía: Configurar el dominio de envío en Resend

Para que los emails de la app se envíen **desde `hola@opinilab.com`** (y no desde el fallback `onboarding@resend.dev`), tienes que verificar el dominio `opinilab.com` en Resend. El dominio debe estar verificado para poder enviar.

> Estima: ~10 minutos. No necesitas código — solo añadir 3 registros DNS en tu proveedor de dominio.

---

## 1. Requisitos previos

- Tener una cuenta en [console.resend.com](https://console.resend.com) (la misma donde está tu `RESEND_API_KEY`).
- Tener acceso a la **configuración DNS del dominio `opinilab.com`** (el panel de tu registrador: Cloudflare, GoDaddy, Namecheap, etc.).

---

## 2. Añadir el dominio en Resend

1. Entra en [console.resend.com/domains](https://console.resend.com/domains).
2. Pulsa **Add Domain**.
3. Introduce: `opinilab.com`
4. Elige la **región** (si tus clientes están en Europa, elige `us-east-1` o la que te recomiende; por defecto `us-east-1` está bien).
5. Deja la opción de tracking como prefieras (recomendado activar **Open tracking** y **Click tracking** para ver estadísticas).
6. Pulsa **Add Domain**.

Resend te mostrará **3 registros DNS** para añadir en tu proveedor:

| Tipo | Nombre / Host | Valor |
|------|---------------|-------|
| TXT | `resend._domainkey` | `p=DKIM1; k=rsa; ...` |
| TXT | `@` (o tu dominio) | `v=spf1 include:amazonses.com ~all` |
| MX | `feedback-smtp.<región>.amazonses.com` | (precedencia 10) |

> ⚠️ **Importante:** Los valores exactos te los da Resend. **No inventes** los valores — copia los que ves en pantalla, porque la clave DKIM es única de tu dominio.

---

## 3. Añadir los registros DNS en tu proveedor

Los pasos varían según el registrador, pero el proceso es el mismo. Te doy los tres casos más comunes:

### Cloudflare
1. Ve a tu dominio → **DNS** → **Records** → **Add record**.
2. Añade el registro **TXT** `resend._domainkey` con el valor DKIM.
3. Añade el registro **TXT** `@` con el valor SPF.
4. Añade el registro **MX** para el feedback loop.
5. Pulsa **Save** (Cloudflare puede tardar unos segundos en propagar).

### GoDaddy
1. Ve a **My Products** → tu dominio → **Manage DNS**.
2. En **Records**, usa **Add / Add New Record**.
3. Añade los registros TXT y MX con los valores de Resend.
4. Puede tardar hasta **48h** en propagar, pero normalmente es casi inmediato.

### Namecheap
1. Inicia sesión → **Domain List** → tu dominio → **Advanced DNS**.
2. Usa **Add New Record** para cada registro (TXT y MX).
3. Guarda los cambios.

### Si usas otro registrador
Busca la sección de **DNS / DNS Management / Custom DNS** y añade manualmente los registros TXT y MX con los valores de Resend.

---

## 4. Verificar el dominio

1. Vuelve a [console.resend.com/domains](https://console.resend.com/domains).
2. Si tu dominio aparece como **Pending**, pulsa **Verify** (o espera a que Resend compruebe los registros automáticamente).
3. Cuando el registro TXT DKIM se detecte, el dominio pasará a estado **Verified**.
4. El SPF suele confirmarse poco después y el MX (feedback loop) también.

> Si Resend no detecta los registros, espera unos minutos (la propagación DNS no es instantánea) y pulsa **Refresh** / **Verify** de nuevo.

---

## 5. Comprobar que la app usa el dominio correcto

Una vez verificado:

1. Confirma que en `F:/agencia-marketing/.env.local` existe:
   ```
   EMAIL_FROM=hola@opinilab.com
   ```
   (Si lo cambiaste después de arrancar el servidor, **reinícialo** para que recargue el `.env`.)

2. Verifica el estado del servicio en la app (DashBoard → Configuración → Estado de APIs), donde `resend` debería aparecer como `ok`.

3. Haz una prueba: usa el formulario de contacto o envía un email desde el dashboard y confirma que el correo llega **desde `hola@opinilab.com`**.

---

## 6. En qué archivos queda reflejado

| Archivo | Qué hace |
|---------|----------|
| `src/lib/email/send.ts` | Remitente de emails automáticos (lee `EMAIL_FROM`) |
| `src/app/api/email/route.ts` | API de envío de emails |
| `src/app/api/contact/route.ts` | Formulario de contacto público |
| `src/lib/email/templates.ts` | Enlace "Responder a este email" |

Todos usan `process.env.EMAIL_FROM || "onboarding@resend.dev"` como remitente, así que con `EMAIL_FROM=hola@opinilab.com` definido y el dominio verificado, todo sale desde tu dominio.

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| El email se envía pero llega desde `onboarding@resend.dev` | `EMAIL_FROM` no está cargado | Reinicia el servidor de desarrollo |
| El envío falla con error de dominio no verificado | El dominio aún en `Pending` en Resend | Verifica los registros DNS y espera propagación |
| Gmail/marketing lo marca como spam | SPF/DKIM no propagados aún | Espera a que Resend confirme SPF y DKIM como `Verified` |
| No llega el email | El dominio apunta a región distinta | Revisa que la región del MX coincide con la elegida en Resend |

---

**¿Necesitas más ayuda?** Dime tu registrador (Cloudflare, GoDaddy, Namecheap…) y te guío con la captura exacta de cada registro.
