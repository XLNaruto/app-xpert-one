import type { AuditFields } from '@/types/audit'

/** A document master record — one filing slot under a document type. */
export interface Document extends AuditFields {
  id: number
  /** The company that owns the document — every read is scoped to it. */
  companyId: number
  /** The type it's filed under; what the API stores and the form picks. */
  documentTypeId: number
  /**
   * That type's name, joined in by the API on list rows. Blank on a
   * single-record response, which only carries the id.
   */
  documentTypeName: string
  documentName: string
  /** Mandatory for every employee. */
  isRequired: boolean
}
