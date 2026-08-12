import { z } from 'zod'
import { recordNameField } from '@/lib/validation'

/** Create/edit form for a document type master record. */
export const documentTypeSchema = z.object({
  typeName: recordNameField('the document type', { max: 200 }),
})

export type DocumentTypeFormValues = z.infer<typeof documentTypeSchema>

/**
 * One document type as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/document-types` and
 * `GET/PATCH /user/document-types/:id` answer with the record's own columns
 * only — hence the optional audit fields, which the mapper reads as an empty
 * trail.
 */
export const documentTypeResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type DocumentTypeResponse = z.infer<typeof documentTypeResponseSchema>

/** `GET /user/document-types` — an offset-paginated page of types. */
export const documentTypesResponseSchema = z.object({
  items: z.array(documentTypeResponseSchema),
  total: z.number(),
})

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 */
export interface DocumentTypePayload {
  company_id: number
  name: string
}

/** The update body — the name alone; a type can't move between companies. */
export type DocumentTypeUpdatePayload = Omit<DocumentTypePayload, 'company_id'>
