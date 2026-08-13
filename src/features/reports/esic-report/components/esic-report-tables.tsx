import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CodeCell,
  Dash,
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
import { ESIC_REPORT_TYPES, type EsicReportType } from '../constants'
import type { EsicChallanRow, EsicStatementRow } from '../types'

/**
 * The two ESIC sheets.
 *
 * The challan keeps the portal's own column names (`IP No.`, `IP Name`) rather
 * than the statement's, because they are what the uploaded sheet is checked
 * against — and it stops at the wage and the days on purpose. The contributions
 * belong to the statement; the portal computes its own from the challan.
 */
function sortable(type: EsicReportType): (id: string) => boolean {
  const accepted = new Set(
    ESIC_REPORT_TYPES.find((option) => option.value === type)?.sortable ?? [],
  )
  return (id: string) => accepted.has(id)
}

interface TableProps<TRow> extends ReportTableProps {
  rows: TRow[]
}

/* ─────────────────────── ESIC Statement ────────────────────── */

export function EsicStatementTable({ rows, ...table }: TableProps<EsicStatementRow>) {
  const canSort = sortable('esic-statement')

  const columns = useMemo<ColumnDef<EsicStatementRow>[]>(
    () => [
      serialColumn<EsicStatementRow>(table.offset),
      {
        id: 'insurance_no',
        header: 'Insurance No.',
        enableSorting: canSort('insurance_no'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.insuranceNo} />,
      },
      {
        id: 'employee_name',
        header: 'Name',
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
        id: 'designation_name',
        header: 'Designation',
        enableSorting: canSort('designation_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.designationName} />,
      },
      {
        id: 'no_of_days',
        header: 'No. of Days',
        enableSorting: canSort('no_of_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.noOfDays} />,
      },
      {
        /* The wage the ACT was applied to, not the gross: a head the wage
           structure didn't mark ESIC-applicable is outside it, which is why this
           normally sits below the month's gross pay. */
        id: 'wages',
        header: 'Wages',
        enableSorting: canSort('wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.wages} />,
      },
      {
        /* All three can legitimately be 0 — under "As Per Act" a wage over the
           ceiling takes the employee out of scope for the month. That's a real
           state, so it prints as ₹0 rather than a dash. */
        id: 'esi_employee',
        header: 'ESI Employee',
        enableSorting: canSort('esi_employee'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.esiEmployee} tone="negative" />,
      },
      {
        id: 'esi_employer',
        header: 'ESI Employer',
        enableSorting: canSort('esi_employer'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.esiEmployer} />,
      },
      {
        id: 'total_esi',
        header: 'Total ESI',
        enableSorting: canSort('total_esi'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.totalEsi} tone="positive" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ──────────────────────── ESIC Challan ─────────────────────── */

export function EsicChallanTable({ rows, ...table }: TableProps<EsicChallanRow>) {
  const canSort = sortable('esic-challan')

  const columns = useMemo<ColumnDef<EsicChallanRow>[]>(
    () => [
      serialColumn<EsicChallanRow>(table.offset),
      {
        id: 'ip_no',
        header: 'IP No.',
        enableSorting: canSort('ip_no'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.ipNo} />,
      },
      {
        id: 'ip_name',
        header: 'IP Name',
        enableSorting: canSort('ip_name'),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <EmployeeCell name={row.original.ipName} code={row.original.employeeCode} />
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
        id: 'designation_name',
        header: 'Designation',
        enableSorting: canSort('designation_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.designationName} />,
      },
      {
        id: 'no_of_days',
        header: 'No. of Days',
        enableSorting: canSort('no_of_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.noOfDays} />,
      },
      {
        id: 'total_monthly_wages',
        header: 'Total Monthly Wages',
        enableSorting: canSort('total_monthly_wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.totalMonthlyWages} />,
      },
      {
        /* The sheet's own column, and ALWAYS null: why a month paid nothing is
           filled in on the portal, not held here. Printed so the sheet matches
           what is filed; never sortable, since it never varies. */
        id: 'reason_for_zero_wages',
        header: 'Reason for 0 Wages',
        enableSorting: false,
        meta: { className: PLAIN_CELL },
        cell: ({ row }) =>
          row.original.reasonForZeroWages ? row.original.reasonForZeroWages : <Dash />,
      },
      {
        /* The column the portal closes a member's contribution with — null for
           anyone still in service. */
        id: 'last_working_day',
        header: 'Last Working Day',
        enableSorting: canSort('last_working_day'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.lastWorkingDay} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}
