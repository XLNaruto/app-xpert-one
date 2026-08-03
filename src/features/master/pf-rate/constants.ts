import { amountLabel } from '@/lib/currency'
import type { PfRateFormValues } from './schemas'
import type { PfRateValueField, PfRateValueKey } from './types'

/** Blank form values for a new PF rate slab. */
export const EMPTY_PF_RATE_FORM: PfRateFormValues = {
  wef: '',
  wageCeilingLimit: '',
  edliWageCeilingLimit: '',
  employeePfContribution: '',
  employerPfContribution: '',
  employerFpfContribution: '',
  deduction: '0',
  adminCharges: '',
  edliCharges: '',
  edliAdminCharges: '',
  minimumAdminCharges: '',
  maximumEdliCharges: '',
  minimumClosedAdminCharges: '',
  minimumEdliClosedCharges: '',
  pensionFundAgeLimit: '',
}

/** Tooltip copy for the info icon beside the W.E.F date. */
export const WEF_HINT =
  'The date from which a PF rule or rate becomes applicable.'

/**
 * The `sort` values `/user/pf-rates` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const PF_RATE_SORT = {
  effectiveDate: 'effective_date',
  createdAt: 'created_at',
} as const

/** Which slab value columns the endpoint can order by, by their API name. */
export const PF_RATE_VALUE_SORT_FIELDS: Partial<Record<PfRateValueKey, string>> = {
  wageCeilingLimit: 'wage_ceiling_limit',
  employeePfContribution: 'employee_pf_contribution',
  employerPfContribution: 'employer_pf_contribution',
  deduction: 'deduction',
}

/** Newest record first — the order the list opens in and reverts to. */
export const PF_RATE_DEFAULT_SORT = { id: PF_RATE_SORT.createdAt, desc: true }

/**
 * Every numeric field on the slab, in the order the form and both tables show
 * them. One descriptor drives the form fields, the list columns and the history
 * columns, so a new rate never has to be added in three places.
 *
 * `hint` is the tooltip copy — PF terminology is dense enough that the field
 * name alone rarely explains what to key in.
 */
export const PF_RATE_VALUE_FIELDS: (PfRateValueField & {
  hint: string
  /** Shown disabled and not required — the value is fixed, not keyed in. */
  locked?: boolean
})[] = [
  {
    key: 'wageCeilingLimit',
    title: 'Wage Ceiling Limit',
    label: amountLabel('Wage Ceiling Limit'),
    kind: 'amount',
    hint: 'Maximum salary amount on which PF is calculated.',
  },
  {
    key: 'edliWageCeilingLimit',
    title: 'EDLI Wage Ceiling Limit',
    label: amountLabel('EDLI Wage Ceiling Limit'),
    kind: 'amount',
    hint: 'Maximum wage considered for EDLI (Employee Deposit Linked Insurance).',
  },
  {
    key: 'employeePfContribution',
    title: 'Employee PF Contribution',
    label: 'Employee PF Contribution (%)',
    kind: 'percent',
    hint: 'Percentage of salary deducted from employee salary.',
  },
  {
    key: 'employerPfContribution',
    title: 'Employer PF Contribution',
    label: 'Employer PF Contribution (%)',
    kind: 'percent',
    hint: 'Total PF contribution paid by employer.',
  },
  {
    key: 'employerFpfContribution',
    title: 'Employer FPF Contribution',
    label: 'Employer FPF Contribution (%)',
    kind: 'percent',
    hint: 'Part of employer contribution going to pension scheme.',
  },
  {
    key: 'deduction',
    title: 'Deduction',
    label: 'Deduction (%)',
    kind: 'percent',
    locked: true,
    hint: 'Total PF contribution of employer.',
  },
  {
    key: 'adminCharges',
    title: 'Admin Charges',
    label: 'Admin Charges (%)',
    kind: 'percent',
    hint: 'PF administration fee paid by employer.',
  },
  {
    key: 'edliCharges',
    title: 'EDLI Charges',
    label: 'EDLI Charges (%)',
    kind: 'percent',
    hint: 'Insurance contribution paid by employer for EDLI.',
  },
  {
    key: 'edliAdminCharges',
    title: 'EDLI Admin Charges',
    label: 'EDLI Admin Charges (%)',
    kind: 'percent',
    hint: 'Administrative charge for managing EDLI scheme.',
  },
  {
    key: 'minimumAdminCharges',
    title: 'Minimum Admin Charges',
    label: amountLabel('Minimum Admin Charges'),
    kind: 'amount',
    hint: 'Minimum PF admin charge payable for an active establishment.',
  },
  {
    key: 'maximumEdliCharges',
    title: 'Maximum EDLI Charges',
    label: amountLabel('Maximum EDLI Charges'),
    kind: 'amount',
    hint: 'Maximum EDLI contribution per employee.',
  },
  {
    key: 'minimumClosedAdminCharges',
    title: 'Minimum Closed Admin Charges',
    label: amountLabel('Minimum Closed Admin Charges'),
    kind: 'amount',
    hint: 'Minimum PF admin charge when there are no employees or the establishment is temporarily closed.',
  },
  {
    key: 'minimumEdliClosedCharges',
    title: 'Minimum EDLI Closed Charges',
    label: amountLabel('Minimum EDLI Closed Charges'),
    kind: 'amount',
    hint: 'Minimum EDLI charge when establishment is closed.',
  },
  {
    key: 'pensionFundAgeLimit',
    title: 'Pension Fund Age Limit',
    label: 'Pension Fund Age Limit (Years)',
    kind: 'age',
    hint: 'Age limit till which pension contribution is applicable.',
  },
]
