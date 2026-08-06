import axios from 'axios'
import { z } from 'zod'
import { http } from './http'
import { toApiError } from './api-error'

/**
 * Presigned direct-to-storage uploads.
 *
 * Files never pass through the API. A screen asks for a presigned PUT, sends the
 * bytes straight at the returned URL, and then stores only the object `key` on
 * the record — `photo` on an employee, `document` on an attachment, `attachment`
 * on a leave. Nothing is written to the database by the handshake itself, so an
 * abandoned upload leaves a stray object and no half-saved row.
 *
 * The PUT goes out on a bare axios instance, not `apiClient`: the presigned URL
 * carries its own signature and the storage host rejects a request that arrives
 * with our `Authorization` header attached.
 */

const presignResponseSchema = z.object({
  upload_url: z.string(),
  key: z.string(),
})

/** The content types each presign endpoint will sign for. */
export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** A signed PUT target plus the key to store once the bytes are up. */
export interface PresignedUpload {
  uploadUrl: string
  key: string
}

/**
 * Body fields a particular presign endpoint needs on top of the content type —
 * `document_type_id` on the employee-document presign, for one, which the API
 * requires because the object key is filed under the chosen type.
 */
export type PresignFields = Record<string, string | number>

/** The presign's own cap on `file_name`. */
const FILE_NAME_MAX = 255

/**
 * Ask for a presigned PUT. `contentType` must be the file's own type — the
 * signature covers it, so the PUT has to send exactly the same one back.
 *
 * `fileName` is optional and never becomes the key: the server generates that and
 * appends a slugified form of the name after the uuid, purely so the object is
 * recognisable when browsing the bucket. Omit it for a camera capture, which has
 * no meaningful name of its own.
 */
export async function presignUpload(
  endpoint: string,
  contentType: string,
  { fileName, fields }: { fileName?: string; fields?: PresignFields } = {},
): Promise<PresignedUpload> {
  const name = fileName?.trim().slice(0, FILE_NAME_MAX)
  try {
    const raw = await http.post<unknown, PresignFields>(endpoint, {
      ...fields,
      content_type: contentType,
      ...(name ? { file_name: name } : {}),
    })
    const parsed = presignResponseSchema.parse(raw)
    return { uploadUrl: parsed.upload_url, key: parsed.key }
  } catch (error) {
    throw toApiError(error, "Couldn't prepare the upload.")
  }
}

/**
 * Presign, PUT the file, and answer the object key to store on the record.
 *
 * `allowed` is the set the endpoint signs for; a file outside it fails here with
 * a message a form can show, rather than as an opaque 400 from the presign call.
 * `fields` carries whatever else that endpoint requires in the presign body.
 */
export async function uploadFile(
  endpoint: string,
  file: File,
  allowed?: readonly string[],
  fields?: PresignFields,
): Promise<string> {
  const contentType = file.type
  if (allowed && !allowed.includes(contentType)) {
    throw toApiError(
      new Error(`Unsupported file type — allowed: ${allowed.join(', ')}`),
      'Unsupported file type.',
    )
  }

  const { uploadUrl, key } = await presignUpload(endpoint, contentType, {
    fileName: file.name,
    fields,
  })

  try {
    // Bare axios: the presigned URL is self-authenticating, and our bearer
    // header would make the storage host reject the request.
    await axios.put(uploadUrl, file, { headers: { 'Content-Type': contentType } })
  } catch (error) {
    throw toApiError(error, "Couldn't upload the file.")
  }

  return key
}
