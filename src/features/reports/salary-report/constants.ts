import type { ReportTypeOption } from '@/features/reports/common'

/** The five reads the Salary Report offers, in the order the Type dropdown lists them. */
export type SalaryReportType =
  | 'pay-slip'
  | 'pay-register'
  | 'gross-salary'
  | 'paid-salary'
  | 'unpaid-salary'

/**
 * Each type's own sortable columns, verbatim from the endpoint's `sort` enum.
 *
 * These are not decoration. **A `sort` naming a column another type shows is a
 * 400**, so the columns are built against these sets and a header the endpoint
 * would refuse is never clickable — including columns that are always constant
 * (the challan's `rfl`/`wag`, the ECR's `refund`), which the API leaves out on
 * purpose since a constant column has no order.
 */
const PAY_SLIP_SORTABLE = [
  'employee_name',
  'employee_code',
  'designation_name',
  'department_name',
  'present_days',
  'working_days',
  'basic_pay',
  'gross_pay',
  'deductions',
  'net_pay',
] as const

const PAY_REGISTER_SORTABLE = [
  'employee_name',
  'employee_code',
  'department_name',
  'gender',
  'birth_date',
  'marital_status',
  'primary_mobile',
  'joining_date',
  'aadhar_number',
  'uan_number',
  'esic_number',
  'bank_name',
  'bank_account_number',
  'ifsc_code',
  'bank_branch_name',
  'relative_type',
  'relative_name',
  'email',
  'location',
  'present_days',
  'working_days',
  'basic_pay',
  'gross_pay',
  'pf_amount',
  'esic_amount',
  'pt_amount',
  'total_deduction',
  'net_pay',
] as const

const GROSS_SALARY_SORTABLE = [
  'employee_name',
  'employee_code',
  'department_name',
  'designation_name',
  'total_gross_pay',
  'primary_mobile',
  'aadhar_number',
  'joining_date',
] as const

const PAID_SALARY_SORTABLE = [
  'employee_name',
  'employee_code',
  'primary_mobile',
  'net_pay',
  'payment_date',
] as const

const UNPAID_SALARY_SORTABLE = [
  'employee_name',
  'employee_code',
  'primary_mobile',
  'gross_pay',
  'net_pay',
] as const

export const SALARY_REPORT_TYPES: readonly ReportTypeOption<SalaryReportType>[] = [
  {
    value: 'pay-slip',
    label: 'Pay Slip',
    description:
      'One row per processed salary: the days the month was paid on and the four money columns. Deductions is the whole month’s — PF, ESIC, PT, LWF, TDS and every deduction head — so gross less deductions is always the net.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PAY_SLIP_SORTABLE,
  },
  {
    value: 'pay-register',
    label: 'Pay Register',
    description:
      'The statutory register: one employee’s whole month in fixed columns — particulars, statutory numbers, bank details and pay. The PF, ESIC and PT figures here are the employee’s halves; the employer’s contributions are a company cost, not a deduction, and are not on this report.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PAY_REGISTER_SORTABLE,
  },
  {
    value: 'gross-salary',
    label: 'Gross Salary',
    description:
      'What each employee earned across a RANGE of months. Grouped per employee, so someone who transferred mid-range is one line and the record count is a count of employees, not of processed months.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: GROSS_SALARY_SORTABLE,
    isRange: true,
  },
  {
    value: 'paid-salary',
    label: 'Paid Salary',
    description:
      'The months of the period already released, with the date each batch went out.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PAID_SALARY_SORTABLE,
  },
  {
    value: 'unpaid-salary',
    label: 'Unpaid Salary',
    description:
      'The mirror: processed but still outstanding. This reports what is owed — releasing it is the Pay Salary screen.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: UNPAID_SALARY_SORTABLE,
  },
]
