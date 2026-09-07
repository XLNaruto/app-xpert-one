import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  IndianRupee,
  LifeBuoy,
  LogOut,
  Users,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DeltaBadge } from './delta-badge'
import {
  formatCount,
  formatMoney,
  formatRatio,
  formatSigned,
} from '../lib/dashboard-format'
import type { DashboardSummary } from '../types'

/**
 * The hero strip — six tiles off `/summary`.
 *
 * The captions here are load-bearing, and each one is the honest version of a
 * label that would otherwise be wrong:
 *
 * * **"Joins", not "New employees".** `joined` counts posting EVENTS, not
 *   distinct new colleagues: a rehire is a second join, and a transfer between
 *   two companies of one account is an exit and a join. It is also the count that
 *   sums correctly out of `/series`, which is why it is the one served.
 * * **"of days recorded", not "Attendance %".** `attendance_rate` is over
 *   ACCOUNTED days (present + half + leave). There is no absent count on this
 *   API — an absence is the LACK of a row, indistinguishable from a Sunday, a
 *   holiday, a pre-hire day or a phone that never synced.
 * * **Attrition is coloured the other way up.** A fall in `attrition_rate` is
 *   good news, so its badge is told `upIsGood={false}` — and it does NOT reuse
 *   the diverging colouring that `net` gets.
 * * **Open tickets do not move with the window.** `open` and `unassigned` are
 *   as-of-now positions, so the tile says so rather than looking broken when the
 *   dates change and the number doesn't.
 */

interface DashboardKpiStripProps {
  summary?: DashboardSummary
  isLoading: boolean
  isFetching: boolean
  /** False under `all_time`, where every comparison is unavailable. */
  showComparisons: boolean
}

export function DashboardKpiStrip({
  summary,
  isLoading,
  isFetching,
  showComparisons,
}: DashboardKpiStripProps) {
  if (isLoading || !summary) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[122px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const { workforce, attendance, payroll, helpdesk } = summary

  return (
    <div
      className={cn(
        'mb-6 grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        isFetching && 'opacity-60',
      )}
    >
      <KpiTile
        label="Headcount"
        value={formatCount(workforce.headcount)}
        icon={Users}
        hint="live postings today"
        secondary={
          // `net` CAN BE NEGATIVE, and a diverging colour is used ONLY here.
          <span
            className={cn(
              'text-xs font-medium',
              workforce.net > 0 && 'text-success',
              workforce.net < 0 && 'text-destructive',
              workforce.net === 0 && 'text-muted-foreground',
            )}
          >
            {formatSigned(workforce.net)} net this period
          </span>
        }
      />

      <KpiTile
        label="Joins"
        value={formatCount(workforce.joined)}
        icon={UserCheck}
        hint="joining events"
        secondary={
          <DeltaBadge
            value={workforce.changePct}
            show={showComparisons}
            hint="vs previous"
          />
        }
      />

      <KpiTile
        label="Exits"
        value={formatCount(workforce.exited)}
        icon={LogOut}
        hint="leaving events"
        secondary={
          <span className="text-xs text-muted-foreground">
            opening headcount {formatCount(workforce.openingHeadcount)}
          </span>
        }
      />

      <KpiTile
        label="Attrition"
        value={formatRatio(workforce.attritionRate)}
        icon={ArrowLeftRight}
        hint="over this period"
        secondary={
          <span className="text-xs text-muted-foreground">
            exits over mean headcount · not annualised
          </span>
        }
      />

      <KpiTile
        label="Attendance"
        value={formatRatio(attendance.attendanceRate)}
        icon={UserCheck}
        hint="of days recorded"
        secondary={
          <span className="text-xs text-muted-foreground">
            {formatCount(attendance.accountedDays)} accounted days
          </span>
        }
      />

      <KpiTile
        label="Net payroll"
        value={formatMoney(payroll.netPay)}
        icon={IndianRupee}
        hint={`${formatCount(payroll.sheets)} sheets`}
        secondary={
          <DeltaBadge
            value={payroll.changePct}
            show={showComparisons}
            hint="vs previous"
          />
        }
      />

      <KpiTile
        label="Open tickets"
        value={formatCount(helpdesk.open)}
        icon={LifeBuoy}
        hint="as of now"
        secondary={
          <span className="text-xs text-muted-foreground">
            {formatCount(helpdesk.unassigned)} unassigned
          </span>
        }
        className="xl:col-span-1"
      />
    </div>
  )
}

function KpiTile({
  label,
  value,
  icon: Icon,
  hint,
  secondary,
  className,
}: {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  secondary?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
        {/* Proportional figures on a hero number — tabular digits make a large
            standalone value read loose. */}
        <p className="mt-3 font-heading text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        {secondary ? <div className="mt-2">{secondary}</div> : null}
      </CardContent>
    </Card>
  )
}
