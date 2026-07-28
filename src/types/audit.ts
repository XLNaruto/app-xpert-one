/**
 * Audit trail carried by every master record — who created the row and who
 * last edited it. `updatedBy`/`updatedAt` stay `null` until the first edit.
 */
export interface AuditFields {
  createdBy: string
  createdAt: string
  updatedBy: string | null
  updatedAt: string | null
}
