import type { DocumentTypeFormValues } from './schemas'

/** Field labels, shared by the form and the list header. */
export const DOCUMENT_TYPE_LABELS = {
  typeName: 'Document Type',
} as const

/** Blank form values for a new document type. */
export const EMPTY_DOCUMENT_TYPE_FORM: DocumentTypeFormValues = {
  typeName: '',
}
