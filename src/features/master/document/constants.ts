import type { DocumentFormValues } from './schemas'

/** Field labels, shared by the form and the list header. */
export const DOCUMENT_LABELS = {
  documentType: 'Document Type',
  documentName: 'Document Name',
  isRequired: 'Required',
} as const

/**
 * The `sort` values `/user/documents` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const DOCUMENT_SORT = {
  documentName: 'name',
  documentType: 'document_type',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const

/**
 * Name A→Z — the endpoint's own default. It's still sent explicitly: an unpinned
 * order can repeat or skip rows between pages.
 */
export const DOCUMENT_DEFAULT_SORT = {
  id: DOCUMENT_SORT.documentName,
  desc: false,
}

/** Blank form values for a new document. */
export const EMPTY_DOCUMENT_FORM: DocumentFormValues = {
  documentTypeId: '',
  documentName: '',
  isRequired: false,
}
