import { AlertTriangle, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatDays } from '../lib/leave-summary'
import type { LeaveBalance, LeaveBalanceItem } from '../types'

/**
 * One employee's paid-leave allowance for a year.
 *
 * **The per-type table is the answer; the headline is only a sum.** Allowances do
 * not pool — casual leave never eats into the sick allowance — so a headline
 * "0.5 days available" can be half a *sick* day and no casual days at all. The
 * card leads with the lines and says as much about the total.
 *
 * Three readings the card is careful about:
 *
 * - `available: null` on an UNPAID type is **Unlimited**, not `0`. Every day of it
 *   is unpaid from the start, so there is no allowance to run out of.
 * - `quotaSource: "NONE"` with `total: 0` means **no paid days of that type** —
 *   also not "unlimited". Nothing is configured at either tier, so every day is
 *   unpaid. It still does not stop the employee applying.
 * - The headline is summed from each leave row's own snapshot, so days filed under
 *   a since-deleted leave type count there and appear in no line below. The two
 *   are not expected to reconcile.
 */
export function LeaveBalanceCard({
  balance,
  isLoading,
  className,
}: {
  balance: LeaveBalance | undefined
  isLoading: boolean
  className?: string
}) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!balance) return null

  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-heading text-base font-semibold">
            Paid leave allowance · {balance.year}
          </h3>
          <span className="text-xs text-muted-foreground">
            Each type has its own allowance — they don't pool.
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Allowed" value={formatDays(balance.paid.total)} />
          <Figure label="Used" value={formatDays(balance.paid.used)} />
          <Figure
            label="Awaiting a decision"
            value={formatDays(balance.paid.pending)}
            hint="Pending days already reduce what's free — they're spoken for until the leave is decided."
          />
          <Figure
            label="Remaining"
            value={formatDays(balance.paid.available)}
            hint="A SUM of each type's own remainder. It doesn't mean any particular type has that much room — read the lines below."
          />
        </div>

        {/*
          `unpaid.effective` is everything the employee is not being paid for:
          unpaid leave they took, unpaid leave awaiting a decision, and the paid
          overflow. It is the payroll-facing figure.
        */}
        {balance.unpaid.effective > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              <strong className="font-semibold">
                {formatDays(balance.unpaid.effective)} unpaid
              </strong>{' '}
              this year — unpaid leave plus every day past a paid allowance. This is
              what payroll will deduct.
            </span>
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/*
                  The name column is the one a reader scans by, so it gets the
                  slack rather than sharing it out between the number columns.
                */}
                <TableHead className="w-64 min-w-56">Leave Type</TableHead>
                <TableHead className="text-right">Allowed</TableHead>
                {/*
                  Used and "Unpaid so far" are given room of their own. Both read
                  narrow — one is a plain count, the other is a dash on most rows —
                  so the browser sized them to their content and the two headers
                  ended up cramped against their neighbours. The widths are on the
                  header cells, which is what governs the column.
                */}
                <TableHead className="w-28 whitespace-nowrap text-right">Used</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="w-36 whitespace-nowrap text-right">
                  Unpaid so far
                </TableHead>
                <TableHead>Allowance from</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balance.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No leave types configured for this company yet.
                  </TableCell>
                </TableRow>
              ) : (
                balance.items.map((item) => <BalanceRow key={item.leaveTypeId} item={item} />)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function BalanceRow({ item }: { item: LeaveBalanceItem }) {
  const isUnpaidType = item.available === null

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {item.leaveType || '—'}
        {item.shortCode && (
          <span className="ml-1.5 text-xs text-muted-foreground">({item.shortCode})</span>
        )}
      </TableCell>

      {/* An unpaid type has no allowance to state — a `0` there would read as a cap. */}
      <TableCell className="text-right">
        {isUnpaidType ? '—' : formatDays(item.total)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right">
        {formatDays(item.used)}
      </TableCell>
      <TableCell className="text-right">{formatDays(item.pending)}</TableCell>

      <TableCell className="text-right">
        {isUnpaidType ? (
          <Badge variant="secondary">Unlimited</Badge>
        ) : (
          <span
            className={cn(
              'font-medium',
              item.available === 0 ? 'text-warning' : 'text-foreground',
            )}
          >
            {formatDays(item.available ?? 0)}
          </span>
        )}
      </TableCell>

      <TableCell className="whitespace-nowrap text-right">
        {item.overflow > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help">
                <Badge variant="warning">{formatDays(item.overflow)}</Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty font-normal">
              Days of this type past its paid allowance. They were still granted —
              running out never refuses a leave — but payroll won't pay for them.
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        <QuotaSourceBadge item={item} />
      </TableCell>
    </TableRow>
  )
}

/**
 * Where the allowance came from — the employee's own per-year grant, their
 * designation's standing policy, or nowhere.
 *
 * "Nowhere" is the one that gets misread, so it says **No paid days** rather than
 * anything that could pass for "uncapped".
 */
function QuotaSourceBadge({ item }: { item: LeaveBalanceItem }) {
  if (item.payType === 'UNPAID') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help text-sm text-muted-foreground">
            Unpaid type
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-pretty font-normal">
          Unpaid from day one, so there is no allowance to set for it.
        </TooltipContent>
      </Tooltip>
    )
  }

  if (item.quotaSource === 'NONE') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <Badge variant="destructive">
              <Info className="mr-1 size-3" />
              No paid days
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-pretty font-normal">
          Nothing is set on the employee or their designation, so every day of this
          type is unpaid. It does not stop them applying — set an allowance on the
          designation's Leave Allowance tab to change that.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Badge variant="secondary">
      {item.quotaSource === 'EMPLOYEE' ? 'This employee' : 'Designation'}
    </Badge>
  )
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                tabIndex={-1}
                aria-label={`${label} — more information`}
                className="inline-flex cursor-help text-muted-foreground/70 transition-colors hover:text-primary"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty font-normal">
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
      </p>
      <p className="mt-1 font-heading text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}
