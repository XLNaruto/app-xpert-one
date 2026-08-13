import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Filter, ReceiptIndianRupee } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import {
  EmployeeCell,
  MoneyCell,
  NUMERIC_CELL,
  PLAIN_CELL,
  ReportBasisStrip,
  ReportFilterCard,
  ReportPreviewHeader,
  ReportTable,
  TextCell,
  serialColumn,
} from '@/features/reports/common'
import { PT_REPORT_TYPES } from '../constants'
import { usePtReportList } from '../hooks/use-pt-report-list'
import type { PtReportRow } from '../types'

/** The endpoint's own sortable columns — anything else is a 400. */
const SORTABLE = new Set(PT_REPORT_TYPES[0].sortable)

/**
 * PT Report — the Professional Tax statement for a month already processed.
 *
 * Two things about the figures are worth knowing before they are filed. The
 * gross here is the month's WHOLE gross, unlike the ESIC statement's wage, which
 * is a base built only from the heads that act applies to — PT is assessed on
 * the gross, so the gross is what this declares. And the tax is the STORED
 * figure: the register either took the fixed amount the wage structure names or
 * matched the state's slab on the wage band, gender and age at pricing time, so
 * re-walking the slabs today would disagree with the payslip for anyone who has
 * since had a birthday.
 *
 * A ₹0 line is a real answer — a gross below the state's first slab — and the
 * employee still appears, because the act applies to their posting.
 */
export function PtReportPage() {
  const view = usePtReportList()

  const columns = useMemo<ColumnDef<PtReportRow>[]>(
    () => [
      serialColumn<PtReportRow>(view.offset),
      {
        id: 'employee_name',
        header: 'Name',
        enableSorting: SORTABLE.has('employee_name'),
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <EmployeeCell name={row.original.employeeName} code={row.original.employeeCode} />
        ),
      },
      {
        id: 'department_name',
        header: 'Department',
        enableSorting: SORTABLE.has('department_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.departmentName} />,
      },
      {
        id: 'designation_name',
        header: 'Designation',
        enableSorting: SORTABLE.has('designation_name'),
        meta: { className: PLAIN_CELL },
        cell: ({ row }) => <TextCell value={row.original.designationName} />,
      },
      {
        id: 'gross_wages',
        header: 'Gross Wages',
        enableSorting: SORTABLE.has('gross_wages'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.grossWages} />,
      },
      {
        id: 'pt_amount',
        header: 'PT Amount',
        enableSorting: SORTABLE.has('pt_amount'),
        meta: { className: NUMERIC_CELL },
        cell: ({ row }) => <MoneyCell value={row.original.ptAmount} tone="negative" />,
      },
    ],
    [view.offset],
  )

  if (view.isForbidden) return <Forbidden description={view.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="PT Report"
        description="The month's Professional Tax — the gross each employee was assessed on, and the tax deducted."
      />

      <ReportFilterCard
        title="PT Report Filters"
        types={view.types}
        type={view.type}
        onTypeChange={view.setType}
        month={view.month}
        onMonthChange={view.setMonth}
        year={view.year}
        onYearChange={view.setYear}
        yearOptions={view.yearChoices}
        from={view.from}
        onFromChange={view.setFrom}
        to={view.to}
        onToChange={view.setTo}
        monthBounds={view.monthBounds}
        isRangeInvalid={view.isRangeInvalid}
        departmentId={view.departmentId}
        onDepartmentChange={view.setDepartmentId}
        departmentOptions={view.departmentChoices}
        departmentsLoading={view.departmentsLoading}
        employeeIds={view.employeeIds}
        onEmployeesChange={view.setEmployeeIds}
        employeeOptions={view.employeeChoices}
        employeesLoading={view.employeesLoading}
        onApply={view.apply}
        canApply={view.canApply}
        isFetching={view.isFetching}
        hasApplied={view.hasApplied}
      />

      {view.companyId === null ? (
        <EmptyState
          title="No company selected"
          description="Select a company for this session to read its PT statement."
        />
      ) : !view.hasApplied ? (
        <EmptyState
          icon={Filter}
          title="Choose a period"
          description="Pick a month above, then press “Filter Data” to load the statement."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {view.error instanceof Error ? view.error.message : "Couldn't load the PT report."}
        </p>
      ) : (
        <>
          <ReportPreviewHeader
            icon={ReceiptIndianRupee}
            title={view.appliedTypeConfig.label}
            subtitle={view.appliedSubtitle}
            period={view.period}
            total={view.total}
          />

          {/* The establishment, not rates — PT is a slab table. Absent until a
              department is picked, since the EC and RC numbers hang off its
              branch, so the strip is replaced by a line that says why. */}
          {view.hasEstablishment ? (
            <ReportBasisStrip items={view.basisItems} />
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              Select a department to show the branch’s PT enrolment (EC) and registration (RC)
              numbers this return is filed under.
            </p>
          )}

          <ReportTable
            columns={columns}
            rows={view.rows}
            isLoading={view.isLoading}
            limit={view.limit}
            offset={view.offset}
            total={view.total}
            onPaginationChange={view.onPaginationChange}
            searchValue={view.search}
            onSearchChange={view.setSearch}
            sorting={view.sorting}
            onSortingChange={view.onSortingChange}
            /* Name and code only: PT issues no per-employee identifier to search
               on, unlike a UAN or an ESIC insurance number. */
            searchPlaceholder="Search by name or code…"
            itemName="employees"
          />
        </>
      )}
    </div>
  )
}
