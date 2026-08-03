import type { ComboboxOption } from '@/components/ui/combobox'
import type { AllowanceDeductionType } from './types'
import type { AllowanceDeductionFormValues } from './schemas'

/**
 * The `sort` values `/user/pay-components` accepts. Sorting is server-side, so
 * a column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const ALLOWANCE_DEDUCTION_SORT = {
  shortName: 'short_code',
  name: 'name',
  createdAt: 'created_at',
} as const

/**
 * Newest record first — the order the list opens in and reverts to. This is not
 * the endpoint's own default (short code A→Z), so it's always sent.
 */
export const ALLOWANCE_DEDUCTION_DEFAULT_SORT = {
  id: ALLOWANCE_DEDUCTION_SORT.createdAt,
  desc: true,
}

/** Field labels, shared by the form and the list header. */
export const ALLOWANCE_DEDUCTION_LABELS = {
  type: 'Type',
  name: 'Name',
  shortName: 'Short Name',
} as const

/** Type dropdown choices. */
export const TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Allowance', value: 'ALLOWANCE' },
  { label: 'Deduction', value: 'DEDUCTION' },
]

/** Display label for a stored type. */
export const TYPE_LABELS: Record<AllowanceDeductionType, string> = {
  ALLOWANCE: 'Allowance',
  DEDUCTION: 'Deduction',
}

/** Blank form values for a new allowance / deduction. */
export const EMPTY_ALLOWANCE_DEDUCTION_FORM: AllowanceDeductionFormValues = {
  type: 'ALLOWANCE',
  name: '',
  shortName: '',
}
