import type { AuditFields } from '@/types/audit'

/** A document type master record — the categories documents are filed under. */
export interface DocumentType extends AuditFields {
  id: number
  typeName: string
}
