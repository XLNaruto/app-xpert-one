import type {
  DocumentFormValues,
  DocumentResponse,
  DocumentUpdatePayload,
} from '../schemas'
import type { Document } from '../types'

/**
 * API record → the UI document. The type name and the audit trail only come back
 * on the list rows; on a single-record response both are absent — the name reads
 * blank (the form works off the id) and the audit columns render a dash.
 */
export function toDocument(response: DocumentResponse): Document {
  return {
    id: response.id,
    companyId: response.company_id,
    documentTypeId: response.document_type_id,
    documentTypeName: response.document_type_name ?? '',
    documentName: response.name,
    isRequired: response.is_required,
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
export function documentToPayload(values: DocumentFormValues): DocumentUpdatePayload {
  return {
    document_type_id: Number(values.documentTypeId),
    name: values.documentName.trim(),
    is_required: values.isRequired,
  }
}

/** Hydrate the edit form from a stored document. */
export function documentToFormValues(document: Document): DocumentFormValues {
  return {
    documentTypeId: String(document.documentTypeId),
    documentName: document.documentName,
    isRequired: document.isRequired,
  }
}
