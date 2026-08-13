import { Filter, Landmark } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import {
  ReportBasisStrip,
  ReportFilterCard,
  ReportPreviewHeader,
  type ReportTableProps,
} from '@/features/reports/common'
import { usePfReportList } from '../hooks/use-pf-report-list'
import {
  PfChallanTable,
  PfEcrTable,
  PfNewJoiningTable,
  PfStatementTable,
} from '../components/pf-report-tables'

/**
 * PF Report — the four EPFO sheets for a month already processed.
 *
 * They deliberately don't agree with each other, and that is worth knowing
 * before reading them side by side. The challan reports the prorated wage the
 * days were worked on; the statement reports the agreed wage capped at the
 * ceiling. The ECR is keyed by UAN, so a PF member without one is missing from
 * it and present on the other two — which is exactly where the omission is meant
 * to be noticed. And the registration sheet reads postings rather than payroll,
 * so it fills up before the month has been priced at all.
 *
 * The rates the figures were built on are printed above the table, including a
 * warning when the establishment has no rate on file and the statutory defaults
 * were used. The API answers JSON only — there is no export behind these — so
 * the sheets are read here, paged and ordered server-side.
 */
export function PfReportPage() {
  const view = usePfReportList()

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
    searchPlaceholder: 'Search by name, code, PF number or UAN…',
    itemName: 'members',
  }

  const data = view.data

  return (
    <div>
      <PageHeader
        title="PF Report"
        description="The month's EPFO sheets — the challan, the employer's statement, the new-member registrations and the ECR."
      />

      <ReportFilterCard
        title="PF Report Filters"
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
          description="Select a company for this session to read its PF sheets."
        />
      ) : !view.hasApplied ? (
        <EmptyState
          icon={Filter}
          title="Choose a sheet and a period"
          description="Pick a type and a month above, then press “Filter Data” to load the sheet."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {view.error instanceof Error ? view.error.message : "Couldn't load the PF report."}
        </p>
      ) : (
        <>
          <ReportPreviewHeader
            icon={Landmark}
            title={view.appliedTypeConfig.label}
            subtitle={view.appliedSubtitle}
            period={view.period}
            total={view.total}
          />

          {view.basis && (
            <ReportBasisStrip
              items={view.basisItems}
              isRateOnFile={view.basis.isRateOnFile}
              rateEffectiveDate={view.basis.rateEffectiveDate}
              missingRateMessage="No PF rate is configured for this period — these figures use the statutory defaults."
            />
          )}

          {view.appliedType === 'pf-challan' && (
            <PfChallanTable rows={data?.type === 'pf-challan' ? data.items : []} {...table} />
          )}
          {view.appliedType === 'pf-statement' && (
            <PfStatementTable rows={data?.type === 'pf-statement' ? data.items : []} {...table} />
          )}
          {view.appliedType === 'new-joining' && (
            <PfNewJoiningTable
              rows={data?.type === 'new-joining' ? data.items : []}
              {...table}
              /* This one counts POSTINGS, not people — a re-join is a second
                 registration with its own line. */
              itemName="registrations"
            />
          )}
          {view.appliedType === 'ecr' && (
            <PfEcrTable rows={data?.type === 'ecr' ? data.items : []} {...table} />
          )}
        </>
      )}
    </div>
  )
}
