import { Filter, HeartPulse } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import {
  ReportBasisStrip,
  ReportFilterCard,
  ReportPreviewHeader,
  type ReportTableProps,
} from '@/features/reports/common'
import { useEsicReportList } from '../hooks/use-esic-report-list'
import {
  EsicChallanTable,
  EsicStatementTable,
} from '../components/esic-report-tables'

/**
 * ESIC Report — the insured month, twice over.
 *
 * The **statement** is the one to read when the contributions are the question:
 * the deduction, the company's cost and what is remitted for the person. The
 * **challan** is the sheet the portal takes, and it stops at the wage and the
 * days on purpose — the portal computes what is owed from them, and printing our
 * own figures beside its computation would invite a reconciliation with no
 * meaning.
 *
 * A zero on the statement is not a gap. Under the "As Per Act" basis a wage over
 * the ceiling takes the employee out of scope for the month, so nothing was
 * deducted — and the employee still appears, because the act applies to their
 * posting.
 */
export function EsicReportPage() {
  const view = useEsicReportList()

  if (view.isForbidden) return <Forbidden description={view.forbiddenMessage} />

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
    searchPlaceholder: 'Search by name, code or insurance number…',
    itemName: 'insured employees',
  }

  const data = view.data

  return (
    <div>
      <PageHeader
        title="ESIC Report"
        description="The month's insured employees — the contribution statement, and the challan sheet the portal takes."
      />

      <ReportFilterCard
        title="ESIC Report Filters"
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
          description="Select a company for this session to read its ESIC sheets."
        />
      ) : !view.hasApplied ? (
        <EmptyState
          icon={Filter}
          title="Choose a sheet and a period"
          description="Pick a type and a month above, then press “Filter Data” to load the sheet."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {view.error instanceof Error ? view.error.message : "Couldn't load the ESIC report."}
        </p>
      ) : (
        <>
          <ReportPreviewHeader
            icon={HeartPulse}
            title={view.appliedTypeConfig.label}
            subtitle={view.appliedSubtitle}
            period={view.period}
            total={view.total}
          />

          {view.header && (
            <ReportBasisStrip
              items={view.basisItems}
              isRateOnFile={view.header.isRateOnFile}
              rateEffectiveDate={view.header.rateEffectiveDate}
              missingRateMessage="No ESIC rate is configured for this period — these figures use the statutory defaults."
            />
          )}

          {view.appliedType === 'esic-statement' && (
            <EsicStatementTable
              rows={data?.type === 'esic-statement' ? data.items : []}
              {...table}
            />
          )}
          {view.appliedType === 'esic-challan' && (
            <EsicChallanTable rows={data?.type === 'esic-challan' ? data.items : []} {...table} />
          )}
        </>
      )}
    </div>
  )
}
