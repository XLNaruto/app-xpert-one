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
      'One Row per Processed Salary: The Days the Month Was Paid on and the Four Money Columns. Deductions Is the Whole Month’s — PF, ESIC, PT, LWF, TDS and Every Deduction Head — So Gross Less Deductions Is Always the Net.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PAY_SLIP_SORTABLE,
  },
  {
    value: 'pay-register',
    label: 'Pay Register',
    description:
      'The Statutory Register: One Employee’s Whole Month in Fixed Columns — Particulars, Statutory Numbers, Bank Details and Pay. The PF, ESIC and PT Figures Here Are the Employee’s Halves; The Employer’s Contributions Are a Company Cost, Not a Deduction, and Are Not on This Report.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PAY_REGISTER_SORTABLE,
  },
  {
    value: 'gross-salary',
    label: 'Gross Salary',
    description:
      'What Each Employee Earned Across a RANGE of Months. Grouped per Employee, So Someone Who Transferred Mid-Range Is One Line and the Record Count Is a Count of Employees, Not of Processed Months.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: GROSS_SALARY_SORTABLE,
    isRange: true,
  },
  {
    value: 'paid-salary',
    label: 'Paid Salary',
    description:
      'The Months of the Period Already Released, with the Date Each Batch Went Out.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PAID_SALARY_SORTABLE,
  },
  {
    value: 'unpaid-salary',
    label: 'Unpaid Salary',
    description:
      'The Mirror: Processed but Still Outstanding. This Reports What Is Owed — Releasing It Is the Pay Salary Screen.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: UNPAID_SALARY_SORTABLE,
  },
]
