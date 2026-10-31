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
    hint: 'Maximum Salary Amount on Which PF Is Calculated.',
  },
  {
    key: 'edliWageCeilingLimit',
    title: 'EDLI Wage Ceiling Limit',
    label: amountLabel('EDLI Wage Ceiling Limit'),
    kind: 'amount',
    hint: 'Maximum Wage Considered for EDLI (Employee Deposit Linked Insurance).',
  },
  {
    key: 'employeePfContribution',
    title: 'Employee PF Contribution',
    label: 'Employee PF Contribution (%)',
    kind: 'percent',
    hint: 'Percentage of Salary Deducted from Employee Salary.',
  },
  {
    key: 'employerPfContribution',
    title: 'Employer PF Contribution',
    label: 'Employer PF Contribution (%)',
    kind: 'percent',
    hint: 'Total PF Contribution Paid by Employer.',
  },
  {
    key: 'employerFpfContribution',
    title: 'Employer FPF Contribution',
    label: 'Employer FPF Contribution (%)',
    kind: 'percent',
    hint: 'Part of Employer Contribution Going to Pension Scheme.',
  },
  {
    key: 'deduction',
    title: 'Deduction',
    label: 'Deduction (%)',
    kind: 'percent',
    locked: true,
    hint: 'Total PF Contribution of Employer.',
  },
  {
    key: 'adminCharges',
    title: 'Admin Charges',
    label: 'Admin Charges (%)',
    kind: 'percent',
    hint: 'PF Administration Fee Paid by Employer.',
  },
  {
    key: 'edliCharges',
    title: 'EDLI Charges',
    label: 'EDLI Charges (%)',
    kind: 'percent',
    hint: 'Insurance Contribution Paid by Employer for EDLI.',
  },
  {
    key: 'edliAdminCharges',
    title: 'EDLI Admin Charges',
    label: 'EDLI Admin Charges (%)',
    kind: 'percent',
    hint: 'Administrative Charge for Managing EDLI Scheme.',
  },
  {
    key: 'minimumAdminCharges',
    title: 'Minimum Admin Charges',
    label: amountLabel('Minimum Admin Charges'),
    kind: 'amount',
    hint: 'Minimum PF Admin Charge Payable for an Active Establishment.',
  },
  {
    key: 'maximumEdliCharges',
    title: 'Maximum EDLI Charges',
    label: amountLabel('Maximum EDLI Charges'),
    kind: 'amount',
    hint: 'Maximum EDLI Contribution per Employee.',
  },
  {
    key: 'minimumClosedAdminCharges',
    title: 'Minimum Closed Admin Charges',
    label: amountLabel('Minimum Closed Admin Charges'),
    kind: 'amount',
    hint: 'Minimum PF Admin Charge When There Are No Employees or the Establishment Is Temporarily Closed.',
  },
  {
    key: 'minimumEdliClosedCharges',
    title: 'Minimum EDLI Closed Charges',
    label: amountLabel('Minimum EDLI Closed Charges'),
    kind: 'amount',
    hint: 'Minimum EDLI Charge When Establishment Is Closed.',
  },
  {
    key: 'pensionFundAgeLimit',
    title: 'Pension Fund Age Limit',
    label: 'Pension Fund Age Limit (Years)',
    kind: 'age',
    hint: 'Age Limit Till Which Pension Contribution Is Applicable.',
  },
]
