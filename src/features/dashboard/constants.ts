import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  AttentionSignal,
  BreakdownDimension,
  BreakdownMeasure,
  DashboardFilters,
  DatePreset,
  Granularity,
  HeatmapMetric,
  HeatmapShape,
  MetricUnit,
  RadarAxis,
  RadarGroupBy,
  SeriesMetric,
} from './types'

/**
 * Everything the dashboard's dropdowns, captions and colour ramps are named
 * from. No component types an enum value or a unit label inline.
 */

// ─── The filter bar ────────────────────────────────────────────────────────

/**
 * The user's own IANA zone, which is also what the `timezone` param is set to.
 *
 * Why the browser's zone rather than the API's `Asia/Kolkata` default: the
 * window's `from`/`to` are computed here as local day boundaries, so the two
 * have to agree. Send IST while computing boundaries in, say, Dubai and the
 * server measures a window neither the user nor the picker asked for.
 */
export function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
}

/** Rows the worklist opens on — also the `limit` its first page sends. */
export const ATTENTION_PAGE_SIZE = 10

/** Page sizes the worklist's footer offers. Must contain the size above. */
export const ATTENTION_PAGE_SIZES = [10, 20, 50, 100]

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  this_week: 'This week',
  this_month: 'This month',
  last_30_days: 'Last 30 days',
  this_quarter: 'This quarter',
  this_financial_year: 'This financial year',
  all_time: 'All time',
}

export const DATE_PRESET_OPTIONS: ComboboxOption[] = (
  Object.keys(DATE_PRESET_LABELS) as DatePreset[]
).map((preset) => ({ label: DATE_PRESET_LABELS[preset], value: preset }))

/** "No narrowing" for a single-select facet — the key is omitted, not sent empty. */
export const ANY_VALUE = ''

export const EMPLOYMENT_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'All employment types', value: ANY_VALUE },
  { label: 'Permanent', value: 'PERMANENT' },
  { label: 'Contractual', value: 'CONTRACTUAL' },
]

export const GRADE_OPTIONS: ComboboxOption[] = [
  { label: 'All grades', value: ANY_VALUE },
  { label: 'Skilled', value: 'SKILLED' },
  { label: 'Highly skilled', value: 'HIGH-SKILLED' },
  { label: 'Semi-skilled', value: 'SEMI-SKILLED' },
  { label: 'Unskilled', value: 'UN-SKILLED' },
]

/**
 * The filter the screen opens on: the API's own default window (last 30 days)
 * in the user's zone, with nothing narrowed.
 */
export const DEFAULT_PRESET: DatePreset = 'last_30_days'

/**
 * Base of a fresh filter. `from`/`to` are computed from the preset and
 * `timezone` is resolved at runtime (see `localTimezone`), so neither is
 * frozen into a module constant.
 */
export const EMPTY_DASHBOARD_FILTERS: Omit<
  DashboardFilters,
  'from' | 'to' | 'timezone'
> = {
  preset: DEFAULT_PRESET,
  allTime: false,
  companyIds: [],
  branchIds: [],
  departmentIds: [],
  designationIds: [],
  employmentType: ANY_VALUE,
  grade: ANY_VALUE,
}

// ─── Units ─────────────────────────────────────────────────────────────────

/** How a unit reads on an axis title or a tooltip. */
export const UNIT_LABELS: Record<MetricUnit, string> = {
  count: 'Count',
  hours: 'Hours',
  days: 'Days',
  amount: 'Amount',
}

// ─── /series ───────────────────────────────────────────────────────────────

export const SERIES_METRIC_LABELS: Record<SeriesMetric, string> = {
  headcount: 'Headcount',
  joined: 'Joins',
  exited: 'Exits',
  present_days: 'Present days',
  late_arrivals: 'Late arrivals',
  worked_hours: 'Worked hours',
  overtime_hours: 'Overtime hours',
  leave_applications: 'Leave applications',
  leave_days: 'Leave days',
  payroll_net: 'Net payroll',
  payroll_gross: 'Gross payroll',
  tickets_raised: 'Tickets raised',
  tickets_resolved: 'Tickets resolved',
}

/**
 * The one STOCK metric. It plots `cumulative` (the standing headcount, which can
 * go DOWN); every other metric is a flow and plots `value`. A headcount line
 * that only ever rises is a hiring log, not a headcount.
 */
export const STOCK_METRIC: SeriesMetric = 'headcount'

/**
 * Metrics that land on the 1st of a month whatever grain is asked for, because a
 * salary sheet has no day. A panel selecting one requests `month` rather than
 * drawing a daily line that reads as volatility.
 */
export const MONTHLY_METRICS: readonly SeriesMetric[] = ['payroll_net', 'payroll_gross']

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
}

/** How an axis names its buckets, given the grain the RESPONSE came back with. */
export const GRANULARITY_AXIS_LABELS: Record<Granularity, string> = {
  day: 'Day',
  week: 'Week commencing (Monday)',
  month: 'Month',
}

export const GRANULARITY_OPTIONS: ComboboxOption[] = (
  Object.keys(GRANULARITY_LABELS) as Granularity[]
).map((value) => ({ label: GRANULARITY_LABELS[value], value }))

/** Headcount & movement — a stock and the two flows that move it. */
export const MOVEMENT_METRICS: readonly SeriesMetric[] = ['headcount', 'joined', 'exited']

/** Attendance trend — two `days` metrics and one `count`, so two charts. */
export const ATTENDANCE_METRICS: readonly SeriesMetric[] = [
  'present_days',
  'leave_days',
  'late_arrivals',
]

/** Payroll by month — both `amount`, so one chart, drawn as columns. */
export const PAYROLL_METRICS: readonly SeriesMetric[] = ['payroll_net', 'payroll_gross']

/** Metrics the attendance-trend panel lets the user swap in. */
export const TREND_METRIC_OPTIONS: ComboboxOption[] = (
  [
    'present_days',
    'leave_days',
    'late_arrivals',
    'worked_hours',
    'overtime_hours',
    'leave_applications',
    'tickets_raised',
    'tickets_resolved',
  ] satisfies SeriesMetric[]
).map((value) => ({ label: SERIES_METRIC_LABELS[value], value }))

// ─── /breakdown ────────────────────────────────────────────────────────────

export const BREAKDOWN_MEASURE_LABELS: Record<BreakdownMeasure, string> = {
  headcount: 'Headcount',
  present_days: 'Present days',
  worked_hours: 'Worked hours',
  overtime_hours: 'Overtime hours',
  late_arrivals: 'Late arrivals',
  leave_applications: 'Leave applications',
  leave_days: 'Leave days',
  net_pay: 'Net pay',
  gross_pay: 'Gross pay',
  total_deduction: 'Total deduction',
  tickets: 'Tickets',
}

/**
 * The six dimensions, and this is the whole list for every measure — they are
 * the key of the nightly cube. Every measure pairs with every one of them, so
 * nothing here re-filters the dropdown and the 400 for an impossible pair cannot
 * happen. See `BreakdownDimension` for what was dropped and where those status
 * splits live now (`/summary`, which the screen already holds).
 */
export const BREAKDOWN_DIMENSION_LABELS: Record<BreakdownDimension, string> = {
  company: 'Company',
  branch: 'Branch',
  department: 'Department',
  designation: 'Designation',
  employment_type: 'Employment type',
  grade: 'Grade',
}

/** Every dimension, in the order the pickers offer them. */
export const BREAKDOWN_DIMENSIONS = Object.keys(
  BREAKDOWN_DIMENSION_LABELS,
) as BreakdownDimension[]

export const BREAKDOWN_DIMENSION_OPTIONS: ComboboxOption[] = BREAKDOWN_DIMENSIONS.map(
  (value) => ({ label: BREAKDOWN_DIMENSION_LABELS[value], value }),
)

export const BREAKDOWN_MEASURE_OPTIONS: ComboboxOption[] = (
  Object.keys(BREAKDOWN_MEASURE_LABELS) as BreakdownMeasure[]
).map((value) => ({ label: BREAKDOWN_MEASURE_LABELS[value], value }))

/**
 * Slices a breakdown names before folding the rest into `__other__`.
 *
 * A bar chart can carry plenty, because every bar wears the SAME hue — the
 * category is on the axis, and giving each bar its own colour would double-encode
 * the length the bar already shows.
 */
export const BREAKDOWN_LIMIT = 8

/**
 * The donut's own, much smaller limit.
 *
 * A donut has no axis, so each wedge does need its own hue — and there are five
 * categorical slots, never cycled, plus the two neutral reserved keys. Four
 * named slices therefore caps the chart at six wedges, which is also as many as
 * a part-to-whole reading survives: past that, adjacent wedges blur and the
 * shape stops being readable at a glance.
 */
export const DONUT_LIMIT = 4

/** The folded remainder beyond `limit`. Neutral, kept, never a "top performer". */
export const OTHER_KEY = '__other__'

/**
 * A fact whose branch / department / designation is null — legitimate, because
 * those levels are optional in this product. Neutral, and sorted LAST whatever
 * its size.
 */
export const UNASSIGNED_KEY = '__unassigned__'

/** The reserved keys, which are coloured neutral rather than from the palette. */
export const RESERVED_KEYS: readonly string[] = [OTHER_KEY, UNASSIGNED_KEY]

/** Dimensions attributed to where the person is TODAY — worth saying out loud. */
export const CURRENT_POSTING_DIMENSIONS: readonly BreakdownDimension[] = [
  'company',
  'branch',
  'department',
  'designation',
]

export type BreakdownChartShape = 'bar' | 'donut' | 'comparative'

export const BREAKDOWN_SHAPE_LABELS: Record<BreakdownChartShape, string> = {
  bar: 'Bar',
  donut: 'Donut',
  comparative: 'vs previous',
}

export const BREAKDOWN_SHAPE_OPTIONS: ComboboxOption[] = (
  Object.keys(BREAKDOWN_SHAPE_LABELS) as BreakdownChartShape[]
).map((value) => ({ label: BREAKDOWN_SHAPE_LABELS[value], value }))

// ─── /radar ────────────────────────────────────────────────────────────────

/**
 * All six axes are fractions in `0..1` oriented so HIGHER IS BETTER — which is
 * the only reason the polygons are comparable. It is why the axes are RETENTION
 * and PUNCTUALITY rather than attrition and lateness. Do not add a computed
 * seventh axis unless it obeys both properties.
 */
export const RADAR_AXIS_LABELS: Record<RadarAxis, string> = {
  attendance_rate: 'Attendance',
  punctuality_rate: 'Punctuality',
  retention_rate: 'Retention',
  leave_approval_rate: 'Leave approval',
  payroll_paid_rate: 'Payroll paid',
  helpdesk_resolution_rate: 'Ticket resolution',
}

export const RADAR_GROUP_BY_LABELS: Record<RadarGroupBy, string> = {
  company: 'Company',
  branch: 'Branch',
  department: 'Department',
  designation: 'Designation',
}

export const RADAR_GROUP_BY_OPTIONS: ComboboxOption[] = (
  Object.keys(RADAR_GROUP_BY_LABELS) as RadarGroupBy[]
).map((value) => ({ label: RADAR_GROUP_BY_LABELS[value], value }))

/**
 * Rings drawn by default.
 *
 * Five, not the endpoint's default six: each ring needs its own categorical hue,
 * there are five slots, and a sixth would have to be a generated or reused
 * colour — which under colour-vision deficiency is indistinguishable from a slot
 * already on the chart. It is also within the range where a radar stays readable
 * at all; above ~6 the webs become mud. Rings beyond the limit aren't the answer
 * anyway — the legend TOGGLES them.
 */
export const RADAR_LIMIT = 5

// ─── /heatmap ──────────────────────────────────────────────────────────────

export const HEATMAP_SHAPE_LABELS: Record<HeatmapShape, string> = {
  weekday_hour: 'Weekday × hour',
  calendar: 'Calendar',
}

export const HEATMAP_SHAPE_OPTIONS: ComboboxOption[] = (
  Object.keys(HEATMAP_SHAPE_LABELS) as HeatmapShape[]
).map((value) => ({ label: HEATMAP_SHAPE_LABELS[value], value }))

export const HEATMAP_METRIC_LABELS: Record<HeatmapMetric, string> = {
  check_ins: 'Check-ins',
  present_days: 'Present days',
  late_arrivals: 'Late arrivals',
  leave_days: 'Leave days',
  overtime_hours: 'Overtime hours',
}

/**
 * `leave_days` is CALENDAR-ONLY — a leave application has dates and no clock, so
 * the weekday/hour grid answers 400 for it. The metric dropdown disables it
 * while the shape is the grid rather than letting the request fail.
 */
export const CALENDAR_ONLY_METRICS: readonly HeatmapMetric[] = ['leave_days']

/** Weekday row labels, indexed the way the API sends `row` — `0` = SUNDAY. */
export const WEEKDAY_LABELS: readonly string[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
]

// ─── /attention ────────────────────────────────────────────────────────────

/**
 * The nine signals: what to call each one, the sentence explaining it, and where
 * the chip links. Every signal is measured AS OF NOW rather than over the
 * window — a contract expiring next week is the same problem whichever month is
 * selected — which is why the worklist's header shows no date range.
 */
export interface SignalSpec {
  label: string
  description: string
  /** The screen that fixes it. */
  to: string
}

export const SIGNAL_SPECS: Record<AttentionSignal, SignalSpec> = {
  leave_pending: {
    label: 'Leave pending',
    description: 'A leave application has been sitting for more than 3 days.',
    to: '/hr/leave',
  },
  missing_checkout: {
    label: 'Missing check-out',
    description: 'A past day has a check-in and no check-out.',
    to: '/hr/attendance',
  },
  contract_expiring: {
    label: 'Contract expiring',
    description: 'The posting comes up for renewal within 30 days.',
    to: '/hr/employee',
  },
  document_expiring: {
    label: 'Document expiring',
    description: 'A passport or licence expires within 30 days.',
    to: '/hr/employee',
  },
  no_wage: {
    label: 'No wage',
    description: 'No wage row — payroll skips this employee entirely.',
    to: '/hr/employee',
  },
  probation_due: {
    label: 'Probation due',
    description: 'Joined more than 6 months ago and still unconfirmed.',
    to: '/hr/employee',
  },
  ticket_overdue: {
    label: 'Ticket overdue',
    description: 'An open help-desk ticket is more than 7 days old.',
    to: '/support/employee-ticket',
  },
  no_posting: {
    label: 'No posting',
    description:
      'Employed by nobody — excluded from every headcount on this screen.',
    to: '/hr/employee',
  },
  incomplete_kyc: {
    label: 'Incomplete KYC',
    description: 'A bank account, PAN or Aadhaar is missing.',
    to: '/hr/employee',
  },
}

/** Catalog order — the order `signals[]` arrives in, and the order chips read. */
export const SIGNAL_ORDER = Object.keys(SIGNAL_SPECS) as AttentionSignal[]

export const SIGNAL_OPTIONS: ComboboxOption[] = [
  { label: 'All signals', value: ANY_VALUE },
  ...SIGNAL_ORDER.map((value) => ({ label: SIGNAL_SPECS[value].label, value })),
]

/**
 * The reconciliation signal. These people are excluded from every headcount on
 * the screen, so the workforce card links to them by name rather than letting a
 * user wonder why the tile disagrees with the employee list.
 */
export const RECONCILIATION_SIGNAL: AttentionSignal = 'no_posting'
