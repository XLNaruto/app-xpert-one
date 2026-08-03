import type { DocumentTypeFormValues } from './schemas'

/** Field labels, shared by the form and the list header. */
export const DOCUMENT_TYPE_LABELS = {
  typeName: 'Document Type',
} as const

/**
 * The `sort` values `/user/document-types` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const DOCUMENT_TYPE_SORT = {
  typeName: 'name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const

/**
 * Name A→Z — the endpoint's own default, and the order a picker wants. It's
 * still sent explicitly: an unpinned order can repeat or skip rows between
 * pages.
 */
export const DOCUMENT_TYPE_DEFAULT_SORT = {
  id: DOCUMENT_TYPE_SORT.typeName,
  desc: false,
}

/** Blank form values for a new document type. */
export const EMPTY_DOCUMENT_TYPE_FORM: DocumentTypeFormValues = {
  typeName: '',
}
