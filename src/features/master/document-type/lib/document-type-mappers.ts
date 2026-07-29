import type { ComboboxOption } from '@/components/ui/combobox'
import type { DocumentTypeFormValues } from '../schemas'
import type { DocumentType } from '../types'

/** Hydrate the edit form from a stored document type. */
export function documentTypeToFormValues(
  documentType: DocumentType,
): DocumentTypeFormValues {
  return {
    typeName: documentType.typeName,
  }
}

/** Dropdown options for pickers that select a document type by name. */
export function documentTypeOptions(types: DocumentType[]): ComboboxOption[] {
  return types.map((type) => ({ label: type.typeName, value: type.typeName }))
}
