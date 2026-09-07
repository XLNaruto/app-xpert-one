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
 * The hero strip — seven tiles off `/summary`.
 *
 * Seven is a prime, so no column count divides it: a six-across strip leaves
 * the seventh tile alone in a row beside five tiles' worth of dead space. The
 * grid is therefore TWELVE columns from `lg` up, and the tiles take two
 * different spans — four at a quarter of the row, then three at a third. Twelve
 * divides both, so each row fills edge to edge and nothing is stranded. Below
 * `lg` it is pairs, with the odd tile spanning the last row rather than sitting
 * half-width beside a hole.
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

/**
 * The two spans the strip is built from, over a 12-column grid.
 *
 * Row one is four tiles at 3/12; row two is three at 4/12. The second row's
 * tiles are a little wider than the first's, which is the price of filling both
 * — and cheaper than the hole a uniform span leaves.
 */
const SPAN_QUARTER = 'sm:col-span-6 lg:col-span-3'
const SPAN_THIRD = 'sm:col-span-6 lg:col-span-4'

/**
 * The last tile. At `sm` the strip is pairs and this one is the odd tile out, so
 * it takes the whole row there instead of leaving a half-width gap beside it.
 */
const SPAN_LAST = 'sm:col-span-12 lg:col-span-4'

/** Every tile's span, in the order the tiles are rendered. Drives the skeleton. */
const TILE_SPANS = [
  SPAN_QUARTER,
  SPAN_QUARTER,
  SPAN_QUARTER,
  SPAN_QUARTER,
  SPAN_THIRD,
  SPAN_THIRD,
  SPAN_LAST,
]

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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-12">
        {TILE_SPANS.map((span, index) => (
          <Skeleton
            key={index}
            /* The placeholder holds the SAME shape the tiles will land in, so
               the strip doesn't reflow the page under the reader's eye when the
               summary arrives. */
            className={cn('h-[122px] w-full rounded-xl', span)}
          />
        ))}
      </div>
    )
  }

  const { workforce, attendance, payroll, helpdesk } = summary

  return (
    <div
      className={cn(
        'mb-6 grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-12',
        isFetching && 'opacity-60',
      )}
    >
      <KpiTile
        className={SPAN_QUARTER}
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
        className={SPAN_QUARTER}
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
        className={SPAN_QUARTER}
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
        className={SPAN_QUARTER}
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
        className={SPAN_THIRD}
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
        className={SPAN_THIRD}
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
        className={SPAN_LAST}
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
