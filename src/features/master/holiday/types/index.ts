import type { AuditFields } from '@/types/audit'

/** A holiday master record. Dates are stored as `yyyy-MM-dd`. */
export interface Holiday extends AuditFields {
  id: number
  holidayName: string
  fromDate: string
  toDate: string
}
