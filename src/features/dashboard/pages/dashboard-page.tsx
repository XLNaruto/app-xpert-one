import { DatabaseZap } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Forbidden } from '@/features/error'
import {
  ATTENDANCE_METRICS,
  MOVEMENT_METRICS,
  PAYROLL_METRICS,
  BREAKDOWN_DIMENSION_LABELS,
  EMPLOYMENT_TYPE_OPTIONS,
  GRADE_OPTIONS,
} from '../constants'
import { useDashboardScreen } from '../hooks/use-dashboard-screen'
import { useSeriesPanel } from '../hooks/use-series-panel'
import { useBreakdownPanel } from '../hooks/use-breakdown-panel'
import { useRadarPanel } from '../hooks/use-radar-panel'
import { useHeatmapPanel } from '../hooks/use-heatmap-panel'
import { useAttentionList, useNoPostingCount } from '../hooks/use-attention-list'
import { DashboardFilterBar } from '../components/dashboard-filter-bar'
import { DashboardKpiStrip } from '../components/dashboard-kpi-strip'
import { SummarySectionCards } from '../components/summary-section-cards'
import { SeriesPanel } from '../components/series-panel'
import { BreakdownPanel } from '../components/breakdown-panel'
import { RadarPanel } from '../components/radar-panel'
import { HeatmapPanel } from '../components/heatmap-panel'
import { AttentionPanel } from '../components/attention-panel'
import type { DashboardFilters } from '../types'

/**
 * The tenant dashboard.
 *
 * One filter bar drives eight panels off six endpoints. Every panel fires its
 * own request in parallel and resolves independently — skeletons are per panel,
 * never one page-level spinner, and `/summary` is the fast one so the tiles
 * paint first.
 *
 * The one page-level state is the 403: all six endpoints are gated on the single
 * code `dashboard:read`, so a refusal is a screen-level answer. Rendering the
 * shell with six error cards in it would be six ways of saying the same thing.
 */
export function DashboardPage() {
  const screen = useDashboardScreen()
  const { query, populationQuery, appliedFilters } = screen

  /*
   * Headcount & movement. The stock lands on its own chart floored at the
   * standing headcount; the joins and exits become columns beneath it — they are
   * posting EVENTS, and they sum exactly to the tiles above, which is why the
   * tile and the chart under it agree.
   */
  const movement = useSeriesPanel({
    baseQuery: query,
    metrics: MOVEMENT_METRICS,
    flowMark: 'bar',
  })

  /*
   * Attendance trend. Present days and leave days are `days`; late arrivals are
   * `count` — so this renders as two charts rather than one with a second axis.
   */
  const attendanceTrend = useSeriesPanel({
    baseQuery: query,
    metrics: ATTENDANCE_METRICS,
    flowMark: 'line',
  })

  /*
   * Payroll by month. Pinned to the monthly grain and drawn as columns, because
   * a salary sheet has no day: at `granularity=day` each month's whole cost sits
   * on the 1st and a line reads as volatility.
   */
  const payroll = useSeriesPanel({
    baseQuery: query,
    metrics: PAYROLL_METRICS,
    granularity: 'month',
    lockGranularity: true,
    flowMark: 'bar',
  })

  // Workforce mix — headcount by department, as a donut with the total inside.
  const mix = useBreakdownPanel({
    baseQuery: query,
    measure: 'headcount',
    dimension: 'department',
    shape: 'donut',
  })

  /*
   * Leave days by department, as the comparative "vs previous" columns the
   * response already carries both windows for.
   *
   * Not by leave TYPE: that dimension is gone, along with every other one that
   * lives on a single fact table rather than in the nightly cube's key. Nothing
   * was lost with it — the status and pay-type splits are fields on `/summary`,
   * which this screen already holds, so they are drawn on the Leave card
   * upstairs rather than requested again here.
   */
  const leaveMix = useBreakdownPanel({
    baseQuery: query,
    measure: 'leave_days',
    dimension: 'department',
    shape: 'comparative',
  })

  // Cost by department — a plain bar, formatted as INR off `unit: 'amount'`.
  const cost = useBreakdownPanel({
    baseQuery: query,
    measure: 'net_pay',
    dimension: 'department',
    shape: 'bar',
  })

  const radar = useRadarPanel(query, 'department')
  const heatmap = useHeatmapPanel(query, 'weekday_hour', 'check_ins')

  // The worklist takes the POPULATION query without the window — every signal on
  // it is measured as of now.
  const attention = useAttentionList(populationQuery)
  const noPostingCount = useNoPostingCount(populationQuery)

  /*
   * A 403 on any of the six means the user lacks `dashboard:read`, which is one
   * code for the whole screen. `/summary` answers first, so it is the one asked.
   */
  if (screen.isForbidden || !screen.access.canView) {
    return (
      <Forbidden
        title="Dashboard unavailable"
        description="You do not have access to the dashboard. Every panel on this screen is gated on one permission, so there is nothing here to show without it — contact your administrator to request access."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Workforce, attendance, leave, payroll and help desk across the period and population you choose."
      />

      <DashboardFilterBar
        state={screen}
        resolvedWindow={screen.resolvedWindow}
        asOf={screen.asOf}
      />

      {/*
        The rollup has never run for this account. Every figure below is zero and
        none of them means "nothing happened" — said outright, because a wall of
        zeroes is indistinguishable from a genuinely quiet period and reads as
        the opposite of what it is.
      */}
      {screen.isNotYetComputed ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <DatabaseZap className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium">Not yet computed</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              The nightly rollup behind this dashboard has not run for this
              account yet, so every figure here reads zero. That is not the same
              as no activity — the numbers will appear after the next rebuild.
            </p>
          </div>
        </div>
      ) : null}

      <DashboardKpiStrip
        summary={screen.summary.data}
        isLoading={screen.summary.isPending}
        isFetching={screen.summary.isFetching && !screen.summary.isPending}
        showComparisons={screen.showComparisons}
      />

      <SummarySectionCards
        summary={screen.summary.data}
        isLoading={screen.summary.isPending}
        isFetching={screen.summary.isFetching && !screen.summary.isPending}
        showComparisons={screen.showComparisons}
        noPostingCount={noPostingCount}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SeriesPanel
          title="Headcount & movement"
          description="The standing headcount is a stock and can fall; joins and exits are posting events, so a rehire is a second join and a transfer is both."
          panel={movement}
        />

        <BreakdownPanel
          title="Workforce mix"
          panel={mix}
          allowMeasureChoice={false}
          showComparisons={screen.showComparisons}
        />

        <SeriesPanel
          title="Attendance trend"
          description="Present and leave days beside late arrivals. Different units never share an axis, so this draws as one chart per unit."
          panel={attendanceTrend}
          allowMetricChoice
        />

        <RadarPanel panel={radar} />

        <HeatmapPanel panel={heatmap} ignoredFilters={ignoredByPunchGrid(appliedFilters)} />

        <BreakdownPanel
          title="Leave by department"
          panel={leaveMix}
          showComparisons={screen.showComparisons}
        />

        <SeriesPanel
          title="Payroll by month"
          description="Filed on each sheet's own month — a sheet computed in April for March is March's payroll."
          panel={payroll}
        />

        <BreakdownPanel
          title="Cost by department"
          panel={cost}
          showComparisons={screen.showComparisons}
        />
      </div>

      <div className="mt-4">
        <AttentionPanel
          list={attention}
          populationSummary={populationSummary(appliedFilters)}
        />
      </div>
    </div>
  )
}

/**
 * The narrowings the weekday/hour heatmap IGNORES — everything below company.
 *
 * That grid's rollup is keyed by company alone, because an hour dimension
 * multiplies its rows by 24. Naming what is being ignored is the alternative to
 * greying the controls out, which is not open to a filter bar shared by eight
 * panels.
 */
function ignoredByPunchGrid(filters: DashboardFilters): string[] {
  return (
    [
      [filters.branchIds.length > 0, 'branch'],
      [filters.departmentIds.length > 0, 'department'],
      [filters.designationIds.length > 0, 'designation'],
      [Boolean(filters.employmentType), 'employment type'],
      [Boolean(filters.grade), 'grade'],
    ] as const
  )
    .filter(([applied]) => applied)
    .map(([, noun]) => noun)
}

/**
 * The population narrowings in words — shown on the worklist in place of the
 * date range it deliberately doesn't show.
 */
function populationSummary(filters: DashboardFilters): string {
  const parts: string[] = []

  const counted = (
    [
      ['companyIds', 'company'],
      ['branchIds', 'branch'],
      ['departmentIds', 'department'],
      ['designationIds', 'designation'],
    ] as const
  ).map(([key, noun]) => {
    const count = filters[key].length
    if (!count) return null
    const label = BREAKDOWN_DIMENSION_LABELS[noun].toLowerCase()
    return `${count} ${count === 1 ? label : `${label}s`}`
  })

  parts.push(...counted.filter((part): part is string => part !== null))

  const named = (
    [
      [filters.employmentType, EMPLOYMENT_TYPE_OPTIONS],
      [filters.grade, GRADE_OPTIONS],
    ] as const
  )
    .map(([value, options]) =>
      value ? options.find((option) => option.value === value)?.label : undefined,
    )
    .filter((label): label is string => Boolean(label))

  parts.push(...named)

  return parts.length ? parts.join(', ') : 'all companies and departments'
}
