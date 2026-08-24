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
      'Form 3A, one line per PF member. Wages here is a DAY COUNT, not money — the money base beside it is EPF Wages. Only months the PF act applied to are on it, or it wouldn’t reconcile with the challan that is filed.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PF_CHALLAN_SORTABLE,
  },
  {
    value: 'pf-statement',
    label: 'PF Statement',
    description:
      'The employer’s contribution statement. Its Wages is the AGREED basic capped at the ceiling — not the challan’s prorated EPF Wages — so the two legitimately print different wages for the same employee in the same month.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PF_STATEMENT_SORTABLE,
  },
  {
    value: 'new-joining',
    label: 'New Joining PF',
    description:
      'The EPFO new-member sheet. The only type read off POSTINGS rather than payroll, so a joiner can be registered before their first month is processed — which is why nothing on it is money and a re-join is a second line.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: NEW_JOINING_SORTABLE,
  },
  {
    value: 'ecr',
    label: 'ECR',
    description:
      'The Electronic Challan cum Return, keyed by UAN. A PF member with no UAN on file is NOT on it — the portal rejects a line without one — so expect fewer records here than on the challan for the same filter.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: ECR_SORTABLE,
  },
]
