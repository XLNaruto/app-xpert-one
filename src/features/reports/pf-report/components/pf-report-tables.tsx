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
  PercentCell,
  ReportTable,
  TextCell,
  serialColumn,
  type ReportTableProps,
} from '@/features/reports/common'
import { PF_REPORT_TYPES, type PfReportType } from '../constants'
import type { PfChallanRow, PfEcrRow, PfNewJoiningRow, PfStatementRow } from '../types'

/**
 * The four PF sheets — one table per type, each owning its own columns.
 *
 * These are filing documents, so the columns keep the EPFO's own names even
 * where they read oddly: the challan's "Wages" really is a day count, and RFL,
 * WAG and EE Transfer really are always zero. Renaming them to something more
 * descriptive would be kinder to read and useless to reconcile against.
 *
 * A column is sortable only where the endpoint accepts it (`?sort=` takes each
 * type's own columns and 400s on anything else), and a column's **id is the
 * API's field name** so a header click travels untranslated.
 */
function sortable(type: PfReportType): (id: string) => boolean {
  const accepted = new Set(PF_REPORT_TYPES.find((option) => option.value === type)?.sortable ?? [])
  return (id: string) => accepted.has(id)
}

interface TableProps<TRow> extends ReportTableProps {
  rows: TRow[]
}

/* ───────────────────────── PF Challan ───────────────────────── */

export function PfChallanTable({ rows, ...table }: TableProps<PfChallanRow>) {
  const canSort = sortable('pf-challan')

  const columns = useMemo<ColumnDef<PfChallanRow>[]>(
    () => [
      serialColumn<PfChallanRow>(table.offset),
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
        id: 'pf_number',
        header: 'PF Number',
        enableSorting: canSort('pf_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.pfNumber} />,
      },
      {
        id: 'uan_number',
        header: 'UAN',
        enableSorting: canSort('uan_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.uanNumber} />,
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
        /* The form's own column, and a DAY COUNT despite the name — the money
           base is EPF Wages beside it. */
        id: 'wages',
        header: 'Wages (Days)',
        enableSorting: canSort('wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.wages} />,
      },
      {
        id: 'epf_wages',
        header: 'EPF Wages',
        enableSorting: canSort('epf_wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.epfWages} />,
      },
      {
        id: 'ee',
        header: 'EE',
        enableSorting: canSort('ee'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.ee} />,
      },
      {
        id: 'ncp_days',
        header: 'NCP Days',
        enableSorting: canSort('ncp_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.ncpDays} />,
      },
      {
        id: 'dol',
        header: 'DOL',
        enableSorting: canSort('dol'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.dol} />,
      },
      /* RFL, WAG and EE Transfer are always 0 — the form carries them and this
         system has no source for a reason-for-leaving code, an arrears wage or a
         transferred-in balance. Printed because the sheet is filed with them,
         and unsortable because the API declines to order a constant column. */
      {
        id: 'rfl',
        header: 'RFL',
        enableSorting: false,
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.rfl} />,
      },
      {
        id: 'wag',
        header: 'WAG',
        enableSorting: false,
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.wag} />,
      },
      {
        id: 'ee_transfer',
        header: 'EE Transfer',
        enableSorting: false,
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.eeTransfer} />,
      },
      {
        /* `er + eps` is the employer's whole PF for the month — the form splits
           one payment into two columns, it does not add a cost. */
        id: 'er',
        header: 'ER',
        enableSorting: canSort('er'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.er} />,
      },
      {
        id: 'eps',
        header: 'EPS',
        enableSorting: canSort('eps'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.eps} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ──────────────────────── PF Statement ─────────────────────── */

export function PfStatementTable({ rows, ...table }: TableProps<PfStatementRow>) {
  const canSort = sortable('pf-statement')

  const columns = useMemo<ColumnDef<PfStatementRow>[]>(
    () => [
      serialColumn<PfStatementRow>(table.offset),
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
        id: 'pf_number',
        header: 'PF Number',
        enableSorting: canSort('pf_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.pfNumber} />,
      },
      {
        id: 'uan_number',
        header: 'UAN',
        enableSorting: canSort('uan_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.uanNumber} />,
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
        /* Null for a FIXED contribution — the snapshot holds rupees in that mode
           and a "%" reading of it would say 1,800%. */
        id: 'pf_rate_percent',
        header: 'PF Rate',
        enableSorting: canSort('pf_rate_percent'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <PercentCell value={row.original.pfRatePercent} />,
      },
      {
        /* The AGREED basic capped at the ceiling, NOT the challan's prorated
           `epf_wages`: a statement is read against the wage, a challan against
           the days worked. */
        id: 'wages',
        header: 'Wages',
        enableSorting: canSort('wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.wages} />,
      },
      {
        id: 'total',
        header: 'Total',
        enableSorting: canSort('total'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.total} />,
      },
      {
        id: 'pf_amount',
        header: 'PF Amount',
        enableSorting: canSort('pf_amount'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.pfAmount} />,
      },
      {
        /* 0 past the pension age limit, when the whole employer contribution
           goes to PF — which is why PF Amount jumps to the combined rate there. */
        id: 'pension_amount',
        header: 'Pension Amount',
        enableSorting: canSort('pension_amount'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.pensionAmount} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ─────────────────────── New Joining PF ────────────────────── */

export function PfNewJoiningTable({ rows, ...table }: TableProps<PfNewJoiningRow>) {
  const canSort = sortable('new-joining')

  const columns = useMemo<ColumnDef<PfNewJoiningRow>[]>(
    () => [
      serialColumn<PfNewJoiningRow>(table.offset),
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
        id: 'gender',
        header: 'Gender',
        enableSorting: canSort('gender'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.gender} />,
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
        id: 'birth_date',
        header: 'Birth Date',
        enableSorting: canSort('birth_date'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.birthDate} />,
      },
      {
        id: 'joining_date',
        header: 'Joining Date',
        enableSorting: canSort('joining_date'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <DateCell value={row.original.joiningDate} />,
      },
      {
        id: 'primary_mobile',
        header: 'Mobile',
        enableSorting: canSort('primary_mobile'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.primaryMobile} />,
      },
      {
        id: 'bank_account_number',
        header: 'Bank Account',
        enableSorting: canSort('bank_account_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.bankAccountNumber} />,
      },
      {
        id: 'city_name',
        header: 'City',
        enableSorting: canSort('city_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.cityName} />,
      },
      {
        id: 'state_name',
        header: 'State',
        enableSorting: canSort('state_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.stateName} />,
      },
      {
        id: 'marital_status',
        header: 'Marital Status',
        enableSorting: canSort('marital_status'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.maritalStatus} />,
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}

/* ──────────────────────────── ECR ──────────────────────────── */

export function PfEcrTable({ rows, ...table }: TableProps<PfEcrRow>) {
  const canSort = sortable('ecr')

  const columns = useMemo<ColumnDef<PfEcrRow>[]>(
    () => [
      serialColumn<PfEcrRow>(table.offset),
      {
        /* The key the portal files on — first column, because a line without one
           isn't on this report at all. */
        id: 'uan_number',
        header: 'UAN',
        enableSorting: canSort('uan_number'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <CodeCell value={row.original.uanNumber} />,
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
        id: 'gross_wages',
        header: 'Gross Wages',
        enableSorting: canSort('gross_wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.grossWages} />,
      },
      {
        id: 'epf_wages',
        header: 'EPF Wages',
        enableSorting: canSort('epf_wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.epfWages} />,
      },
      {
        /* Falls to 0 past the pension age limit, as does EDLI beside it. */
        id: 'eps_wages',
        header: 'EPS Wages',
        enableSorting: canSort('eps_wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.epsWages} />,
      },
      {
        id: 'edli_wages',
        header: 'EDLI Wages',
        enableSorting: canSort('edli_wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.edliWages} />,
      },
      {
        id: 'epf_contribution',
        header: 'EPF Contribution',
        enableSorting: canSort('epf_contribution'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.epfContribution} />,
      },
      {
        id: 'eps_contribution',
        header: 'EPS Contribution',
        enableSorting: canSort('eps_contribution'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.epsContribution} />,
      },
      {
        id: 'epf_eps_diff',
        header: 'EPF–EPS Diff',
        enableSorting: canSort('epf_eps_diff'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.epfEpsDiff} />,
      },
      {
        id: 'ncp_days',
        header: 'NCP Days',
        enableSorting: canSort('ncp_days'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <DaysCell value={row.original.ncpDays} />,
      },
      {
        /* Always 0 — an advance refund is an EPFO-side adjustment with no source
           here, and the API won't order a constant column. */
        id: 'refund',
        header: 'Refund',
        enableSorting: false,
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.refund} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.offset],
  )

  return <ReportTable columns={columns} rows={rows} {...table} />
}
