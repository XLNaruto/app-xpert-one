import type { DocumentFormValues } from './schemas'

/** Field labels, shared by the form and the list header. */
export const DOCUMENT_LABELS = {
  documentType: 'Document Type',
  documentName: 'Document Name',
} as const

/** Blank form values for a new document. */
export const EMPTY_DOCUMENT_FORM: DocumentFormValues = {
  documentType: '',
  documentName: '',
}
