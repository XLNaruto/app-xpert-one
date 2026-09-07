================================================================================
FE-dash.txt — building the TENANT DASHBOARD screen on /user/dashboard/*
================================================================================

Six read-only endpoints. All under the `/user` audience, all requiring a normal
user bearer token, all gated on the single permission code `dashboard:read`.

  GET /user/dashboard/summary      the hero strip        (KPI tiles)
  GET /user/dashboard/series       trend over time       (line / area / column)
  GET /user/dashboard/breakdown    one measure by one    (bar / pie / donut /
                                   dimension              comparative columns)
  GET /user/dashboard/radar        normalised scores     (spider web)
  GET /user/dashboard/heatmap      density over time     (7x24 grid / calendar)
  GET /user/dashboard/attention    records needing work  (table with chips)

Swagger for all six, with the full field-by-field notes, is at `/user/docs`
under the `dashboard` tag. This file is the layout and rendering guide: what to
draw with each response, and the handful of places where drawing the obvious
thing would be wrong.

--------------------------------------------------------------------------------
0. THE SIX RULES THAT APPLY TO EVERY RESPONSE
--------------------------------------------------------------------------------

(1) A RATIO IS A FRACTION IN 0..1, NEVER A PERCENTAGE.
    `attendance_rate: 0.82` means 82%. Multiply for display; four decimals is
    all you get and all you need.

(2) NULL IS NOT ZERO. Any `*_rate`, `share`, `change_pct`, `average_*` or radar
    score is null when its denominator was zero. "Nobody was present" is a
    different statement from "nobody present was on time".
      -> render an em-dash (—), never 0, never 0%
      -> on a chart, BREAK the line / omit the point; do not plot it at zero
    This is the single most important rule in this file. Plotting a null as zero
    turns "we did not measure this" into "we scored nothing at this", which is a
    different and much worse claim to put in front of an HR director.

(3) `change_pct` COMPARES FLOWS, NOT TOTALS, and is null when the previous
    window was empty.
      -> null  => badge reads "New", not "+∞%"
      -> 0.4   => "+40%" with an up arrow
      -> -0.12 => "-12%" with a down arrow
    For `net` and `attrition_rate`, a fall is good; do not colour by sign alone.
    Colour by whether the metric is one where up is good.

(4) MONEY IS RUPEES, WITH TWO DECIMALS, AND IS NOT PAISE.
    `net_pay`, `gross_pay`, `total_deduction`, `employee_pf`, ... are all plain
    rupee numbers. Format with `Intl.NumberFormat('en-IN', {style:'currency',
    currency:'INR'})`.
    The super-admin console's dashboard serves `*_paise` because those figures
    are Razorpay's captured payments. THESE ARE NOT THOSE. Never divide by 100,
    and never add a figure from this API to one from that one.

(5) EVERY RESPONSE IS PRECOMPUTED, AND CARRIES `as_of`.
    These figures come from a nightly rollup, not from a live query. `as_of` is
    when that rollup was last rebuilt.
      -> show it. "As of 02 Sep, 01:30" somewhere on the page, once.
      -> `as_of: null` means the job has NEVER run for this account. Every figure
         will be zero. Render "not yet computed" — NOT "no activity". The two look
         identical in the data and mean opposite things.
      -> today's punches, leaves and tickets are NOT in it. If a user asks why
         this morning's check-in is missing, `as_of` is the answer.
    /attention is the same: its signals are as of last night too.

(6) A `bucket` AND A HEATMAP `date` ARE PLAIN `YYYY-MM-DD` CALENDAR DATES.
    Do NOT pass them through `new Date()` and then format for display — the
    string is already correct in the requested timezone, and re-reading it in
    the browser's zone will shift a Monday's punches onto Sunday. Split the
    string, or parse it as UTC. `from` / `to` / `contract_ends_on` etc. are the
    other way round: those are real timestamps / dates and may be formatted
    normally.

--------------------------------------------------------------------------------
1. THE FILTER BAR — ONE STATE OBJECT, SIX REQUESTS
--------------------------------------------------------------------------------

All six endpoints accept the SAME filter. Hold it in one piece of page state and
serialise it into all six requests. This is not tidiness: the moment one panel
gets a slightly different filter, two panels on the same screen start describing
different populations and the numbers stop reconciling.

  from            ISO datetime. Inclusive lower bound.
  to              ISO datetime. Inclusive upper bound.
  all_time        true | false. Ignores from/to entirely.
  timezone        IANA zone, default Asia/Kolkata.
  company_ids     repeatable OR comma-separated: ?company_ids=3,7
  branch_ids      same
  department_ids  same
  designation_ids same
  employment_type PERMANENT | CONTRACTUAL
  grade           SKILLED | HIGH-SKILLED | SEMI-SKILLED | UN-SKILLED

  THAT IS THE COMPLETE LIST, and it is the nightly cube's key. `gender` was a
  filter once and is gone — see section 4.

Defaults when you send nothing: the LAST 30 DAYS, IST, no narrowing.

Notes for the control bar:

  * Date presets. Offer Today / This week / This month / Last 30 days / This
    quarter / This financial year / All time. Everything except "All time" is a
    from+to pair you compute; "All time" is `all_time=true` and you must then
    STOP showing comparison badges — see below.

  * `all_time` kills every comparison. There is no equally-long period before
    all of history, so every `previous_*` comes back 0 and every `change_pct`
    null. Hide the delta badges entirely in this mode rather than rendering nine
    em-dashes. Also expect the series `granularity` in the RESPONSE to be
    coarser than the one you asked for — over a long history the server
    escalates day -> week -> month so the chart stays drawable. Always label the
    axis from `response.granularity`, never from your request.

  * An empty multi-select must send NOTHING, not an empty value. `?company_ids=`
    is treated as absent (which is correct), but do not rely on that — just omit
    the key.

  * Company reach is applied server-side and silently. A COMPANY-level user asking
    for a company they do not hold gets the intersection, not a 403, so a saved
    filter keeps working after an access change. Populate the company picker from
    `GET /user/my/companies` so the user only ever sees their own options; do not
    try to reason about reach in the client.

  * Branch / department / designation come off each employee's CURRENT posting.
    `branch` and `department` are independent in this product — a company may
    have branches with no departments, or departments straight under the company
    — so do NOT make the department picker depend on a branch selection.

  * Debounce. Six requests fire on every filter change. Debounce the bar by
    ~300ms and cancel in-flight requests (AbortController) so a fast user does
    not paint a stale panel next to a fresh one.

--------------------------------------------------------------------------------
2. GET /user/dashboard/summary — THE HERO STRIP
--------------------------------------------------------------------------------

Query: the filter, nothing else.
Returns five blocks: `workforce`, `attendance`, `leave`, `payroll`, `helpdesk`,
plus the resolved `from` / `to` (echo these somewhere — it is what every other
panel on the page is measuring, and users need to see it).

Suggested layout: one row of 4-6 KPI tiles across the top, then a second row of
five section cards, one per block.

  TILE                     FROM                              SECONDARY LINE
  -----------------------  --------------------------------  ------------------
  Headcount                workforce.headcount               net (+/-) with badge
  Joined / Exited          workforce.joined / .exited        change_pct on joined
  Attrition                workforce.attrition_rate          "over this period"
  Attendance rate          attendance.attendance_rate        of days recorded
  Payroll (net)            payroll.net_pay                   change_pct
  Open tickets             helpdesk.open                     unassigned count

Per-block rendering notes:

WORKFORCE
  POSITIONS COUNT PEOPLE; FLOWS COUNT EVENTS. This distinction runs through the
  whole block and you must not "fix" it in the client.

    `headcount`, `opening_headcount`, `confirmed`  -> PEOPLE, counted off each
      employee's CURRENT posting. One posting per person, because a person cannot
      appear in two departments on a chart without being counted twice.
    `joined`, `exited`                             -> POSTING EVENTS. A rehire is
      a second join; a transfer between two companies of one account is an exit
      from the first and a join to the second. Someone who joins and leaves inside
      one window contributes to both.

  Two consequences, and neither is a bug to work around:
    * `headcount != opening_headcount + net`. That identity does not hold in a
      product where one person may hold several postings, which is why
      `opening_headcount` is measured directly rather than derived. Do NOT compute
      any of these four from the others.
    * `joined` is the number of joining EVENTS, not of distinct new colleagues. On
      a tenant whose staff transfer often the two differ, and the event count is
      the one that sums correctly out of /series — which is why it is the one
      served. Caption the tile "Joins", not "New employees".

  `net` CAN BE NEGATIVE. This is the one thing that separates an HR dashboard
  from a growth dashboard: a shrinking payroll must be showable. Use a diverging
  colour (green up / red down) on `net`, and do NOT reuse that colouring for
  `attrition_rate`, where up is bad.

  `opening_headcount` is the headcount the instant the window opened. Use it as
  the FLOOR of any headcount area chart — starting at zero implies the company
  was empty on day one of the range.

  `headcount` counts people whose CURRENT posting is live today — where "current"
  means THE NEWEST POSTING THAT HAS ACTUALLY STARTED. A transfer or promotion may
  be written ahead of time with a future joining date, and such a row is not the
  posting the person holds today. An employee master row with no posting at all is
  not counted either. Those people are not lost — they surface on /attention under
  `no_posting`. If your headcount tile disagrees with the employee LIST screen,
  this is why, and the honest fix is a link to the worklist, not a different count.

  `confirmed` / `on_probation` make a good small stacked bar or a pair of chips.

ATTENDANCE — READ THIS BEFORE LABELLING ANYTHING
  THERE IS NO ABSENT COUNT ON THIS API, anywhere, and there will not be one.
  `employee_attendance` records PRESENCE: a day is `present` or `half_day`. An
  absence is the LACK of a row, which is indistinguishable from a Sunday, a
  public holiday, a day before the person was hired, or a phone that never
  synced. Deriving a real absence means expanding every employee's working
  calendar (shift + week-off policy + holiday list + posting dates) across every
  day of the window — that is a payroll computation, and the salary sheet
  already does it.

  Consequently:
    * `accounted_days` = present_days + half_days + leave_days. That is the
      denominator of both rates.
    * LABEL `attendance_rate` AS "of days recorded" or "of accounted days".
      Do not label it "Attendance %" full stop, and never draw a
      present-vs-absent donut from these numbers — you would be inventing the
      absent slice.
    * If the screen needs a true present/absent split, that belongs on the
      Attendance module's register, not here.

  `punctuality_rate` is 1 - late/(present+half): higher is better, so it is safe
  to put beside `attendance_rate` on the same axis.

LEAVE
  `applications` counts leave STARTING in the window (filed on `from_date`), not
  applications typed in the window. Say "leave starting in this period" in the
  tooltip, or somebody will reconcile it against a created-at list and fail.

  `approved_days` is CALENDAR days, weekends and holidays included, halves as
  0.5. That is what the application says and what a balance is decremented by.

  `approval_rate` is over DECIDED applications only, so a large pending queue
  cannot flatter it. Show `pending` beside it or the figure is misleading.

  `pending_overdue` is a POSITION, not windowed — applications sitting more than
  3 days, as of now, whatever period is selected. It is the most actionable
  number in the block: make it a clickable chip that deep-links to the leave
  queue.

PAYROLL
  Filed on the SHEET'S OWN month, not on when the row was written. A sheet
  computed in April for March is March's payroll. So a window of "last 30 days"
  spanning two calendar months covers BOTH months in full. If the tile looks
  double, that is why — consider snapping the payroll card's own caption to
  "March–April 2026" rather than to the raw window.

  Good sub-visual: a stacked bar of net_pay / total_deduction, and a small
  four-segment bar of employee_pf, employer_pf, employee_esic, employer_esic.
  `paid_rate` is a progress ring.

HELPDESK
  `raised` vs `resolved` over the same window is demand vs throughput — a paired
  bar or a small dual-line sparkline. `resolution_rate` CAN EXCEED 1: that is a
  backlog being cleared, not a bug, so do not clamp it and do not colour >1 as
  an error.

  `open` and `unassigned` are as-of-now positions. Do not let them animate when
  the window changes; they will not move.

--------------------------------------------------------------------------------
3. GET /user/dashboard/series — LINE / AREA / COLUMN, AND COMPARATIVE LINES
--------------------------------------------------------------------------------

Extra query params:
  granularity   day | week | month           (default day)
  metrics       repeatable or comma-separated (default: headcount, present_days,
                                               leave_days)

The 13 metrics and their units:

  METRIC              UNIT    KIND   NOTES
  ------------------  ------  -----  -----------------------------------------
  headcount           count   STOCK  value = NET movement; cumulative can FALL
  joined              count   flow   posting events, not distinct people
  exited              count   flow   posting events, not distinct people
  present_days        days    flow
  late_arrivals       count   flow
  worked_hours        hours   flow
  overtime_hours      hours   flow
  leave_applications  count   flow
  leave_days          days    flow
  payroll_net         amount  flow   lands on the 1st of each month
  payroll_gross       amount  flow   lands on the 1st of each month
  tickets_raised      count   flow
  tickets_resolved    count   flow

The response is `{ as_of, from, to, granularity, timezone, series[] }`; each series is
`{ metric, unit, baseline, points[] }` and each point `{ bucket, value, cumulative }`.

  * ASK FOR EVERY LINE IN ONE REQUEST. A chart with two lines is one chart.
    Fetching them separately lets the series land against slightly different
    clocks and end up a bucket apart on the same axis.

  * EVERY BUCKET IS PRESENT, quiet ones as `value: 0`. You do not need to
    gap-fill, and you must not filter zeroes out — that is exactly what makes a
    line chart interpolate across an empty week and draw a trend that never
    happened.

  * `baseline` is non-zero for `headcount` ONLY. Plot `cumulative` for headcount
    (it is the standing headcount, and it can go DOWN) and `value` for
    everything else. A headcount line that only ever rises is a hiring log.

  * `joined` and `exited` here sum EXACTLY to the same fields on /summary, because
    both count posting events. That is deliberate — the tile and the chart under
    it must agree — and it is why neither is a distinct-people count.

  * `unit` drives the axis. Never put two different units on one Y axis without
    a second axis — hours beside a person count is a chart that lies about
    scale. Group your requested metrics by `unit` and render one chart per unit,
    or use a dual axis for exactly two.

  * PAYROLL ON A DAILY AXIS IS SPIKY BY DESIGN. A salary sheet has no day, so at
    `granularity=day` each month's whole cost sits on the 1st. Either request
    `granularity=month` whenever a payroll metric is selected, or render payroll
    as columns (not a line) so the spikes read as monthly bars rather than as
    volatility.

  * COMPARATIVE LINES ("this period vs last"). Two clean options:
      a) request the same metric twice over two windows (two calls) and overlay
         them, aligning by bucket INDEX not by date; or
      b) for a single metric, just use /breakdown, which already returns
         `previous_value` per slice.
    Option (a) is the right one for a shape-over-time comparison; do not try to
    derive it from `baseline`.

  * ALWAYS label the axis from `response.granularity` and `response.from/to`,
    not from your request — under `all_time` the server may have escalated the
    grain and re-cut the window onto your account's first real activity.

  * Weeks start MONDAY (Postgres convention). The bucket string IS the Monday.

--------------------------------------------------------------------------------
4. GET /user/dashboard/breakdown — BAR, PIE, DONUT, COMPARATIVE COLUMNS
--------------------------------------------------------------------------------

This one endpoint feeds four chart shapes, because every item carries both
windows.

Extra query params:
  measure     (default headcount)   what is counted
  dimension   (default department)  what it is split by
  limit       1..50 (default 10)    how many slices to NAME

The 11 measures, and the fact table each reads:

  employee    : headcount
  attendance  : present_days, worked_hours, overtime_hours, late_arrivals
  leave       : leave_applications, leave_days
  salary      : net_pay, gross_pay, total_deduction
  ticket      : tickets

The SIX dimensions — and this is the whole list, for every measure:

    company, branch, department, designation, employment_type, grade

  THE RULE: you can filter and group by exactly these six, because they are the
  key of the nightly rollup every endpoint reads.

  DROPPED, and not coming back: `gender`, `marital_status`, `age_band`,
  `tenure_band`, `leave_type`, `leave_status`, `leave_pay_type`, `leave_duration`,
  `attendance_status`, `ticket_status`, `ticket_category`, `ticket_priority`.

  The first four are independent of the org tree, so keying the rollup on them
  multiplies it toward one row per employee per day — which is the design that
  does not pay for itself. The rest live on one fact table each and are not in the
  key either.

  YOU HAVE NOT LOST THE STATUS SPLITS. Everything those dimensions would have
  drawn is already a field on /summary, which you are fetching anyway:
    leave_status      -> leave.approved / .rejected / .pending
    leave_pay_type    -> leave.paid_days / .unpaid_days
    attendance_status -> attendance.present_days / .half_days
  So a status donut is a chart you build from a response you already hold, not a
  request you make. Every measure now pairs with every dimension, so the 400 for
  an impossible pair can no longer happen.

Response: `{ as_of, measure, dimension, unit, total, previous_total, items[] }` and
each item is `{ key, label, value, share, previous_value, change_pct }`.

Rendering:

  * PLAIN BAR / COLUMN: `label` vs `value`. Already sorted biggest first.
  * PIE / DONUT: `share` is the fraction; put `total` in the centre.
  * COMPARATIVE / GROUPED COLUMNS: two bars per label — `value` and
    `previous_value`. This is the "vs last period" chart, and it needs no second
    request.
  * BAR WITH DELTA BADGE: `value` as the bar, `change_pct` as a chip on it.

  * `measure=headcount` totals to exactly the `workforce.headcount` on /summary,
    whichever dimension you split by. If it ever does not, that is a bug worth
    reporting rather than papering over.

  * TWO RESERVED KEYS, and both need special handling:
      `__other__`      the folded remainder beyond `limit`. Its label is
                       "Other (N)". Colour it neutral grey, exclude it from
                       "top performer" callouts, and DO NOT drop it — it exists
                       precisely so the slices still sum to `total`. A donut
                       whose wedges add up to less than the number in its middle
                       is a bug report.
      `__unassigned__` a fact whose branch / department / designation is null
                       (legitimate — those levels are optional in this product).
                       Colour it neutral, label it "Unassigned", and sort it
                       last regardless of size.

  * ATTRIBUTION IS "WHERE THE PERSON IS TODAY". Every dimension attributes a
    fact to the employee's CURRENT posting, not to the posting they held when
    the fact happened. So a transfer moves that person's whole history into
    their new department. That is what keeps the department bars summing to the
    headcount tile, and it is worth one line of tooltip copy on any org
    dimension: "by current department".

  * `unit: 'amount'` means format as INR. `'hours'`/`'days'` may be fractional.

--------------------------------------------------------------------------------
5. GET /user/dashboard/radar — THE SPIDER WEB
--------------------------------------------------------------------------------

Extra query params:
  group_by   company | branch | department | designation   (default department)
  limit      2..12 (default 6)   rings to plot, biggest headcount first

Response: `{ as_of, group_by, axes[], groups[] }`, each group
`{ key, label, headcount, scores{} }`.

The six axes, ALL fractions in 0..1, ALL oriented so HIGHER IS BETTER:

  attendance_rate            (present + half/2) / accounted days
  punctuality_rate           1 - late / (present + half)
  retention_rate             1 - exits / (opening + joins)
  leave_approval_rate        approved / decided
  payroll_paid_rate          sheet rows flagged paid / rows written
  helpdesk_resolution_rate   resolved / raised

  That uniform orientation is the only reason the polygons are comparable. It is
  why the axes are RETENTION and PUNCTUALITY rather than attrition and lateness:
  an axis where low is good puts a healthy team's web INSIDE an unhealthy one's,
  and an axis measured in hours beside one measured in people produces a shape
  that means nothing at all. Do not add a computed seventh axis on the client
  unless it obeys both properties.

  `retention_rate` is computed off each person's CURRENT posting, so it answers
  "of the people now in this group, how many arrived or left in the window" —
  somebody who transferred OUT is counted in the group they are in now, not the
  one they left. That is the right reading for a per-department scorecard, but it
  is not the same arithmetic as `workforce.attrition_rate` on /summary. Do not put
  the two side by side and expect them to agree.

Rendering:

  * Fixed radial scale 0 to 1. Do not auto-scale to the data — the whole point
    is that two webs from two requests are comparable.
  * Draw the axes in `response.axes` ORDER, always. If one screen draws them in
    a different order from another, the shapes stop being comparable between
    screens.
  * A NULL SCORE IS AN UNMEASURED AXIS, NOT A ZERO. Break the polygon at that
    vertex (most chart libraries do this if you pass null rather than 0) and
    mark the axis label as "no data" in the tooltip. A department that ran no
    payroll is not a department with terrible payroll — plotting it at the
    centre is a false accusation rendered in SVG.
  * `headcount` is the weight behind each shape. Put it in the legend and the
    tooltip: a 3-person department's perfect web is not news.
  * Groups with no key are EXCLUDED, not bucketed, and so are groups nobody is
    in — a ring labelled "no department" drawn against three real departments
    compares a leftover to a team and reads as a fourth team failing at
    everything.
  * Above ~6 rings a radar becomes mud. Keep `limit` at 6 by default and offer a
    ring-toggle legend rather than raising it.

--------------------------------------------------------------------------------
6. GET /user/dashboard/heatmap — THE 7x24 GRID AND THE DAY CALENDAR
--------------------------------------------------------------------------------

Extra query params:
  shape    weekday_hour | calendar   (default weekday_hour)
  metric   check_ins | present_days | late_arrivals | leave_days | overtime_hours
                                     (default check_ins)

Response: `{ as_of, shape, metric, unit, from, to, cells[], max }`, each cell
`{ row, column, value, date }`.

  LABEL THE AXIS FROM `from` / `to`, NOT FROM WHAT YOU REQUESTED. A calendar is
  one cell per day, so a range longer than a year is anchored to its RECENT end;
  an `all_time` calendar would otherwise begin at the epoch and hand you a year of
  empty 1970. The weekday/hour grid is never clamped — it is always 168 cells —
  but it still reports the window it measured.

  shape=weekday_hour   168 cells, always all of them.
                       row    = weekday, "0" = SUNDAY (Postgres `dow`)
                       column = local hour, "0".."23"
                       date   = null
                       This is the shape that shows a shift pattern, a
                       late-running Friday, or an office that really starts at
                       ten. Y axis = weekday, X axis = hour.

  shape=calendar       one cell per day in the window, always every day.
                       row    = the MONDAY of that ISO week, "YYYY-MM-DD"
                       column = weekday, "0" = Sunday
                       date   = the actual day
                       The contribution-graph shape: columns of weeks going
                       across, days going down. Note row is the week and column
                       is the weekday, so for the classic GitHub layout you plot
                       row on the X axis and column on the Y.

Rendering:

  * THE GRID IS ALWAYS COMPLETE, zeroes included. Do not filter them out: a
    heatmap renderer handed a sparse list either leaves holes where a real zero
    belongs or shifts every following cell one place along the axis.
  * Scale the colour ramp with `max`. Use a single-hue sequential ramp (light
    to dark), never a rainbow, and give 0 a distinct near-neutral rather than
    the palest shade of the ramp — "nothing happened" should not look like "a
    little happened".
  * If two heatmaps share a screen and should be compared, scale BOTH to the
    larger of the two `max` values. That is what `max` is for.
  * Hours are already in your requested `timezone`. Read UTC and every Indian
    office looks like it opens at 04:00.
  * `shape=weekday_hour` HONOURS ONLY THE COMPANY FILTER. Branch, department,
    designation, employment_type and grade are ignored on that shape — the hourly
    rollup behind it is keyed by company only, because an hour dimension
    multiplies its rows by 24 and "when does this office start" is a company-level
    question. Grey those controls out when the punch grid is showing, or the user
    will change a filter and watch nothing happen.
  * `metric=leave_days` is CALENDAR-ONLY — it returns 400 on the weekday/hour
    grid, because a leave application has dates and no clock. Disable that
    option in the metric dropdown while `shape=weekday_hour`.

--------------------------------------------------------------------------------
7. GET /user/dashboard/attention — THE WORKLIST
--------------------------------------------------------------------------------

Extra query params:
  limit   1..100 (default 20)
  offset  (default 0)
  signal  narrow to ONE problem
  term    matches employee name or code

Response: `{ items[], total }`. Each item carries the employee, their org
placement, a `signals[]` array, and the figures behind those signals.

The nine signals, with the copy to show and where to link:

  SIGNAL              MEANS                             LINK TO
  ------------------  --------------------------------  ---------------------
  leave_pending       an application sitting >3 days    leave queue
  missing_checkout    past day, check-in, no check-out  attendance register
  contract_expiring   posting renewal within 30 days    employee > service
  document_expiring   passport/licence within 30 days   employee > KYC
  no_wage             no wage row — payroll SKIPS them  employee > wage
  probation_due       joined >6 months, unconfirmed     employee > service
  ticket_overdue      open help-desk ticket >7 days     helpdesk
  no_posting          employed by nobody                employee > service
  incomplete_kyc      bank a/c, PAN or Aadhaar missing  employee > KYC

Rendering:

  * A table, one row per employee, with the signals as CHIPS. `signals` arrives
    in a stable catalog order, so the chips read the same way on every row —
    keep that order, do not re-sort them per row.
  * Rows are already ordered by how MANY things are wrong, then by employee id.
    That ordering is done in SQL, so `total` and the page always agree — page
    normally and do not re-sort client-side, which would break across pages.
  * An employee tripping nothing NEVER appears. `total` is the size of the
    worklist, not of the workforce. Caption it "N records need attention", never
    "N of M employees".
  * Every signal is measured AS OF NOW, not over the window. A contract expiring
    next week is the same problem whether the user is looking at last month or
    this one. So do NOT show the date-range in this card's header, or users will
    expect the list to move when they change it. Do keep the population filters
    (company / department / ...) visible — those DO apply.
  * `no_posting` is the reconciliation signal: those people are excluded from
    every headcount on the screen. Give the count of that signal its own small
    callout on the workforce card ("N employees have no posting") linking here.
  * Empty state matters here. "Nothing needs attention" is a genuine success
    state, not a "no data" state — style it as such.

--------------------------------------------------------------------------------
8. SUGGESTED PAGE LAYOUT
--------------------------------------------------------------------------------

  +--------------------------------------------------------------------------+
  |  FILTER BAR   [date preset v] [companies v] [branch v] [dept v] [more v] |
  |               showing 1 Aug – 30 Aug 2026 · IST                          |
  +--------------------------------------------------------------------------+
  |  KPI  |  KPI  |  KPI  |  KPI  |  KPI  |  KPI          <- /summary        |
  +--------------------------------------------------------------------------+
  |  HEADCOUNT & MOVEMENT (area + columns)     |  WORKFORCE MIX (donut)      |
  |  /series: headcount, joined, exited        |  /breakdown: headcount by   |
  |                                            |  department                 |
  +--------------------------------------------+-----------------------------+
  |  ATTENDANCE TREND (lines)                  |  DEPARTMENT SCORECARD       |
  |  /series: present_days, leave_days,        |  (radar)                    |
  |           late_arrivals                    |  /radar: group_by=department|
  +--------------------------------------------+-----------------------------+
  |  PUNCH PATTERN (heatmap 7x24)              |  LEAVE BY TYPE & STATUS     |
  |  /heatmap: weekday_hour, check_ins         |  /breakdown (comparative)   |
  +--------------------------------------------+-----------------------------+
  |  PAYROLL BY MONTH (columns) /series month  |  COST BY DEPARTMENT (bar)   |
  |  payroll_net, payroll_gross                |  /breakdown: net_pay        |
  +--------------------------------------------+-----------------------------+
  |  NEEDS ATTENTION (table)                                /attention       |
  +--------------------------------------------------------------------------+

  Every panel keeps its own chart-type and measure/dimension selectors where it
  makes sense; the FILTER BAR is shared and drives all of them.

--------------------------------------------------------------------------------
9. LOADING, ERRORS, EMPTY
--------------------------------------------------------------------------------

  * Fire all six in parallel and let each panel resolve independently — skeletons
    per panel, not one page-level spinner. `/summary` is the fast one; make sure
    the tiles paint first.
  * 403 on any of them means the user lacks `dashboard:read`. Since it is one
    code for the whole screen, that is a screen-level empty state ("You do not
    have access to the dashboard"), not six broken panels. Do not render the
    page shell and six errors.
  * 400 comes from exactly two places, and both are client bugs you can prevent:
    an impossible measure/dimension pair, and `leave_days` on the weekday/hour
    grid. The message names the valid options — surface it in the panel rather
    than as a toast.
  * A COMPANY-scoped user with no companies granted gets valid, empty responses
    (zeroes and nulls), not an error. Render the real empty state, and do not
    interpret it as a failure.
  * A brand-new account with no employees also returns zeroes and nulls
    everywhere. Both cases want "no data yet" copy, and both want the null rules
    from section 0 — em-dashes, not zeroes, for the rates.

--------------------------------------------------------------------------------
10. THE NINE MISTAKES THAT ARE EASY TO MAKE HERE
--------------------------------------------------------------------------------

  1. Plotting a null rate or a null radar score as 0. It reads as "scored
     nothing" when the truth is "was not measured".
  2. Labelling `attendance_rate` as a plain attendance percentage. It is over
     ACCOUNTED days. There is no absent figure on this API.
  3. Dividing money by 100. These are rupees; paise belongs to the other
     dashboard.
  4. Dropping `__other__` from a pie, so the wedges no longer sum to `total`.
  5. Rendering `as_of: null` as "no activity" instead of "not yet computed", or
     not showing `as_of` at all and letting users assume the page is live.
  6. Formatting a `bucket` through `new Date()` and shifting the whole axis by a
     day in the browser's zone.
  7. Showing comparison badges under `all_time`, where there is nothing to
     compare against.
  8. Deriving `headcount` from `opening_headcount + net`, or reading `joined` as
     a count of new people. Positions count people, flows count posting events,
     and the two do not close into an identity.
  9. Labelling a calendar heatmap with the range you requested instead of the
     `from` / `to` the response came back with.
