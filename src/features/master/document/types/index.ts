import type { AuditFields } from '@/types/audit'

/** A document master record. */
export interface Document extends AuditFields {
  id: number
  documentType: string
  documentName: string
}
