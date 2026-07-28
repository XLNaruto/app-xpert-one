import type { AuditFields } from '@/types/audit'

/** An asset master record. */
export interface AssetRecord extends AuditFields {
  id: number
  assetName: string
}
