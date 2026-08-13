import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CodeCell,
  DateCell,
  DaysCell,
  EmployeeCell,
  MoneyCell,
  NUMERIC_CELL,
  PLAIN_CELL,
  ReportTable,
  TextCell,
  serialColumn,
  type ReportTableProps,
} from '@/features/reports/common'
import { SALARY_REPORT_TYPES, type SalaryReportType } from '../constants'
import type {
  GrossSalaryRow,
  PaidSalaryRow,
  PayRegisterRow,
  PaySlipRow,
  UnpaidSalaryRow,
} from '../types'

/**
 * The five Salary Report tables — one per type, each owning its own columns.
 *
 * They live together here rather than inline in the page because the screen is
 * really five list screens behind a Type switch: the Pay Register alone prints
 * twenty-nine columns, and five column sets in one page body would bury the
 * layout they belong to. Each type's columns still sit next to the table that
 * renders them, which is what matters.
 *
 * **A column is sortable only if the endpoint says so.** Each type accepts only
 * its own `sort` values and answers a 400 for anything else, so `sortable()`
 * reads the accepted set off the type's own definition and every other header is
 * inert. That includes columns that are always constant — sorting on a column
 * that never varies is an order the API declines to define.
 *
 * A column's **id is the API's own field name**, so a header click reaches
 * `?sort=` untranslated (CLAUDE.md rule #7c).
 */
function sortable(type: SalaryReportType): (id: string) => boolean {
  const accepted = new Set(
    SALARY_REPORT_TYPES.find((option) => option.value === type)?.sortable ?? [],
  )
  return (id: string) => accepted.has(id)
}

interface TableProps<TRow> extends ReportTableProps {
  rows: TRow[]
}

/* ────────────────────────── Pay Slip ────────────────────────── */

export function PaySlipTable({ rows, ...table }: TableProps<PaySlipRow>) {
  const canSort = sortable('pay-slip')

  const columns = useMemo<ColumnDef<PaySlipRow>[]>(
    () => [
      serialColumn<PaySlipRow>(table.offset),
      {
        id: 'employee_name',
        header: 'Employee Name',
        enableSorting: canSort('employee_name'),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <EmployeeCell name={row.original.employeeName} code={row.original.employeeCode} />
        ),
      },
      {
        id: 'designation_name',
        header: 'Designation',
        enableSorting: canSort('designation_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.designationName} />,
      },
      {
        id: 'department_name',
        header: 'Department',
        enableSorting: canSort('department_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.departmentName} />,
      },
      {
        id: 'present_days',
        header: 'Present Days',
        enableSorting: canSort('present_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.presentDays} />,
      },
      {
        id: 'working_days',
        header: 'Working Days',
        enableSorting: canSort('working_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.workingDays} />,
      },
      {
        id: 'basic_pay',
        header: 'Basic Pay',
        enableSorting: canSort('basic_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.basicPay} />,
      },
      {
        id: 'gross_pay',
        header: 'Gross Pay',
        enableSorting: canSort('gross_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.grossPay} />,
      },
      {
        /* The month's WHOLE deduction — PF, ESIC, PT, LWF, TDS and every
           deduction head — so gross less this is always the net. */
        id: 'deductions',
        header: 'Deductions',
        enableSorting: canSort('deductions'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.deductions} tone="negative" />,
      },
      {
        id: 'net_pay',
        header: 'Net Pay',
        enableSorting: canSort('net_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.netPay} tone="positive" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ──────────────────────── Pay Register ──────────────────────── */

export function PayRegisterTable({ rows, ...table }: TableProps<PayRegisterRow>) {
  const canSort = sortable('pay-register')

  const columns = useMemo<ColumnDef<PayRegisterRow>[]>(
    () => [
      serialColumn<PayRegisterRow>(table.offset),
      {
        id: 'employee_name',
        header: 'Employee Name',
        enableSorting: canSort('employee_name'),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <EmployeeCell name={row.original.employeeName} code={row.original.employeeCode} />
        ),
      },
      {
        id: 'department_name',
        header: 'Department',
        enableSorting: canSort('department_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.departmentName} />,
      },
      {
        /* The WORK location — the branch the posting sits under. Null for a
           company that keeps no branches; never a home address. */
        id: 'location',
        header: 'Location',
        enableSorting: canSort('location'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.location} />,
      },
      {
        id: 'gender',
        header: 'Gender',
        enableSorting: canSort('gender'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.gender} />,
      },
      {
        id: 'birth_date',
        header: 'Birth Date',
        enableSorting: canSort('birth_date'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.birthDate} />,
      },
      {
        id: 'marital_status',
        header: 'Marital Status',
        enableSorting: canSort('marital_status'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.maritalStatus} />,
      },
      {
        id: 'relative_type',
        header: 'Relation',
        enableSorting: canSort('relative_type'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.relativeType} />,
      },
      {
        id: 'relative_name',
        header: 'Relative Name',
        enableSorting: canSort('relative_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.relativeName} />,
      },
      {
        id: 'primary_mobile',
        header: 'Mobile',
        enableSorting: canSort('primary_mobile'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.primaryMobile} />,
      },
      {
        id: 'email',
        header: 'Email',
        enableSorting: canSort('email'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.email} />,
      },
      {
        id: 'joining_date',
        header: 'Joining Date',
        enableSorting: canSort('joining_date'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.joiningDate} />,
      },
      {
        id: 'aadhar_number',
        header: 'Aadhar No.',
        enableSorting: canSort('aadhar_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.aadharNumber} />,
      },
      {
        id: 'uan_number',
        header: 'UAN',
        enableSorting: canSort('uan_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.uanNumber} />,
      },
      {
        id: 'esic_number',
        header: 'ESIC No.',
        enableSorting: canSort('esic_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.esicNumber} />,
      },
      {
        id: 'bank_name',
        header: 'Bank',
        enableSorting: canSort('bank_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.bankName} />,
      },
      {
        id: 'bank_branch_name',
        header: 'Bank Branch',
        enableSorting: canSort('bank_branch_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.bankBranchName} />,
      },
      {
        id: 'bank_account_number',
        header: 'Account No.',
        enableSorting: canSort('bank_account_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.bankAccountNumber} />,
      },
      {
        id: 'ifsc_code',
        header: 'IFSC',
        enableSorting: canSort('ifsc_code'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.ifscCode} />,
      },
      {
        id: 'present_days',
        header: 'Present Days',
        enableSorting: canSort('present_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.presentDays} />,
      },
      {
        id: 'working_days',
        header: 'Working Days',
        enableSorting: canSort('working_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.workingDays} />,
      },
      {
        id: 'basic_pay',
        header: 'Basic Pay',
        enableSorting: canSort('basic_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.basicPay} />,
      },
      {
        id: 'gross_pay',
        header: 'Gross Pay',
        enableSorting: canSort('gross_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.grossPay} />,
      },
      {
        /* The EMPLOYEE's half, throughout. The employer's contributions are a
           cost to the company, not a deduction, and this register omits them. */
        id: 'pf_amount',
        header: 'PF',
        enableSorting: canSort('pf_amount'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.pfAmount} tone="negative" />,
      },
      {
        id: 'esic_amount',
        header: 'ESIC',
        enableSorting: canSort('esic_amount'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.esicAmount} tone="negative" />,
      },
      {
        id: 'pt_amount',
        header: 'PT',
        enableSorting: canSort('pt_amount'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.ptAmount} tone="negative" />,
      },
      {
        id: 'total_deduction',
        header: 'Total Deduction',
        enableSorting: canSort('total_deduction'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.totalDeduction} tone="negative" />,
      },
      {
        id: 'net_pay',
        header: 'Net Pay',
        enableSorting: canSort('net_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.netPay} tone="positive" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ─────────────────────── Gross Salary ──────────────────────── */

export function GrossSalaryTable({ rows, ...table }: TableProps<GrossSalaryRow>) {
  const canSort = sortable('gross-salary')

  const columns = useMemo<ColumnDef<GrossSalaryRow>[]>(
    () => [
      serialColumn<GrossSalaryRow>(table.offset),
      {
        id: 'employee_name',
        header: 'Employee Name',
        enableSorting: canSort('employee_name'),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <EmployeeCell name={row.original.employeeName} code={row.original.employeeCode} />
        ),
      },
      {
        /* From the employee's LATEST period inside the range — someone who moved
           department mid-range is reported under where they ended up. */
        id: 'department_name',
        header: 'Department',
        enableSorting: canSort('department_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.departmentName} />,
      },
      {
        id: 'designation_name',
        header: 'Designation',
        enableSorting: canSort('designation_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.designationName} />,
      },
      {
        id: 'primary_mobile',
        header: 'Mobile',
        enableSorting: canSort('primary_mobile'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.primaryMobile} />,
      },
      {
        id: 'aadhar_number',
        header: 'Aadhar No.',
        enableSorting: canSort('aadhar_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.aadharNumber} />,
      },
      {
        id: 'joining_date',
        header: 'Joining Date',
        enableSorting: canSort('joining_date'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.joiningDate} />,
      },
      {
        /* How many months of the range this ONE line covers — the report groups
           per employee, so a transfer mid-range is still a single row. */
        id: 'months_processed',
        header: 'Months',
        enableSorting: canSort('months_processed'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.monthsProcessed} />,
      },
      {
        id: 'total_gross_pay',
        header: 'Total Gross Pay',
        enableSorting: canSort('total_gross_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.totalGrossPay} tone="positive" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ─────────────────────── Paid Salary ───────────────────────── */

export function PaidSalaryTable({ rows, ...table }: TableProps<PaidSalaryRow>) {
  const canSort = sortable('paid-salary')

  const columns = useMemo<ColumnDef<PaidSalaryRow>[]>(
    () => [
      serialColumn<PaidSalaryRow>(table.offset),
      {
        id: 'employee_name',
        header: 'Employee Name',
        enableSorting: canSort('employee_name'),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <EmployeeCell name={row.original.employeeName} code={row.original.employeeCode} />
        ),
      },
      {
        id: 'primary_mobile',
        header: 'Mobile',
        enableSorting: canSort('primary_mobile'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.primaryMobile} />,
      },
      {
        id: 'net_pay',
        header: 'Net Pay',
        enableSorting: canSort('net_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.netPay} tone="positive" />,
      },
      {
        /* The date of the BATCH that settled the row, not the salary's own. */
        id: 'payment_date',
        header: 'Payment Date',
        enableSorting: canSort('payment_date'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.paymentDate} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ────────────────────── Unpaid Salary ──────────────────────── */

export function UnpaidSalaryTable({ rows, ...table }: TableProps<UnpaidSalaryRow>) {
  const canSort = sortable('unpaid-salary')

  const columns = useMemo<ColumnDef<UnpaidSalaryRow>[]>(
    () => [
      serialColumn<UnpaidSalaryRow>(table.offset),
      {
        id: 'employee_name',
        header: 'Employee Name',
        enableSorting: canSort('employee_name'),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <EmployeeCell name={row.original.employeeName} code={row.original.employeeCode} />
        ),
      },
      {
        id: 'primary_mobile',
        header: 'Mobile',
        enableSorting: canSort('primary_mobile'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.primaryMobile} />,
      },
      {
        id: 'gross_pay',
        header: 'Gross Pay',
        enableSorting: canSort('gross_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.grossPay} />,
      },
      {
        id: 'net_pay',
        header: 'Net Pay Due',
        enableSorting: canSort('net_pay'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.netPay} tone="negative" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}
