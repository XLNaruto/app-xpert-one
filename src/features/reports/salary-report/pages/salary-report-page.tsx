import { FileSpreadsheet, Filter, IndianRupee, UsersRound } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import { formatAmount } from '@/lib/currency'
import {
  ReportFilterCard,
  ReportPreviewHeader,
  type ReportTableProps,
} from '@/features/reports/common'
import { useSalaryReportList } from '../hooks/use-salary-report-list'
import {
  GrossSalaryTable,
  PaidSalaryTable,
  PayRegisterTable,
  PaySlipTable,
  UnpaidSalaryTable,
} from '../components/salary-report-tables'
import type { PaymentMetrics } from '../types'

/**
 * Salary Report — five reads of a month already processed.
 *
 * Nothing here computes pay. Every figure is the one the register stored against
 * the salary: the days are the counts the month was PRICED with, not a live
 * re-count of attendance, which would drift from the payslip the moment a punch
 * was corrected.
 *
 * The type decides everything below it — the columns, which fields the search
 * box matches, and which orders the endpoint will accept — so the table is keyed
 * on the APPLIED type rather than the dropdown's. Gross Salary is the odd one
 * out: it spans a range of periods rather than one, which is why the filter card
 * swaps its Month and Year for two month pickers when it's chosen.
 *
 * The API answers JSON only — there is no export endpoint behind any of these —
 * so the report is read here, paged and ordered server-side.
 */
export function SalaryReportPage() {
  const view = useSalaryReportList()

  if (view.isForbidden) return <Forbidden description={view.forbiddenMessage} />

  /* What every type's table reads itself by. The rows are handed in separately
     so each table gets its own row type, narrowed off the tagged result. */
  const table: ReportTableProps = {
    isLoading: view.isLoading,
    limit: view.limit,
    offset: view.offset,
    total: view.total,
    onPaginationChange: view.onPaginationChange,
    searchValue: view.search,
    onSearchChange: view.setSearch,
    sorting: view.sorting,
    onSortingChange: view.onSortingChange,
    searchPlaceholder: 'Search by name, code or mobile…',
    itemName: 'records',
  }

  const data = view.data

  return (
    <div>
      <PageHeader
        title="Salary Report"
        description="The month already processed — the payslip, the statutory register, and what has and hasn't been released."
      />

      <ReportFilterCard
        title="Salary Report Filters"
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
          description="Select a company for this session to read its payroll reports."
        />
      ) : !view.hasApplied ? (
        <EmptyState
          icon={Filter}
          title="Choose what to report on"
          description="Pick a type and a period above, then press “Filter Data” to load the report."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {view.error instanceof Error
            ? view.error.message
            : "Couldn't load the salary report."}
        </p>
      ) : (
        <>
          <ReportPreviewHeader
            icon={FileSpreadsheet}
            title={view.appliedTypeConfig.label}
            subtitle={view.appliedSubtitle}
            period={view.period}
            total={view.total}
          />

          {/* The payment reports' two tiles describe the WHOLE filter, not the
              page below them — a page of twenty rows out of two hundred could
              never add up to its own header. */}
          {(data?.type === 'paid-salary' || data?.type === 'unpaid-salary') && (
            <PaymentTiles
              metrics={data.metrics}
              netLabel={data.type === 'paid-salary' ? 'Total net paid' : 'Total net outstanding'}
              isPaid={data.type === 'paid-salary'}
            />
          )}

          {view.appliedType === 'pay-slip' && (
            <PaySlipTable rows={data?.type === 'pay-slip' ? data.items : []} {...table} />
          )}
          {view.appliedType === 'pay-register' && (
            <PayRegisterTable
              rows={data?.type === 'pay-register' ? data.items : []}
              {...table}
            />
          )}
          {view.appliedType === 'gross-salary' && (
            <GrossSalaryTable
              rows={data?.type === 'gross-salary' ? data.items : []}
              {...table}
              /* Grouped per employee, so the footer counts people. */
              itemName="employees"
            />
          )}
          {view.appliedType === 'paid-salary' && (
            <PaidSalaryTable rows={data?.type === 'paid-salary' ? data.items : []} {...table} />
          )}
          {view.appliedType === 'unpaid-salary' && (
            <UnpaidSalaryTable
              rows={data?.type === 'unpaid-salary' ? data.items : []}
              {...table}
            />
          )}
        </>
      )}
    </div>
  )
}

/** The two header figures both payment reports carry, over the whole filter. */
function PaymentTiles({
  metrics,
  netLabel,
  isPaid,
}: {
  metrics: PaymentMetrics
  netLabel: string
  isPaid: boolean
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
        <UsersRound className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Employees</span>
        <span className="font-semibold tabular-nums">{metrics.totalEmployees}</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
        <IndianRupee className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{netLabel}</span>
        <span className={isPaid ? 'font-semibold text-success' : 'font-semibold text-warning'}>
          {formatAmount(metrics.totalNetPay)}
        </span>
      </div>
    </div>
  )
}
