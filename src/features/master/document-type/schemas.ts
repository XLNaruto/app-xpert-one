import { z } from 'zod'

/** Create/edit form for a document type master record. */
export const documentTypeSchema = z.object({
  typeName: z
    .string()
    .trim()
    .min(1, 'Please enter document type')
    .min(2, 'Minimum 2 characters'),
})

export type DocumentTypeFormValues = z.infer<typeof documentTypeSchema>
