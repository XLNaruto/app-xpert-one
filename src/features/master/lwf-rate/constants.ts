import { amountLabel } from '@/lib/currency'
import type { ComboboxOption } from '@/components/ui/combobox'
import type { LwfRateFormValues } from './schemas'

export const MONTH_OPTIONS: ComboboxOption[] = [
  { label: 'Every Month', value: '0' },
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
]

/** Field/column labels, shared by the form, the list and the history table. */
export const LWF_LABELS = {
  wef: 'W.E.F (With Effect From)',
  state: 'State',
  month: 'Applicable Month',
  employeeContribution: amountLabel('Employee Contribution'),
  employerContribution: amountLabel('Employer Contribution'),
} as const

/** Blank form values for a new LWF rate. */
export const EMPTY_LWF_RATE_FORM: LwfRateFormValues = {
  wef: '',
  stateId: '',
  month: '',
  employeeContribution: '',
  employerContribution: '',
}
