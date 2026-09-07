import { z } from 'zod'

/**
 * Wire schemas for the six `/user/dashboard/*` reads.
 *
 * Two decisions run through all of them:
 *
 * 1. **A nullable number stays nullable.** Every `*_rate`, `share`, `change_pct`,
 *    `average_*` and radar score is null when its denominator was zero, and
 *    "nobody was present" is a different statement from "nobody present was on
 *    time". Nothing here defaults a null to 0 — the panels render an em-dash and
 *    break the line instead.
 * 2. **A `bucket`, a heatmap `row`/`column`/`date` and the resolved `from`/`to`
 *    stay strings.** The calendar dates are already correct in the requested
 *    timezone; parsing one into a `Date` and formatting it in the browser's zone
 *    shifts a Monday's punches onto Sunday.
 *
 * Enums are `z.enum` rather than `z.string` so a value the client has no chart
 * shape for surfaces here rather than three components later.
 */

/** A rate/share/delta: a fraction, or null because it wasn't measurable. */
const ratio = z.number().nullable()

// ─── /summary ──────────────────────────────────────────────────────────────

const workforceSummarySchema = z.object({
  headcount: z.number(),
  opening_headcount: z.number(),
  joined: z.number(),
  exited: z.number(),
  net: z.number(),
  previous_joined: z.number(),
  previous_exited: z.number(),
  previous_net: z.number(),
  change_pct: ratio,
  attrition_rate: ratio,
  confirmed: z.number(),
  on_probation: z.number(),
})

const attendanceSummarySchema = z.object({
  present_days: z.number(),
  half_days: z.number(),
  leave_days: z.number(),
  accounted_days: z.number(),
  late_arrivals: z.number(),
  early_exits: z.number(),
  worked_hours: z.number(),
  overtime_hours: z.number(),
  attendance_rate: ratio,
  punctuality_rate: ratio,
  average_worked_hours: ratio,
  previous_present_days: z.number(),
  change_pct: ratio,
})

const leaveSummarySchema = z.object({
  applications: z.number(),
  pending: z.number(),
  approved: z.number(),
  rejected: z.number(),
  approved_days: z.number(),
  paid_days: z.number(),
  unpaid_days: z.number(),
  approval_rate: ratio,
  average_decision_hours: ratio,
  pending_overdue: z.number(),
  previous_applications: z.number(),
  change_pct: ratio,
})

const payrollSummarySchema = z.object({
  employees_processed: z.number(),
  sheets: z.number(),
  gross_pay: z.number(),
  net_pay: z.number(),
  total_deduction: z.number(),
  total_allowance: z.number(),
  employee_pf: z.number(),
  employer_pf: z.number(),
  employee_esic: z.number(),
  employer_esic: z.number(),
  overtime_amount: z.number(),
  bonus_amount: z.number(),
  paid_rate: ratio,
  average_net_pay: ratio,
  previous_net_pay: z.number(),
  change_pct: ratio,
})

const helpdeskSummarySchema = z.object({
  raised: z.number(),
  resolved: z.number(),
  open: z.number(),
  unassigned: z.number(),
  average_resolution_hours: ratio,
  average_first_response_hours: ratio,
  resolution_rate: ratio,
  previous_raised: z.number(),
  change_pct: ratio,
})

export const summaryResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  workforce: workforceSummarySchema,
  attendance: attendanceSummarySchema,
  leave: leaveSummarySchema,
  payroll: payrollSummarySchema,
  helpdesk: helpdeskSummarySchema,
})

// ─── /series ───────────────────────────────────────────────────────────────

export const seriesMetricSchema = z.enum([
  'headcount',
  'joined',
  'exited',
  'present_days',
  'late_arrivals',
  'worked_hours',
  'overtime_hours',
  'leave_applications',
  'leave_days',
  'payroll_net',
  'payroll_gross',
  'tickets_raised',
  'tickets_resolved',
])

export const metricUnitSchema = z.enum(['count', 'hours', 'days', 'amount'])

export const granularitySchema = z.enum(['day', 'week', 'month'])

export const seriesResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  granularity: granularitySchema,
  timezone: z.string(),
  series: z.array(
    z.object({
      metric: seriesMetricSchema,
      unit: metricUnitSchema,
      baseline: z.number(),
      points: z.array(
        z.object({
          bucket: z.string(),
          value: z.number(),
          cumulative: z.number(),
        }),
      ),
    }),
  ),
})

// ─── /breakdown ────────────────────────────────────────────────────────────

export const breakdownMeasureSchema = z.enum([
  'headcount',
  'present_days',
  'worked_hours',
  'overtime_hours',
  'late_arrivals',
  'leave_applications',
  'leave_days',
  'net_pay',
  'gross_pay',
  'total_deduction',
  'tickets',
])

export const breakdownDimensionSchema = z.enum([
  'company',
  'branch',
  'department',
  'designation',
  'gender',
  'employment_type',
  'grade',
  'marital_status',
  'age_band',
  'tenure_band',
  'leave_type',
  'leave_status',
  'leave_pay_type',
  'leave_duration',
  'attendance_status',
  'ticket_status',
  'ticket_category',
  'ticket_priority',
])

export const breakdownResponseSchema = z.object({
  measure: breakdownMeasureSchema,
  dimension: breakdownDimensionSchema,
  unit: metricUnitSchema,
  total: z.number(),
  previous_total: z.number(),
  items: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.number(),
      share: ratio,
      previous_value: z.number(),
      change_pct: ratio,
    }),
  ),
})

// ─── /radar ────────────────────────────────────────────────────────────────

export const radarAxisSchema = z.enum([
  'attendance_rate',
  'punctuality_rate',
  'retention_rate',
  'leave_approval_rate',
  'payroll_paid_rate',
  'helpdesk_resolution_rate',
])

export const radarGroupBySchema = z.enum(['company', 'branch', 'department', 'designation'])

export const radarResponseSchema = z.object({
  group_by: radarGroupBySchema,
  axes: z.array(radarAxisSchema),
  groups: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      headcount: z.number(),
      /**
       * Keyed by axis, and every key nullable. Read as a partial record so a
       * group missing an axis the response declared reads as "not measured"
       * (an em-dash and a broken vertex) rather than throwing.
       */
      scores: z.partialRecord(radarAxisSchema, ratio),
    }),
  ),
})

// ─── /heatmap ──────────────────────────────────────────────────────────────

export const heatmapShapeSchema = z.enum(['weekday_hour', 'calendar'])

export const heatmapMetricSchema = z.enum([
  'check_ins',
  'present_days',
  'late_arrivals',
  'leave_days',
  'overtime_hours',
])

export const heatmapResponseSchema = z.object({
  shape: heatmapShapeSchema,
  metric: heatmapMetricSchema,
  unit: metricUnitSchema,
  from: z.string(),
  to: z.string(),
  cells: z.array(
    z.object({
      row: z.string(),
      column: z.string(),
      value: z.number(),
      date: z.string().nullable(),
    }),
  ),
  max: z.number(),
})

// ─── /attention ────────────────────────────────────────────────────────────

export const attentionSignalSchema = z.enum([
  'leave_pending',
  'missing_checkout',
  'contract_expiring',
  'document_expiring',
  'no_wage',
  'probation_due',
  'ticket_overdue',
  'no_posting',
  'incomplete_kyc',
])

export const attentionResponseSchema = z.object({
  items: z.array(
    z.object({
      employee_id: z.number(),
      employee_name: z.string().nullable(),
      employee_code: z.string().nullable(),
      company_id: z.number(),
      company_name: z.string().nullable(),
      branch_name: z.string().nullable(),
      department_name: z.string().nullable(),
      designation_name: z.string().nullable(),
      signals: z.array(attentionSignalSchema),
      pending_leaves: z.number(),
      missing_checkouts: z.number(),
      open_tickets: z.number(),
      contract_ends_on: z.string().nullable(),
      document_expires_on: z.string().nullable(),
      joining_date: z.string().nullable(),
    }),
  ),
  total: z.number(),
})

export type SummaryResponse = z.infer<typeof summaryResponseSchema>
export type SeriesResponse = z.infer<typeof seriesResponseSchema>
export type BreakdownResponse = z.infer<typeof breakdownResponseSchema>
export type RadarResponse = z.infer<typeof radarResponseSchema>
export type HeatmapResponse = z.infer<typeof heatmapResponseSchema>
export type AttentionResponse = z.infer<typeof attentionResponseSchema>
