import { apiClient } from './api-client'
import { toApiError } from './api-error'

/**
 * File downloads that need the session — an export endpoint answers the file
 * itself, so it can't be reached with a plain `<a href>`: the bearer header only
 * exists on the axios instance.
 *
 * The response is taken as a blob and handed to the browser through an object
 * URL, which is revoked as soon as the click has been dispatched.
 */

/**
 * Pull the server's own file name out of `Content-Disposition`. Both the plain
 * `filename="…"` and the RFC 5987 `filename*=UTF-8''…` forms are read, the
 * encoded one first — it is the one that survives non-ASCII names.
 */
function dispositionName(header: string | undefined): string | null {
  if (!header) return null

  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/^"|"$/g, ''))
    } catch {
      /* A malformed name is no reason to fail the download — fall through. */
    }
  }

  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null
}

/**
 * An error body arrives as a Blob when the request asked for one, so the API's
 * `{ message }` has to be read back out before `toApiError` can see it.
 */
async function unwrapBlobError(error: unknown): Promise<unknown> {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (!(data instanceof Blob)) return error

  try {
    const parsed: unknown = JSON.parse(await data.text())
    ;(error as { response: { data: unknown } }).response.data = parsed
  } catch {
    /* Not JSON — leave the axios message to stand in for it. */
  }
  return error
}

/** Hand a blob to the browser as a download named `fileName`. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * GET a file from the API and save it. The name is the server's own whenever it
 * sends one, and `fallbackName` only when it doesn't.
 */
export async function downloadFile(
  url: string,
  {
    params,
    fallbackName,
    errorMessage,
  }: {
    params?: Record<string, unknown>
    fallbackName: string
    errorMessage?: string
  },
): Promise<void> {
  try {
    const response = await apiClient.get<Blob>(url, { params, responseType: 'blob' })
    const name =
      dispositionName(response.headers['content-disposition'] as string | undefined) ??
      fallbackName
    saveBlob(response.data, name)
  } catch (error) {
    throw toApiError(await unwrapBlobError(error), errorMessage)
  }
}
