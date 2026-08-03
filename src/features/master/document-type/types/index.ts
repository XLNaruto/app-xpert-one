import type { AuditFields } from '@/types/audit'

/** A document type master record — the categories documents are filed under. */
export interface DocumentType extends AuditFields {
  id: number
  /** The company that owns the type — every read is scoped to it. */
  companyId: number
  typeName: string
}
