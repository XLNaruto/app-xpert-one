import { z } from 'zod'

/**
 * Create/edit form for a document master record. The type is held as an id
 * string (that's what the combobox gives us) and parsed to a number by the
 * mappers.
 */
export const documentSchema = z.object({
  documentTypeId: z.string().trim().min(1, 'Please select a document type'),
  documentName: z
    .string()
    .trim()
    .min(1, 'Please enter document name')
    .min(2, 'Minimum 2 characters')
    .max(200, 'Cannot exceed 200 characters'),
  /** Mandatory for every employee — the API defaults it to false. */
  isRequired: z.boolean(),
})

export type DocumentFormValues = z.infer<typeof documentSchema>

/**
 * One document as the API returns it.
 *
 * List rows carry the type's NAME and the full audit trail, while
 * `POST /user/documents` and `GET/PATCH /user/documents/:id` answer with the
 * record's own columns only — hence the optional fields, which the mapper reads
 * as an empty trail and a blank type name.
 */
export const documentResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  document_type_id: z.number(),
  name: z.string(),
  is_required: z.boolean(),
  document_type_name: z.string().nullish(),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type DocumentResponse = z.infer<typeof documentResponseSchema>

/** `GET /user/documents` — an offset-paginated page of documents. */
export const documentsResponseSchema = z.object({
  items: z.array(documentResponseSchema),
  total: z.number(),
})

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 */
export interface DocumentPayload {
  company_id: number
  document_type_id: number
  name: string
  is_required: boolean
}

/**
 * The update body. A document may be re-filed under another type of the same
 * company, so `document_type_id` stays — only the tenant is fixed.
 */
export type DocumentUpdatePayload = Omit<DocumentPayload, 'company_id'>
