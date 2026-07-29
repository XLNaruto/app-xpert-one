import type { ComboboxOption } from '@/components/ui/combobox'
import type { AllowanceDeductionType } from './types'
import type { AllowanceDeductionFormValues } from './schemas'

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
