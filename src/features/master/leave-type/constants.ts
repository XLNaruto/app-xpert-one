import type { ComboboxOption } from '@/components/ui/combobox'
import type { LeavePayType } from './types'
import type { LeaveTypeFormValues } from './schemas'

/**
 * The `sort` values `/user/leave-types` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const LEAVE_TYPE_SORT = {
  shortName: 'short_code',
  leaveName: 'name',
  createdAt: 'created_at',
} as const

/**
 * Newest record first — the order the list opens in and reverts to. This is not
 * the endpoint's own default (short code A→Z), so it's always sent.
 */
export const LEAVE_TYPE_DEFAULT_SORT = { id: LEAVE_TYPE_SORT.createdAt, desc: true }

/** Pay Type dropdown choices. */
export const PAY_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Unpaid', value: 'UNPAID' },
]

/** Display label for a stored pay type. */
export const PAY_TYPE_LABELS: Record<LeavePayType, string> = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
}

/** Blank form values for a new leave type. */
export const EMPTY_LEAVE_TYPE_FORM: LeaveTypeFormValues = {
  leaveName: '',
  shortName: '',
  payType: 'PAID',
}
