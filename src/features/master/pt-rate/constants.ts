import { amountLabel } from '@/lib/currency'
import type { ComboboxOption } from '@/components/ui/combobox'
import type { PtRateFormValues, PtSlabFormValues } from './schemas'

/** `'0'` covers every month; the rest are calendar months in payroll order. */
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

/** `Both` is the default — most states don't split PT by gender. */
export const GENDER_OPTIONS: ComboboxOption[] = [
  { label: 'Both', value: 'Both' },
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
]

/** Column/field labels for a slab, shared by the form and the history table. */
export const SLAB_LABELS = {
  minSalary: amountLabel('Minimum Salary'),
  maxSalary: amountLabel('Maximum Salary'),
  amount: amountLabel('Amount To Deduct'),
  month: 'Applicable Month',
  gender: 'Gender',
  minAge: 'Minimum Age',
} as const

/** A blank slab row — what "Add" appends and what a new rate starts with. */
export const EMPTY_PT_SLAB: PtSlabFormValues = {
  minSalary: '',
  maxSalary: '',
  amount: '',
  month: '0',
  gender: 'Both',
  minAge: '',
}

/** Blank form values for a new PT rate. */
export const EMPTY_PT_RATE_FORM: PtRateFormValues = {
  wef: '',
  stateId: '',
  detail: '',
  slabs: [EMPTY_PT_SLAB],
}
