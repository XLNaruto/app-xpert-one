import { z } from 'zod'

/** Create/edit form for a document master record. */
export const documentSchema = z.object({
  documentType: z.string().trim().min(1, 'Please enter document type'),
  documentName: z
    .string()
    .trim()
    .min(1, 'Please enter document name')
    .min(2, 'Minimum 2 characters'),
})

export type DocumentFormValues = z.infer<typeof documentSchema>
