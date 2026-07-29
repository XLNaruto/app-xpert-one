import type { ComboboxOption } from '@/components/ui/combobox'
import type { LeavePayType } from './types'
import type { LeaveTypeFormValues } from './schemas'

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
