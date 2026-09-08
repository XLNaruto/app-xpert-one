import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowRight, CheckCircle2, FileClock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { CONTRACT_EXPIRY_PANEL_LIMIT } from '../constants'
import { formatDay } from '../lib/contract-format'
import { useContractExpiryList } from '../hooks/use-contract-expiry-list'
import {
  ContractDatesCell,
  ContractEmployeeCell,
  ContractPlacementCell,
  ContractRowActions,
  ContractStatusChip,
} from './contract-cells'
import { ContractRenewDialog } from './contract-renew-dialog'
import { ContractCompleteDialog } from './contract-complete-dialog'
import type { ExpiringContract } from '../types'

/**
 * The dashboard card — the five most urgent contracts, with both actions on
 * each, and a count of the whole worklist beside the heading.
 *
 * It is the SAME TABLE as the full screen, cut to five rows and with its pager
 * hidden: same column order, same cells, same dialogs. A card that laid the same
 * rows out differently would make the reader re-learn them on the way to "View
 * all", which is the one click this card exists to shorten.
 *
 * What separates it from the "Needs attention" card below: THIS LIST IS LIVE.
 * The `contract_expiring` signal on `/user/dashboard/attention` is one of nine
 * in a mixed, cube-backed worklist and carries no actions; this is the
 * actionable one, read straight from `employee-contracts` — so a row acted on
 * here disappears on the next fetch rather than at the next nightly rebuild.
 *
 * It shows no date range for the same reason the worklist doesn't: a contract
 * running out is the same problem whichever period the dashboard is set to. The
 * COMPANY narrowing does apply, and is passed in.
 */
export function ContractExpiryPanel({ companyIds }: { companyIds?: string[] }) {
  const list = useContractExpiryList({
    pageSize: CONTRACT_EXPIRY_PANEL_LIMIT,
    companyIds,
    filterable: false,
  })

  const columns = useMemo<ColumnDef<ExpiringContract>[]>(
    () => [
      {
        // The card only ever shows the first page, so the row index IS the
        // position in the worklist.
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
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
        // `from` is what makes Back on the employee screen return to THIS card,
        // scrolled to it, rather than to the full list they never opened.
        cell: ({ row }) => (
          <ContractEmployeeCell row={row.original} from="dashboard-contracts" />
        ),
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
    [list.canUpdate, list.setPendingRenew, list.setPendingComplete],
  )

  /*
   * The list is readable on `dashboard:read` OR `employees:list`, so a refusal
   * here means the user cannot see contracts at all. On a dashboard of eight
   * other panels that is a card to leave out, not an error to shout about.
   */
  if (list.isForbidden) return null

  const nothingDue = !list.isLoading && list.total === 0

  return (
    <Card id="contract-expiry" className="scroll-mt-6">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-heading text-base font-semibold leading-tight">
            <FileClock className="size-4 text-warning" />
            Contracts running out
            {list.total > 0 ? (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium tabular-nums text-warning">
                {list.total}
              </span>
            ) : null}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Read live, as of now — not from the nightly rollup behind the panels above.
          </p>
        </div>

        <Link
          to="/hr/contract-expiry"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0">
        {nothingDue ? (
          // A genuine success state: every contractual posting in this
          // population is inside its term.
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/5 py-10 text-center">
            <div className="rounded-full bg-success/10 p-3">
              <CheckCircle2 className="size-5 text-success" />
            </div>
            <p className="text-sm font-semibold text-success">No contract needs work</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Every contractual posting in this population is inside its term.
            </p>
          </div>
        ) : (
          <>
            {/* No pager: this is the top of the worklist, and paging it here
                would be a second place to work the same list. "View all" is
                the way to the rest. */}
            <DataTable
              columns={columns}
              data={list.rows}
              isLoading={list.isLoading}
              skeletonRows={CONTRACT_EXPIRY_PANEL_LIMIT}
              hidePagination
            />

            {list.total > list.rows.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing {list.rows.length} of {list.total}.{' '}
                <Link to="/hr/contract-expiry" className="text-primary hover:underline">
                  Open the full list
                </Link>{' '}
                to work through the rest.
              </p>
            ) : null}
          </>
        )}
      </CardContent>

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
    </Card>
  )
}
