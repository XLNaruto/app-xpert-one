import type { ReportTypeOption } from '@/features/reports/common'

/** The two ESIC reads. */
export type EsicReportType = 'esic-statement' | 'esic-challan'

const ESIC_STATEMENT_SORTABLE = [
  'insurance_no',
  'employee_name',
  'employee_code',
  'department_name',
  'designation_name',
  'no_of_days',
  'wages',
  'esi_employee',
  'esi_employer',
  'total_esi',
] as const

/**
 * The challan names its own columns `ip_no` / `ip_name` rather than the
 * statement's `insurance_no` / `employee_name` — the portal's spelling, kept.
 * `reason_for_zero_wages` is absent on purpose: it is always null, and a
 * constant column has no order.
 */
const ESIC_CHALLAN_SORTABLE = [
  'ip_no',
  'ip_name',
  'employee_code',
  'department_name',
  'designation_name',
  'no_of_days',
  'total_monthly_wages',
  'last_working_day',
] as const

export const ESIC_REPORT_TYPES: readonly ReportTypeOption<EsicReportType>[] = [
  {
    value: 'esic-statement',
    label: 'ESIC Statement',
    description:
      'One line per insured employee: the IP number, the contributing days, the ESIC wage and both contributions. All three money columns can legitimately be 0 — under “As Per Act” a wage over the ceiling takes the employee out of scope for the month.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: ESIC_STATEMENT_SORTABLE,
  },
  {
    value: 'esic-challan',
    label: 'ESIC Challan',
    description:
      'The Challan Sheet in the Portal’s Own Columns. Deliberately WITHOUT the Contributions: A Challan Declares the Wage and the Days, and the Portal Computes What Is Owed from Them.',
    defaultSort: { id: 'ip_name', desc: false },
    sortable: ESIC_CHALLAN_SORTABLE,
  },
]
