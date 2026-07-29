import type { DocumentFormValues } from '../schemas'
import type { Document } from '../types'

/** Hydrate the edit form from a stored document. */
export function documentToFormValues(document: Document): DocumentFormValues {
  return {
    documentType: document.documentType,
    documentName: document.documentName,
  }
}
