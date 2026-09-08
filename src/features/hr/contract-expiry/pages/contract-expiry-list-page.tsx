import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, CheckCircle2, FileClock } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import {
  FilterBar,
  type FilterChipSpec,
  type FilterFacet,
} from '@/components/common/filter-bar'
import { Combobox } from '@/components/ui/combobox'
import { DataTable } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { ScopedDataError, useMyCompanies } from '@/features/company'
import {
  ANY_STATUS,
  CONTRACT_EXPIRY_PAGE_SIZES,
  CONTRACT_STATUS_OPTIONS,
  WITHIN_DAYS_OPTIONS,
} from '../constants'
import { formatDay } from '../lib/contract-format'
import { useContractExpiryList } from '../hooks/use-contract-expiry-list'
import {
  ContractDatesCell,
  ContractEmployeeCell,
  ContractPlacementCell,
  ContractRowActions,
  ContractStatusChip,
} from '../components/contract-cells'
import { ContractRenewDialog } from '../components/contract-renew-dialog'
import { ContractCompleteDialog } from '../components/contract-complete-dialog'
import type { ContractStatus, ExpiringContract } from '../types'

/**
 * Contract Expiry — every contractual posting whose term is running out, and the
 * two decisions on each: renew it, or let it end and complete the service.
 *
 * Three things this screen does differently from the other list screens:
 *
 * * **Nothing is sorted here.** The endpoint takes no `sort` and orders rows by
 *   soonest review date, then posting id — so `expired` rows float to the top on
 *   their own and `total` always agrees with the page in hand. Every column is
 *   mounted with sorting off for that reason.
 * * **No date range.** A contract running out is the same problem whatever period
 *   a report is set to. The "Needs action now / next 30 days" control is not a
 *   window: it decides how far PAST the warning date to look, and anything it
 *   pulls in early arrives as `upcoming`.
 * * **The end date is never recomputed.** A renewal keeps the joining date and
 *   replaces the period, so `joining + period` names the term that was just
 *   REPLACED. Every date on this screen is rendered from the response.
 */
export function ContractExpiryListPage() {
  const list = useContractExpiryList()
  const { companies, isLoading: isCompaniesLoading } = useMyCompanies()

  const columns = useMemo<ColumnDef<ExpiringContract>[]>(
    () => [
      {
        // Numbered across the whole worklist, not within the page: the rows are
        // ordered soonest-review-first in SQL, so #11 is genuinely the eleventh
        // most urgent contract rather than the first row of page two.
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {list.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <ContractRowActions
            row={row.original}
            canUpdate={list.canUpdate}
            onRenew={list.setPendingRenew}
            onComplete={list.setPendingComplete}
          />
        ),
      },
      {
        id: 'employee',
        header: 'Employee',
        enableSorting: false,
        cell: ({ row }) => <ContractEmployeeCell row={row.original} />,
      },
      {
        id: 'placement',
        header: 'Posting',
        enableSorting: false,
        cell: ({ row }) => <ContractPlacementCell row={row.original} />,
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => <ContractStatusChip row={row.original} />,
      },
      {
        id: 'dates',
        header: 'Term ends',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => <ContractDatesCell row={row.original} />,
      },
      {
        id: 'review',
        header: 'Review due',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDay(row.original.renewalDueOn)}
          </span>
        ),
      },
    ],
    [list.offset, list.canUpdate, list.setPendingRenew, list.setPendingComplete],
  )

  const facets: FilterFacet[] = [
    {
      key: 'status',
      label: 'Status',
      value: list.filters.status,
      onChange: (value) => list.setStatus(value as ContractStatus | ''),
      options: CONTRACT_STATUS_OPTIONS,
      searchable: false,
      clearValue: ANY_STATUS,
    },
    {
      key: 'within_days',
      label: 'Look ahead',
      value: String(list.filters.withinDays),
      onChange: (value) => list.setWithinDays(Number(value) || 0),
      options: WITHIN_DAYS_OPTIONS,
      searchable: false,
      clearValue: '0',
    },
  ]

  /* A multi-select can't be a facet — a facet's value is one string — so the
     company picker supplies its own chip, collapsed to a count. */
  const extraChips: FilterChipSpec[] = list.filters.companyIds.length
    ? [
        {
          key: 'companyIds',
          label:
            list.filters.companyIds.length === 1
              ? (companies.find(
                  (company) => String(company.id) === list.filters.companyIds[0],
                )?.name ?? '1 company')
              : `${list.filters.companyIds.length} companies`,
          onRemove: () => list.setFilter('companyIds', []),
        },
      ]
    : []

  // Reading the list was refused — the user holds neither `dashboard:read` nor
  // `employees:list`, which is a permission answer, not a broken screen.
  if (list.isForbidden) {
    return <Forbidden description={list.forbiddenMessage} />
  }

  const nothingDue = !list.isLoading && list.total === 0 && !list.isNarrowed

  return (
    <div>
      <PageHeader
        title="Contract Expiry"
        description="Contractual postings whose term is running out. Renew the contract, or let it end and complete the service."
      />

      <FilterBar
        className="mb-6"
        onReset={list.reset}
        facets={facets}
        extraChips={extraChips}
        extraActiveCount={extraChips.length}
        search={{
          value: list.search,
          onChange: list.setSearch,
          placeholder: 'Employee name or code…',
        }}
        panelExtras={
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Companies
            </label>
            <Combobox
              multiple
              className="w-full"
              icon={Building2}
              options={companies.map((company) => ({
                label: company.name,
                value: String(company.id),
              }))}
              value={list.filters.companyIds}
              onChange={(value) => list.setFilter('companyIds', value)}
              placeholder="All companies"
              clearable
              loading={isCompaniesLoading}
              maxVisibleLabels={1}
            />
          </div>
        }
        footer={
          <p className="text-xs text-muted-foreground">
            {list.isPreviewing
              ? 'Previewing beyond the warning date — rows marked “Upcoming” do not need work yet.'
              : 'Every row here has passed its review date. Measured as of now, not over a period.'}
          </p>
        }
      />

      {list.isError ? (
        <ScopedDataError
          error={list.error}
          fallback="Couldn't load expiring contracts."
          what="expiring contracts"
        />
      ) : nothingDue ? (
        // A success state, not a "no data" shrug: every contractual posting in
        // reach is inside its term.
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/5 py-16 text-center">
          <div className="rounded-full bg-success/10 p-3">
            <CheckCircle2 className="size-6 text-success" />
          </div>
          <p className="text-sm font-semibold text-success">No contract needs work</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Every contractual posting you can see is inside its term. Look ahead 30, 60
            or 90 days to preview what is coming.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={list.rows}
          isLoading={list.isLoading}
          itemName="contracts"
          pageSizeOptions={CONTRACT_EXPIRY_PAGE_SIZES}
          serverPagination
          limit={list.limit}
          offset={list.offset}
          total={list.total}
          onPaginationChange={list.onPaginationChange}
          emptyState={
            <EmptyState
              icon={FileClock}
              title="No matching contracts"
              description="No contract in this population matches the filters you have applied."
            />
          }
        />
      )}

      <ContractRenewDialog
        row={list.pendingRenew}
        onOpenChange={(open) => !open && list.setPendingRenew(null)}
        onSubmit={list.confirmRenew}
        isPending={list.isRenewing}
      />
      <ContractCompleteDialog
        row={list.pendingComplete}
        onOpenChange={(open) => !open && list.setPendingComplete(null)}
        onSubmit={list.confirmComplete}
        isPending={list.isCompleting}
      />
    </div>
  )
}
