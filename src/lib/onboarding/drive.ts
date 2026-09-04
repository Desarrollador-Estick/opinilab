import { JWT } from "google-auth-library"

/**
 * Crea una carpeta en Google Drive per-client mediante una Service Account.
 * El contenido de las credenciales se lee de la variable de entorno
 * GOOGLE_APPLICATION_CREDENTIALS_JSON (JSON de la Service Account) y la carpeta
 * padre donde se crean las carpetas de cliente se define en
 * GOOGLE_DRIVE_PARENT_FOLDER_ID.
 *
 * Si falta la configuración, devuelve ok:false con un error descriptivo para
 * que el orquestador de onboarding pueda avisar sin romper el flujo.
 */

export type CreateDriveFolderResult = {
  ok: boolean
  error?: string
  id?: string
  url?: string
}

function getServiceAccountJson(): {
  client_email: string
  private_key: string
} | null {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.client_email || !parsed.private_key) return null
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    }
  } catch {
    return null
  }
}

async function getAuthClient(): Promise<JWT> {
  const sa = getServiceAccountJson()
  if (!sa) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON no está configurada o es inválida")
  }
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  })
  await client.authorize()
  return client
}

async function driveRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Record<string, unknown>> {
  const client = await getAuthClient()
  const token = (await client.getAccessToken()).token
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } }).error?.message
    throw new Error(
      `Google Drive API ${res.status}: ${msg || JSON.stringify(json)}`
    )
  }
  return json
}

interface DriveFile {
  id?: string
  name?: string
  webViewLink?: string
}

/**
 * Crea la carpeta raíz del cliente en Drive (idempotente por nombre dentro de
 * la carpeta padre) y devuelve su id y url web.
 */
export async function createClientDriveFolder(opts: {
  businessName: string
  clientId: string
}): Promise<CreateDriveFolderResult> {
  try {
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
    if (!parentFolderId) {
      return { ok: false, error: "GOOGLE_DRIVE_PARENT_FOLDER_ID no configurada" }
    }

    const folderName = `${opts.businessName} (${opts.clientId.slice(0, 8)})`

    // Idempotencia: si ya existe una carpeta con este nombre en el padre, la reutiliza.
    const query = encodeURIComponent(
      `'${parentFolderId}' in parents and name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )
    const list = (await driveRequest(
      "GET",
      `files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`
    )) as { files?: DriveFile[] }
    if (list?.files?.length) {
      const existing = list.files[0]
      return {
        ok: true,
        id: existing.id,
        url: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
      }
    }

    const created = (await driveRequest("POST", "files", {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    })) as DriveFile

    return {
      ok: true,
      id: created.id,
      url: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error creando la carpeta en Drive",
    }
  }
}
