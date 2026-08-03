import type { ComboboxOption } from '@/components/ui/combobox'
import { amountLabel } from '@/lib/currency'
import type { EsicRateFormValues } from './schemas'
import type { EsicRateValueField, EsicRateValueKey } from './types'

/** Blank form values for a new ESIC rate slab. */
export const EMPTY_ESIC_RATE_FORM: EsicRateFormValues = {
  wef: '',
  wageCeilingLimit: '',
  minimumRate: '',
  contributionEndPeriod1: '',
  contributionEndPeriod2: '',
  employeeEsiContribution: '',
  employerEsiContribution: '',
  disabilityDuration: '',
  disabilityWageLimit: '',
}

/**
 * The `sort` values `/user/esic-rates` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const ESIC_RATE_SORT = {
  effectiveDate: 'effective_date',
  createdAt: 'created_at',
} as const

/** Which slab value columns the endpoint can order by, by their API name. */
export const ESIC_RATE_VALUE_SORT_FIELDS: Partial<Record<EsicRateValueKey, string>> = {
  wageCeilingLimit: 'wage_ceiling_limit',
  minimumRate: 'minimum_rate',
  employeeEsiContribution: 'employee_esic_contribution',
  employerEsiContribution: 'employer_esic_contribution',
}

/** Newest record first — the order the list opens in and reverts to. */
export const ESIC_RATE_DEFAULT_SORT = { id: ESIC_RATE_SORT.createdAt, desc: true }

/** Month options for the two contribution-period dropdowns. */
export const MONTH_OPTIONS: ComboboxOption[] = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

/**
 * Every numeric field on the slab, in the order the form and the list show
 * them. One descriptor drives both the form fields and the list columns, so a
 * new value never has to be added in two places.
 */
export const ESIC_RATE_VALUE_FIELDS: EsicRateValueField[] = [
  {
    key: 'wageCeilingLimit',
    title: 'ESIC Wage Ceiling',
    label: amountLabel('ESIC Wage Ceiling'),
    kind: 'amount',
  },
  {
    key: 'minimumRate',
    title: 'Minimum Rate',
    label: amountLabel('Minimum Rate'),
    kind: 'amount',
  },
  {
    key: 'employeeEsiContribution',
    title: 'Employee Contribution',
    label: 'Employee Contribution (%)',
    kind: 'percent',
  },
  {
    key: 'employerEsiContribution',
    title: 'Employer Contribution',
    label: 'Employer Contribution (%)',
    kind: 'percent',
  },
  {
    key: 'disabilityDuration',
    title: 'Disability Duration',
    label: 'Disability Duration (Year)',
    kind: 'duration',
  },
  {
    key: 'disabilityWageLimit',
    title: 'Disability Wage Limit',
    label: amountLabel('Disability Wage Limit'),
    kind: 'amount',
  },
]

/**
 * The two contribution-period dropdowns sit between the amount fields and the
 * contribution percentages on the form — this is where the numeric descriptor
 * list is split so they land in the same order as the rest of the master.
 */
export const PERIOD_FIELDS_AFTER = 2
