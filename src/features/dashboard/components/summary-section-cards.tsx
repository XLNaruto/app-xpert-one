import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DeltaBadge } from './delta-badge'
import {
  EM_DASH,
  formatCount,
  formatDays,
  formatHours,
  formatMoney,
  formatRatio,
  formatSigned,
} from '../lib/dashboard-format'
import type { DashboardSummary } from '../types'

/**
 * The five section cards under the hero strip — one per `/summary` block.
 *
 * Each card carries the caveat its numbers need, because every one of these is a
 * figure somebody will try to reconcile against another screen and fail:
 *
 * * **Workforce.** `headcount != opening_headcount + net`. That identity does
 *   not hold where one person may hold several postings, which is why
 *   `opening_headcount` is measured directly rather than derived — and why none
 *   of the four is computed from the others here. The card also names the
 *   `no_posting` count, since those employees are excluded from every headcount
 *   on the screen: the honest fix for a tile that disagrees with the employee
 *   LIST screen is a link to the worklist, not a different count.
 * * **Attendance.** No present-vs-absent donut is drawn, ever — it would invent
 *   the absent slice. `punctuality_rate` sits beside `attendance_rate` because
 *   both are oriented so higher is better.
 * * **Leave.** `approval_rate` is over DECIDED applications, so `pending` is
 *   shown beside it or the figure flatters itself. `pending_overdue` is a
 *   POSITION, not windowed, and is the most actionable number in the block — so
 *   it is a link into the leave queue.
 * * **Payroll.** Filed on the SHEET'S OWN month. A "last 30 days" window
 *   spanning two calendar months therefore covers both months in full, which is
 *   why the tile can look double.
 * * **Helpdesk.** `resolution_rate` CAN EXCEED 1 — that is a backlog being
 *   cleared, so it is neither clamped nor coloured as an error.
 */

interface SummarySectionCardsProps {
  summary?: DashboardSummary
  isLoading: boolean
  isFetching: boolean
  showComparisons: boolean
  /** Employees holding no posting at all — excluded from every headcount here. */
  noPostingCount: number
}

export function SummarySectionCards({
  summary,
  isLoading,
  isFetching,
  showComparisons,
  noPostingCount,
}: SummarySectionCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const { workforce, attendance, leave, payroll, helpdesk } = summary

  return (
    <div
      className={cn(
        'mb-6 grid gap-4 transition-opacity duration-200 md:grid-cols-2 xl:grid-cols-3',
        isFetching && 'opacity-60',
      )}
    >
      <SectionCard
        title="Workforce"
        caption="Positions count people; flows count posting events — the two don't add up to each other."
      >
        <Stat label="Headcount" value={formatCount(workforce.headcount)} />
        <Stat
          label="Opening headcount"
          value={formatCount(workforce.openingHeadcount)}
          hint="when the window opened"
        />
        <Stat
          label="Net movement"
          value={formatSigned(workforce.net)}
          valueClassName={cn(
            workforce.net > 0 && 'text-success',
            workforce.net < 0 && 'text-destructive',
          )}
        />
        <Stat
          label="Attrition"
          value={formatRatio(workforce.attritionRate)}
          hint="up is bad"
        />

        {/* Confirmed / on probation as a pair of chips over a small split bar. */}
        <div className="col-span-2 mt-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Confirmed {formatCount(workforce.confirmed)}
            </span>
            <span className="text-muted-foreground">
              On probation {formatCount(workforce.onProbation)}
            </span>
          </div>
          <SplitBar
            segments={[
              { value: workforce.confirmed, color: 'var(--color-chart-1)' },
              { value: workforce.onProbation, color: 'var(--color-chart-3)' },
            ]}
          />
        </div>

        {noPostingCount > 0 ? (
          <Link
            to="/dashboard"
            hash="needs-attention"
            className="col-span-2 mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-warning hover:underline"
          >
            <AlertCircle className="size-3.5" />
            {formatCount(noPostingCount)}{' '}
            {noPostingCount === 1 ? 'employee has' : 'employees have'} no posting —
            excluded from every headcount here
          </Link>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Attendance"
        caption="Presence only. An absence is the lack of a row, so there is no absent figure to show."
      >
        <Stat
          label="Attendance"
          value={formatRatio(attendance.attendanceRate)}
          hint="of accounted days"
        />
        <Stat
          label="Punctuality"
          value={formatRatio(attendance.punctualityRate)}
          hint="higher is better"
        />
        <Stat label="Present days" value={formatCount(attendance.presentDays)} />
        <Stat label="Half days" value={formatCount(attendance.halfDays)} />
        <Stat label="Late arrivals" value={formatCount(attendance.lateArrivals)} />
        <Stat label="Early exits" value={formatCount(attendance.earlyExits)} />
        <Stat label="Worked hours" value={formatHours(attendance.workedHours)} />
        <Stat
          label="Avg hours / present day"
          value={formatHours(attendance.averageWorkedHours)}
        />
        <div className="col-span-2">
          <DeltaBadge
            value={attendance.changePct}
            show={showComparisons}
            hint="present days vs previous"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Leave"
        caption="Counts leave starting in this period, filed on its from-date — not applications typed in it."
      >
        <Stat label="Applications" value={formatCount(leave.applications)} />
        <Stat
          label="Approval rate"
          value={formatRatio(leave.approvalRate)}
          hint="of decided only"
        />
        <Stat label="Pending" value={formatCount(leave.pending)} />
        <Stat label="Rejected" value={formatCount(leave.rejected)} />
        <Stat
          label="Approved days"
          value={formatDays(leave.approvedDays)}
          hint="calendar days"
        />
        <Stat
          label="Avg decision time"
          value={formatHours(leave.averageDecisionHours)}
        />

        {/* The most actionable number in the block — and a POSITION, so it does
            not move when the window changes. */}
        {leave.pendingOverdue > 0 ? (
          <Link
            to="/hr/leave"
            className="col-span-2 mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/20"
          >
            <AlertCircle className="size-3.5" />
            {formatCount(leave.pendingOverdue)} pending over 3 days
            <ArrowUpRight className="size-3" />
          </Link>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Payroll"
        caption="Filed on each sheet's own month, so a window across two months covers both in full."
      >
        <Stat label="Net pay" value={formatMoney(payroll.netPay)} />
        <Stat label="Gross pay" value={formatMoney(payroll.grossPay)} />
        <Stat label="Deductions" value={formatMoney(payroll.totalDeduction)} />
        <Stat label="Allowances" value={formatMoney(payroll.totalAllowance)} />
        <Stat
          label="Employees processed"
          value={formatCount(payroll.employeesProcessed)}
        />
        <Stat label="Avg net pay" value={formatMoney(payroll.averageNetPay)} />

        <div className="col-span-2 mt-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Net vs deductions</span>
            <span>
              paid {formatRatio(payroll.paidRate)}{' '}
              {payroll.paidRate == null ? '' : 'of rows'}
            </span>
          </div>
          <SplitBar
            segments={[
              { value: payroll.netPay, color: 'var(--color-chart-1)' },
              { value: payroll.totalDeduction, color: 'var(--color-chart-3)' },
            ]}
          />
        </div>

        {/* The four statutory contributions, as a small four-segment bar. */}
        <div className="col-span-2 mt-1 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            PF &amp; ESIC — employee and employer
          </p>
          <SplitBar
            segments={[
              { value: payroll.employeePf, color: 'var(--color-chart-1)' },
              { value: payroll.employerPf, color: 'var(--color-chart-2)' },
              { value: payroll.employeeEsic, color: 'var(--color-chart-3)' },
              { value: payroll.employerEsic, color: 'var(--color-chart-4)' },
            ]}
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <LegendRow
              color="var(--color-chart-1)"
              label="Employee PF"
              value={formatMoney(payroll.employeePf)}
            />
            <LegendRow
              color="var(--color-chart-2)"
              label="Employer PF"
              value={formatMoney(payroll.employerPf)}
            />
            <LegendRow
              color="var(--color-chart-3)"
              label="Employee ESIC"
              value={formatMoney(payroll.employeeEsic)}
            />
            <LegendRow
              color="var(--color-chart-4)"
              label="Employer ESIC"
              value={formatMoney(payroll.employerEsic)}
            />
          </div>
        </div>

        <div className="col-span-2">
          <DeltaBadge
            value={payroll.changePct}
            show={showComparisons}
            hint="net pay vs previous"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Help desk"
        caption="Raised is demand, resolved is throughput. A resolution rate above 100% is a backlog clearing."
      >
        <Stat label="Raised" value={formatCount(helpdesk.raised)} />
        <Stat label="Resolved" value={formatCount(helpdesk.resolved)} />
        <Stat
          label="Resolution rate"
          value={formatRatio(helpdesk.resolutionRate)}
          hint={
            helpdesk.resolutionRate != null && helpdesk.resolutionRate > 1
              ? 'backlog clearing'
              : undefined
          }
        />
        <Stat label="Open now" value={formatCount(helpdesk.open)} hint="as of now" />
        <Stat
          label="Unassigned"
          value={formatCount(helpdesk.unassigned)}
          hint="as of now"
        />
        <Stat
          label="Avg resolution"
          value={formatHours(helpdesk.averageResolutionHours)}
        />
        <Stat
          label="Avg first response"
          value={formatHours(helpdesk.averageFirstResponseHours)}
        />
        <div className="col-span-2">
          <DeltaBadge
            value={helpdesk.changePct}
            show={showComparisons}
            hint="raised vs previous"
          />
        </div>
      </SectionCard>
    </div>
  )
}

function SectionCard({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: React.ReactNode
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <h3 className="font-heading text-base font-semibold leading-none">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </CardHeader>
      <CardContent className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 px-5 pb-5 pt-1">
        {children}
      </CardContent>
    </Card>
  )
}

/** One figure. `EM_DASH` arrives from the formatters — never a fabricated zero. */
function Stat({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string
  value: string
  hint?: string
  valueClassName?: string
}) {
  const unmeasured = value === EM_DASH
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'font-heading text-sm font-semibold',
          unmeasured && 'text-muted-foreground',
          valueClassName,
        )}
        title={unmeasured ? 'Not measured in this period' : undefined}
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * A small proportional bar. Segments are separated by a 2px surface gap rather
 * than a border drawn around each one, and a zero-total bar renders as an empty
 * track instead of dividing by zero.
 */
function SplitBar({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  if (total <= 0) {
    return <div className="h-2 w-full rounded-full bg-muted" />
  }
  return (
    <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full">
      {segments.map((segment, index) => (
        <div
          key={index}
          style={{
            width: `${(Math.max(0, segment.value) / total) * 100}%`,
            background: segment.color,
          }}
          className="first:rounded-l-full last:rounded-r-full"
        />
      ))}
    </div>
  )
}

/** A legend row — a colour swatch beside text that stays in ink, never the hue. */
function LegendRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ background: color }} className="size-2 shrink-0 rounded-sm" />
      <span className="truncate">{label}</span>
      <span className="ml-auto tabular-nums">{value}</span>
    </span>
  )
}
