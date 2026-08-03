import type { AuditFields } from '@/types/audit'

/** An asset master record. */
export interface AssetRecord extends AuditFields {
  id: number
  /** The tenant the record belongs to — set by the API from the active company. */
  companyId: number
  assetName: string
}
