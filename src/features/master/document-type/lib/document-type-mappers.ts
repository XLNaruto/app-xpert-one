import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  DocumentTypeFormValues,
  DocumentTypeResponse,
  DocumentTypeUpdatePayload,
} from '../schemas'
import type { DocumentType } from '../types'

/**
 * API record → the UI document type. The audit trail only comes back on the list
 * rows; on a single-record response it's absent and renders as a dash.
 */
export function toDocumentType(response: DocumentTypeResponse): DocumentType {
  return {
    id: response.id,
    companyId: response.company_id,
    typeName: response.name,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 */
export function documentTypeToPayload(
  values: DocumentTypeFormValues,
): DocumentTypeUpdatePayload {
  return { name: values.typeName.trim() }
}

/** Hydrate the edit form from a stored document type. */
export function documentTypeToFormValues(
  documentType: DocumentType,
): DocumentTypeFormValues {
  return { typeName: documentType.typeName }
}

/**
 * Dropdown options for the pickers that file something under a type. The value
 * is the type's **id** — that's what `document_type_id` expects — while the
 * label is the name the user picks by.
 */
export function documentTypeOptions(types: DocumentType[]): ComboboxOption[] {
  return types.map((type) => ({ label: type.typeName, value: String(type.id) }))
}
