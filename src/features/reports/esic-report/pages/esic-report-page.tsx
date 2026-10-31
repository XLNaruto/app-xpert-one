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
    searchPlaceholder: 'Search by Name, Code or Insurance Number…',
    itemName: 'insured employees',
  }

  const data = view.data

  return (
    <div>
      <PageHeader
        title="ESIC Report"
        description="The Month's Insured Employees — The Contribution Statement, and the Challan Sheet the Portal Takes."
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
        departments={view.departments}
        employeeIds={view.employeeIds}
        onEmployeesChange={view.setEmployeeIds}
        employees={view.employees}
        onApply={view.apply}
        canApply={view.canApply}
        isFetching={view.isFetching}
        hasApplied={view.hasApplied}
      />

      {view.companyId === null ? (
        <EmptyState
          title="No Company Selected"
          description="Select a Company for This Session to Read Its ESIC Sheets."
        />
      ) : !view.hasApplied ? (
        <EmptyState
          icon={Filter}
          title="Choose a Sheet and a Period"
          description="Pick a Type and a Month Above, Then Press “Filter Data” to Load the Sheet."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {view.error instanceof Error ? view.error.message : "Couldn't Load the ESIC Report."}
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
              missingRateMessage="No ESIC Rate Is Configured for This Period — These Figures Use the Statutory Defaults."
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
