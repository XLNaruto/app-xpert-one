/**
 * The dashboard's UI-facing shapes.
 *
 * These mirror `/user/dashboard/*` closely on purpose — the endpoints already
 * answer in the vocabulary the panels draw in, and the two rules that matter
 * most (a ratio is a fraction in `0..1`, and `null` means "not measured", never
 * zero) are only safe if nothing in between quietly normalises them. So every
 * rate stays a `number | null` all the way to the formatter that turns a null
 * into an em-dash.
 *
 * Money is RUPEES here. The super-admin console's dashboard serves `*_paise`
 * because those are captured Razorpay payments; these are payroll figures and
 * are never divided by 100.
 */

// ─── Every response ────────────────────────────────────────────────────────

/**
 * What every one of the six endpoints carries.
 *
 * THESE FIGURES ARE NOT LIVE. They come from a nightly rollup, and `asOf` is
 * when that rollup was last rebuilt — so today's punches, leaves and tickets are
 * not in any of them. The screen shows it once, because a user asking why this
 * morning's check-in is missing has `asOf` as the answer.
 *
 * `null` means the job has NEVER run for this account: every figure will be
 * zero, and that state reads "not yet computed" rather than "no activity". The
 * two are indistinguishable in the data and mean opposite things.
 */
export interface Precomputed {
  asOf: string | null
}

// ─── The shared population filter ──────────────────────────────────────────

export type EmploymentTypeFilter = 'PERMANENT' | 'CONTRACTUAL'
export type GradeFilter = 'SKILLED' | 'HIGH-SKILLED' | 'SEMI-SKILLED' | 'UN-SKILLED'

/** The named date windows the bar offers. `all_time` is the odd one — see below. */
export type DatePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'this_quarter'
  | 'this_financial_year'
  | 'all_time'

/**
 * ONE filter object for SIX requests.
 *
 * Not tidiness: the moment one panel gets a slightly different filter, two
 * panels on the same screen describe different populations and the numbers stop
 * reconciling. The screen holds exactly one of these and serialises it into
 * every request.
 *
 * Dates are `yyyy-MM-dd` here and become ISO instants on the wire — see
 * `lib/dashboard-query.ts`. Multi-selects hold ids as strings because that is
 * what `<Combobox>` speaks; an empty array omits the key entirely rather than
 * sending `?company_ids=`.
 */
export interface DashboardFilters {
  preset: DatePreset
  /** Inclusive lower bound, `yyyy-MM-dd`. Ignored while `allTime`. */
  from: string
  /** Inclusive upper bound, `yyyy-MM-dd`. Ignored while `allTime`. */
  to: string
  /**
   * Ignores `from`/`to` entirely — and KILLS EVERY COMPARISON. There is no
   * equally-long period before all of history, so each `previous_*` comes back
   * 0 and each `change_pct` null; the panels hide their delta badges rather than
   * render a row of em-dashes.
   */
  allTime: boolean
  /** IANA zone. Every bucket, hour and calendar day comes back local to it. */
  timezone: string
  companyIds: string[]
  branchIds: string[]
  departmentIds: string[]
  designationIds: string[]
  employmentType: EmploymentTypeFilter | ''
  grade: GradeFilter | ''
}

// ─── /summary ──────────────────────────────────────────────────────────────

/**
 * POSITIONS COUNT PEOPLE; FLOWS COUNT EVENTS — and the two do not close into an
 * identity, so none of these four is ever derived from the others.
 *
 * `headcount` / `openingHeadcount` / `confirmed` are people, counted off each
 * employee's CURRENT posting (the newest one that has actually started).
 * `joined` / `exited` are posting EVENTS: a rehire is a second join, a transfer
 * between two companies of one account is an exit and a join. Which is why the
 * joins tile is captioned "Joins", not "New employees".
 */
export interface WorkforceSummary {
  headcount: number
  /** Headcount the instant the window opened — an area chart's FLOOR, not zero. */
  openingHeadcount: number
  joined: number
  exited: number
  /** `joined - exited`, and it CAN BE NEGATIVE. A shrinking payroll must show. */
  net: number
  previousJoined: number
  previousExited: number
  previousNet: number
  /** Compares the two JOIN flows. Null when the previous window was empty. */
  changePct: number | null
  /** Exits over the mean headcount, as a fraction. Up is BAD here. */
  attritionRate: number | null
  confirmed: number
  onProbation: number
}

/**
 * PRESENCE, not attendance-versus-absence. `employee_attendance` records a day
 * as present or half-day; an absence is the LACK of a row, indistinguishable
 * from a Sunday, a holiday, a pre-hire day or a phone that never synced. There
 * is no absent count on this API and there will not be one — which is why
 * `attendanceRate` is labelled "of days recorded" and no present/absent donut
 * is ever drawn from these numbers.
 */
export interface AttendanceSummary {
  presentDays: number
  halfDays: number
  /** Approved leave days STARTING in the window. Halves allowed. */
  leaveDays: number
  /** `present + half + leave` — the denominator of both rates below. */
  accountedDays: number
  lateArrivals: number
  earlyExits: number
  workedHours: number
  overtimeHours: number
  /** `(present + half/2) / accounted`. Over ACCOUNTED days, not calendar days. */
  attendanceRate: number | null
  /** `1 - late / (present + half)` — higher is better, so it shares an axis. */
  punctualityRate: number | null
  averageWorkedHours: number | null
  previousPresentDays: number
  changePct: number | null
}

export interface LeaveSummary {
  /** Applications whose leave STARTS in the window, not ones typed in it. */
  applications: number
  pending: number
  approved: number
  rejected: number
  /** CALENDAR days — weekends and holidays included, a half day as 0.5. */
  approvedDays: number
  paidDays: number
  unpaidDays: number
  /** Over DECIDED applications only, so a big pending queue can't flatter it. */
  approvalRate: number | null
  averageDecisionHours: number | null
  /** A POSITION, not windowed: pending more than 3 days, as of now. */
  pendingOverdue: number
  previousApplications: number
  changePct: number | null
}

/**
 * Filed on the SHEET'S OWN month, not on when the row was written — a sheet
 * computed in April for March is March's payroll. A window spanning two calendar
 * months therefore covers both months in full.
 */
export interface PayrollSummary {
  employeesProcessed: number
  sheets: number
  grossPay: number
  netPay: number
  totalDeduction: number
  totalAllowance: number
  employeePf: number
  employerPf: number
  employeeEsic: number
  employerEsic: number
  overtimeAmount: number
  bonusAmount: number
  paidRate: number | null
  averageNetPay: number | null
  previousNetPay: number
  changePct: number | null
}

export interface HelpdeskSummary {
  raised: number
  /** Bucketed on when a ticket was FINISHED — throughput against demand. */
  resolved: number
  /** As of NOW, whatever the window. Does not move when the dates change. */
  open: number
  unassigned: number
  averageResolutionHours: number | null
  averageFirstResponseHours: number | null
  /** CAN EXCEED 1 — a backlog being cleared. Never clamped, never an error. */
  resolutionRate: number | null
  previousRaised: number
  changePct: number | null
}

export interface DashboardSummary extends Precomputed {
  /** The window the server actually measured. Echo it; every panel shares it. */
  from: string
  to: string
  workforce: WorkforceSummary
  attendance: AttendanceSummary
  leave: LeaveSummary
  payroll: PayrollSummary
  helpdesk: HelpdeskSummary
}

// ─── /series ───────────────────────────────────────────────────────────────

export type SeriesMetric =
  | 'headcount'
  | 'joined'
  | 'exited'
  | 'present_days'
  | 'late_arrivals'
  | 'worked_hours'
  | 'overtime_hours'
  | 'leave_applications'
  | 'leave_days'
  | 'payroll_net'
  | 'payroll_gross'
  | 'tickets_raised'
  | 'tickets_resolved'

/** What the numbers ARE — it drives the axis, and never shares one with another. */
export type MetricUnit = 'count' | 'hours' | 'days' | 'amount'

export type Granularity = 'day' | 'week' | 'month'

export interface SeriesPoint {
  /** A plain `YYYY-MM-DD` CALENDAR DATE in the requested zone. Never a timestamp. */
  bucket: string
  value: number
  /** `baseline` plus every value up to and including this bucket. */
  cumulative: number
}

export interface MetricSeries {
  metric: SeriesMetric
  unit: MetricUnit
  /**
   * The metric's standing total BEFORE the window — non-zero for `headcount`
   * alone, the one STOCK metric. Which is why headcount plots `cumulative` (and
   * can go DOWN) while every flow plots `value`.
   */
  baseline: number
  points: SeriesPoint[]
}

export interface DashboardSeries extends Precomputed {
  from: string
  to: string
  /**
   * THE GRAIN ACTUALLY USED. Over a long history the server escalates
   * day → week → month so the chart stays drawable, so the axis is always
   * labelled from here and never from what was requested.
   */
  granularity: Granularity
  timezone: string
  series: MetricSeries[]
}

// ─── /breakdown ────────────────────────────────────────────────────────────

export type BreakdownMeasure =
  | 'headcount'
  | 'present_days'
  | 'worked_hours'
  | 'overtime_hours'
  | 'late_arrivals'
  | 'leave_applications'
  | 'leave_days'
  | 'net_pay'
  | 'gross_pay'
  | 'total_deduction'
  | 'tickets'

/**
 * THE COMPLETE LIST — the key of the nightly cube every endpoint reads, which is
 * why you can filter and group by exactly these six and no more.
 *
 * `gender`, `marital_status`, `age_band` and `tenure_band` are gone and are not
 * coming back: they are independent of the org tree, so keying the rollup on
 * them multiplies it toward one row per employee per day. `leave_type`,
 * `leave_status`, `leave_pay_type`, `leave_duration`, `attendance_status`,
 * `ticket_status`, `ticket_category` and `ticket_priority` are gone too — each
 * lives on one fact table and is not in the key either.
 *
 * NO STATUS SPLIT WAS LOST. Everything those would have drawn is already a field
 * on `/summary`, which the screen fetches anyway — `leave.approved/rejected/
 * pending`, `leave.paidDays/unpaidDays`, `attendance.presentDays/halfDays`. A
 * status donut is built from a response already held, not requested.
 *
 * The upshot: every measure now pairs with every dimension, so the 400 for an
 * impossible pair can no longer happen and nothing re-filters the dropdown.
 */
export type BreakdownDimension =
  | 'company'
  | 'branch'
  | 'department'
  | 'designation'
  | 'employment_type'
  | 'grade'

export interface BreakdownItem {
  /**
   * Stable and machine-readable — an id, an enum value or a band name. Two keys
   * are reserved: `__other__` (the folded remainder beyond `limit`) and
   * `__unassigned__` (a fact whose branch / department / designation is null,
   * which is legitimate — those levels are optional in this product).
   */
  key: string
  label: string
  value: number
  /** This slice as a fraction of `total`. */
  share: number | null
  /** The SAME slice over the equally-long window before — no second request. */
  previousValue: number
  changePct: number | null
}

export interface DashboardBreakdown extends Precomputed {
  measure: BreakdownMeasure
  dimension: BreakdownDimension
  unit: MetricUnit
  /**
   * The population total — and the slices always add up to it, because the
   * remainder is folded into `__other__` rather than dropped. A donut whose
   * wedges sum to less than the figure in its middle is a bug.
   */
  total: number
  previousTotal: number
  items: BreakdownItem[]
}

// ─── /radar ────────────────────────────────────────────────────────────────

export type RadarAxis =
  | 'attendance_rate'
  | 'punctuality_rate'
  | 'retention_rate'
  | 'leave_approval_rate'
  | 'payroll_paid_rate'
  | 'helpdesk_resolution_rate'

export type RadarGroupBy = 'company' | 'branch' | 'department' | 'designation'

export interface RadarGroup {
  key: string
  label: string
  /** The weight behind the shape. A 3-person department's perfect web isn't news. */
  headcount: number
  /**
   * One entry per axis, each a fraction in `0..1` WHERE HIGHER IS BETTER — the
   * one property that makes two polygons comparable. A NULL score is an axis
   * that was not measured for this group: break the polygon there. A department
   * that ran no payroll is not a department with terrible payroll.
   */
  scores: Partial<Record<RadarAxis, number | null>>
}

export interface DashboardRadar extends Precomputed {
  groupBy: RadarGroupBy
  /** Drawn in THIS order, always, or shapes stop comparing across screens. */
  axes: RadarAxis[]
  groups: RadarGroup[]
}

// ─── /heatmap ──────────────────────────────────────────────────────────────

export type HeatmapShape = 'weekday_hour' | 'calendar'

export type HeatmapMetric =
  | 'check_ins'
  | 'present_days'
  | 'late_arrivals'
  | 'leave_days'
  | 'overtime_hours'

export interface HeatmapCell {
  /** `weekday_hour`: the weekday, `0` = SUNDAY. `calendar`: the week's Monday. */
  row: string
  /** `weekday_hour`: the local hour `0`–`23`. `calendar`: the weekday. */
  column: string
  value: number
  /** The calendar day — `calendar` only, null on the grid. */
  date: string | null
}

export interface DashboardHeatmap extends Precomputed {
  shape: HeatmapShape
  metric: HeatmapMetric
  unit: MetricUnit
  /** The window ACTUALLY DRAWN — a calendar longer than a year is clamped. */
  from: string
  to: string
  /** THE COMPLETE GRID, quiet cells as zeroes. Never filtered. */
  cells: HeatmapCell[]
  /** The largest cell value — scales the ramp in one pass. */
  max: number
}

// ─── /attention ────────────────────────────────────────────────────────────

export type AttentionSignal =
  | 'leave_pending'
  | 'missing_checkout'
  | 'contract_expiring'
  | 'document_expiring'
  | 'no_wage'
  | 'probation_due'
  | 'ticket_overdue'
  | 'no_posting'
  | 'incomplete_kyc'

export interface AttentionRow {
  employeeId: number
  employeeName: string | null
  employeeCode: string | null
  companyId: number
  companyName: string | null
  branchName: string | null
  departmentName: string | null
  designationName: string | null
  /**
   * What is actually WRONG, in catalog order — so the chips on a row always
   * read the same way. There is no score and no band on purpose: an expiring
   * contract and a missing PAN are not two units of the same thing.
   */
  signals: AttentionSignal[]
  pendingLeaves: number
  missingCheckouts: number
  openTickets: number
  contractEndsOn: string | null
  /** The earlier of passport and licence expiry. */
  documentExpiresOn: string | null
  joiningDate: string | null
}

export interface DashboardAttention extends Precomputed {
  items: AttentionRow[]
  /** The size of the WORKLIST, not of the workforce. */
  total: number
}
