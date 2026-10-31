import type { ReportTypeOption } from '@/features/reports/common'

/** The four EPFO sheets the PF Report offers. */
export type PfReportType = 'pf-challan' | 'pf-statement' | 'new-joining' | 'ecr'

/**
 * Each type's sortable columns, verbatim from its `sort` enum.
 *
 * The absences are deliberate on the API's side and are kept here: the challan's
 * `rfl`, `wag` and `ee_transfer` and the ECR's `refund` are always 0 — this
 * system has no source for a reason-for-leaving code, an arrears wage, a
 * transferred-in balance or an EPFO-side refund — and a constant column has no
 * order to define. Sorting on one is a 400, so those headers stay inert.
 */
const PF_CHALLAN_SORTABLE = [
  'employee_name',
  'employee_code',
  'pf_number',
  'uan_number',
  'department_name',
  'designation_name',
  'wages',
  'epf_wages',
  'ee',
  'ncp_days',
  'dol',
  'er',
  'eps',
] as const

const PF_STATEMENT_SORTABLE = [
  'employee_name',
  'employee_code',
  'pf_number',
  'uan_number',
  'department_name',
  'designation_name',
  'pf_rate_percent',
  'wages',
  'total',
  'pf_amount',
  'pension_amount',
] as const

const NEW_JOINING_SORTABLE = [
  'employee_name',
  'employee_code',
  'gender',
  'relative_name',
  'relative_type',
  'birth_date',
  'joining_date',
  'primary_mobile',
  'bank_account_number',
  'city_name',
  'state_name',
  'marital_status',
  'department_name',
  'designation_name',
] as const

const ECR_SORTABLE = [
  'uan_number',
  'employee_name',
  'employee_code',
  'department_name',
  'designation_name',
  'gross_wages',
  'epf_wages',
  'eps_wages',
  'edli_wages',
  'epf_contribution',
  'eps_contribution',
  'epf_eps_diff',
  'ncp_days',
] as const

export const PF_REPORT_TYPES: readonly ReportTypeOption<PfReportType>[] = [
  {
    value: 'pf-challan',
    label: 'PF Challan',
    description:
      'Form 3A, One Line per PF Member. Wages Here Is a DAY COUNT, Not Money — The Money Base Beside It Is EPF Wages. Only Months the PF Act Applied to Are on It, or It Wouldn’t Reconcile with the Challan That Is Filed.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PF_CHALLAN_SORTABLE,
  },
  {
    value: 'pf-statement',
    label: 'PF Statement',
    description:
      'The Employer’s Contribution Statement. Its Wages Is the AGREED Basic Capped at the Ceiling — Not the Challan’s Prorated EPF Wages — So the Two Legitimately Print Different Wages for the Same Employee in the Same Month.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PF_STATEMENT_SORTABLE,
  },
  {
    value: 'new-joining',
    label: 'New Joining PF',
    description:
      'The EPFO New-Member Sheet. The Only Type Read off POSTINGS Rather Than Payroll, So a Joiner Can Be Registered Before Their First Month Is Processed — Which Is Why Nothing on It Is Money and a Re-join Is a Second Line.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: NEW_JOINING_SORTABLE,
  },
  {
    value: 'ecr',
    label: 'ECR',
    description:
      'The Electronic Challan Cum Return, Keyed by UAN. A PF Member with No UAN on File Is NOT on It — The Portal Rejects a Line Without One — So Expect Fewer Records Here Than on the Challan for the Same Filter.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: ECR_SORTABLE,
  },
]
