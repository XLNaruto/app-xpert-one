import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { encryptId } from '@/lib/crypto'
import { cn } from '@/lib/utils'
import {
  ATTENTION_PAGE_SIZES,
  SIGNAL_OPTIONS,
  SIGNAL_SPECS,
} from '../constants'
import { EM_DASH, formatCount, formatDateField } from '../lib/dashboard-format'
import type { useAttentionList } from '../hooks/use-attention-list'
import type { AttentionRow, AttentionSignal } from '../types'

/**
 * The worklist — records needing work, one row per employee, signals as chips.
 *
 * What makes this card unlike the charts above it:
 *
 * * **NO DATE RANGE IN ITS HEADER.** Every signal is measured AS OF NOW, not
 *   over the window: a contract expiring next week is the same problem whether
 *   the user is looking at last month or this one. Showing the dates would make
 *   users expect the list to move when they change them. The POPULATION filters
 *   do apply, and are stated.
 * * **The caption is "N records need attention", never "N of M employees".** An
 *   employee tripping nothing never appears, so `total` is the size of the
 *   worklist rather than of the workforce.
 * * **Nothing is re-sorted client-side.** Rows arrive ordered by how many things
 *   are wrong, then by employee id, done in SQL — so `total` and the page always
 *   agree, and a local sort would break the ordering across pages. The table is
 *   mounted without sorting for that reason.
 * * **The chips keep their arrival order.** `signals` comes back in a stable
 *   catalog order, so a row's chips read the same way on every row.
 * * **An empty list is a SUCCESS state.** "Nothing needs attention" is a genuine
 *   result, not a "no data" one, and is styled as such.
 */

interface AttentionPanelProps {
  list: ReturnType<typeof useAttentionList>
  /** Which population narrowings are applied — stated in place of the dates. */
  populationSummary: string
}

export function AttentionPanel({ list, populationSummary }: AttentionPanelProps) {
  const columns = useMemo<ColumnDef<AttentionRow>[]>(
    () => [
      {
        // Sorting is off on every column: the server's own ordering — most
        // things wrong first — is the point of the screen.
        id: 'employee',
        header: 'Employee',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              to="/hr/employee/detail"
              search={{ data: encryptId(row.original.employeeId) }}
              className="truncate font-medium text-primary hover:underline"
            >
              {row.original.employeeName ?? `Employee #${row.original.employeeId}`}
            </Link>
            {row.original.employeeCode ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.original.employeeCode}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'placement',
        header: 'Placement',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0 text-xs">
            <p className="truncate">{row.original.companyName ?? EM_DASH}</p>
            <p className="truncate text-muted-foreground">
              {[
                row.original.branchName,
                row.original.departmentName,
                row.original.designationName,
              ]
                .filter(Boolean)
                .join(' · ') || EM_DASH}
            </p>
          </div>
        ),
      },
      {
        id: 'signals',
        header: 'What needs work',
        enableSorting: false,
        // The widest column by right: a row can trip five signals at once, and
        // at the width the table would otherwise hand it every chip lands on
        // its own line. This buys two or three chips per line instead.
        meta: { className: 'min-w-[320px]' },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.signals.map((signal) => (
              <SignalChip key={signal} signal={signal} row={row.original} />
            ))}
          </div>
        ),
      },
      {
        id: 'dates',
        header: 'Dates',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {row.original.contractEndsOn ? (
              <p>Contract ends {formatDateField(row.original.contractEndsOn)}</p>
            ) : null}
            {row.original.documentExpiresOn ? (
              <p>Document expires {formatDateField(row.original.documentExpiresOn)}</p>
            ) : null}
            {row.original.joiningDate ? (
              <p>Joined {formatDateField(row.original.joiningDate)}</p>
            ) : null}
            {!row.original.contractEndsOn &&
            !row.original.documentExpiresOn &&
            !row.original.joiningDate
              ? EM_DASH
              : null}
          </div>
        ),
      },
    ],
    [],
  )

  const nothingToDo = list.isSuccess && list.total === 0 && !list.isNarrowed

  return (
    <Card id="needs-attention" className="scroll-mt-6">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold leading-tight">
            Needs attention
          </h3>
          {/* The worklist's size, not the workforce's — and deliberately no
              date range, because none of these signals is window-bounded. */}
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {list.isSuccess
              ? `${formatCount(list.total)} ${
                  list.total === 1 ? 'record needs' : 'records need'
                } attention as of now`
              : 'Measured as of now, not over the selected period'}
            {populationSummary ? ` · ${populationSummary}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
              placeholder="Name or code…"
              className="h-10 pl-9 pr-9"
            />
            {list.search ? (
              <button
                type="button"
                onClick={() => list.setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <Combobox
            options={SIGNAL_OPTIONS}
            value={list.signal}
            onChange={(value) => list.setSignal(value as AttentionSignal | '')}
            searchable={false}
            className="w-44"
            placeholder="All signals"
          />
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0">
        {nothingToDo ? (
          // A genuine success state, styled as one — not a "no data" shrug.
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/5 py-12 text-center">
            <div className="rounded-full bg-success/10 p-3">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <p className="text-sm font-semibold text-success">Nothing needs attention</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Every employee in this population has a posting, a wage, complete KYC
              and no overdue leave, documents or tickets.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={list.items}
            isLoading={list.isPending}
            serverPagination
            limit={list.limit}
            offset={list.offset}
            total={list.total}
            onPaginationChange={list.onPaginationChange}
            pageSizeOptions={ATTENTION_PAGE_SIZES}
            itemName="records"
            emptyState={
              <EmptyState
                title="No matching records"
                description="No record in this population trips the selected signal."
              />
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * One signal, as a chip that links to the screen that fixes it. The count behind
 * the signal rides along where the row carries one — a "Leave pending" chip is
 * more useful when it says how many.
 */
function SignalChip({ signal, row }: { signal: AttentionSignal; row: AttentionRow }) {
  const spec = SIGNAL_SPECS[signal]
  const count =
    signal === 'leave_pending'
      ? row.pendingLeaves
      : signal === 'missing_checkout'
        ? row.missingCheckouts
        : signal === 'ticket_overdue'
          ? row.openTickets
          : undefined

  return (
    <Link
      to={spec.to}
      title={spec.description}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
        // `no_posting` is the reconciliation signal — those employees are
        // excluded from every headcount on this screen, so it reads louder.
        signal === 'no_posting'
          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
          : 'bg-warning/10 text-warning hover:bg-warning/20',
      )}
    >
      {spec.label}
      {count ? <span className="tabular-nums">{count}</span> : null}
    </Link>
  )
}
