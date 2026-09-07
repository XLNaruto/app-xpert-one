import type {
  AttentionResponse,
  BreakdownResponse,
  HeatmapResponse,
  RadarResponse,
  SeriesResponse,
  SummaryResponse,
} from '../schemas'
import type {
  DashboardAttention,
  DashboardBreakdown,
  DashboardHeatmap,
  DashboardRadar,
  DashboardSeries,
  DashboardSummary,
} from '../types'

/**
 * Wire → UI. Snake case becomes camel case and NOTHING ELSE happens.
 *
 * In particular no null is coalesced to a zero, no ratio is multiplied by 100,
 * no money is divided by 100 and no calendar string is parsed into a `Date`.
 * Each of those would be a lie introduced in a layer nobody looks at; they are
 * all decisions the formatters and the charts make explicitly.
 */

export function toSummary(raw: SummaryResponse): DashboardSummary {
  return {
    from: raw.from,
    to: raw.to,
    workforce: {
      headcount: raw.workforce.headcount,
      openingHeadcount: raw.workforce.opening_headcount,
      joined: raw.workforce.joined,
      exited: raw.workforce.exited,
      net: raw.workforce.net,
      previousJoined: raw.workforce.previous_joined,
      previousExited: raw.workforce.previous_exited,
      previousNet: raw.workforce.previous_net,
      changePct: raw.workforce.change_pct,
      attritionRate: raw.workforce.attrition_rate,
      confirmed: raw.workforce.confirmed,
      onProbation: raw.workforce.on_probation,
    },
    attendance: {
      presentDays: raw.attendance.present_days,
      halfDays: raw.attendance.half_days,
      leaveDays: raw.attendance.leave_days,
      accountedDays: raw.attendance.accounted_days,
      lateArrivals: raw.attendance.late_arrivals,
      earlyExits: raw.attendance.early_exits,
      workedHours: raw.attendance.worked_hours,
      overtimeHours: raw.attendance.overtime_hours,
      attendanceRate: raw.attendance.attendance_rate,
      punctualityRate: raw.attendance.punctuality_rate,
      averageWorkedHours: raw.attendance.average_worked_hours,
      previousPresentDays: raw.attendance.previous_present_days,
      changePct: raw.attendance.change_pct,
    },
    leave: {
      applications: raw.leave.applications,
      pending: raw.leave.pending,
      approved: raw.leave.approved,
      rejected: raw.leave.rejected,
      approvedDays: raw.leave.approved_days,
      paidDays: raw.leave.paid_days,
      unpaidDays: raw.leave.unpaid_days,
      approvalRate: raw.leave.approval_rate,
      averageDecisionHours: raw.leave.average_decision_hours,
      pendingOverdue: raw.leave.pending_overdue,
      previousApplications: raw.leave.previous_applications,
      changePct: raw.leave.change_pct,
    },
    payroll: {
      employeesProcessed: raw.payroll.employees_processed,
      sheets: raw.payroll.sheets,
      grossPay: raw.payroll.gross_pay,
      netPay: raw.payroll.net_pay,
      totalDeduction: raw.payroll.total_deduction,
      totalAllowance: raw.payroll.total_allowance,
      employeePf: raw.payroll.employee_pf,
      employerPf: raw.payroll.employer_pf,
      employeeEsic: raw.payroll.employee_esic,
      employerEsic: raw.payroll.employer_esic,
      overtimeAmount: raw.payroll.overtime_amount,
      bonusAmount: raw.payroll.bonus_amount,
      paidRate: raw.payroll.paid_rate,
      averageNetPay: raw.payroll.average_net_pay,
      previousNetPay: raw.payroll.previous_net_pay,
      changePct: raw.payroll.change_pct,
    },
    helpdesk: {
      raised: raw.helpdesk.raised,
      resolved: raw.helpdesk.resolved,
      open: raw.helpdesk.open,
      unassigned: raw.helpdesk.unassigned,
      averageResolutionHours: raw.helpdesk.average_resolution_hours,
      averageFirstResponseHours: raw.helpdesk.average_first_response_hours,
      resolutionRate: raw.helpdesk.resolution_rate,
      previousRaised: raw.helpdesk.previous_raised,
      changePct: raw.helpdesk.change_pct,
    },
  }
}

export function toSeries(raw: SeriesResponse): DashboardSeries {
  return {
    from: raw.from,
    to: raw.to,
    granularity: raw.granularity,
    timezone: raw.timezone,
    series: raw.series.map((entry) => ({
      metric: entry.metric,
      unit: entry.unit,
      baseline: entry.baseline,
      // Every bucket is present, quiet ones as `value: 0` — and the zeroes are
      // NOT filtered out here. Dropping them is exactly what makes a line chart
      // interpolate across an empty week and draw a trend that never happened.
      points: entry.points.map((point) => ({
        bucket: point.bucket,
        value: point.value,
        cumulative: point.cumulative,
      })),
    })),
  }
}

export function toBreakdown(raw: BreakdownResponse): DashboardBreakdown {
  return {
    measure: raw.measure,
    dimension: raw.dimension,
    unit: raw.unit,
    total: raw.total,
    previousTotal: raw.previous_total,
    items: raw.items.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      share: item.share,
      previousValue: item.previous_value,
      changePct: item.change_pct,
    })),
  }
}

export function toRadar(raw: RadarResponse): DashboardRadar {
  return {
    groupBy: raw.group_by,
    // Kept in the response's own order. If one screen drew the axes in a
    // different order from another, the shapes would stop being comparable
    // between screens, which is the whole point of a fixed axis list.
    axes: [...raw.axes],
    groups: raw.groups.map((group) => ({
      key: group.key,
      label: group.label,
      headcount: group.headcount,
      scores: { ...group.scores },
    })),
  }
}

export function toHeatmap(raw: HeatmapResponse): DashboardHeatmap {
  return {
    shape: raw.shape,
    metric: raw.metric,
    unit: raw.unit,
    from: raw.from,
    to: raw.to,
    // The complete grid, zeroes included — a renderer handed a sparse list
    // either leaves holes where a real zero belongs or shifts every following
    // cell one place along the axis.
    cells: raw.cells.map((cell) => ({
      row: cell.row,
      column: cell.column,
      value: cell.value,
      date: cell.date,
    })),
    max: raw.max,
  }
}

export function toAttention(raw: AttentionResponse): DashboardAttention {
  return {
    // Rows arrive ordered by how MANY things are wrong, then by employee id —
    // done in SQL, so `total` and the page always agree. Never re-sorted here:
    // a client-side sort would only reorder the page in hand and break the
    // ordering across pages.
    items: raw.items.map((item) => ({
      employeeId: item.employee_id,
      employeeName: item.employee_name,
      employeeCode: item.employee_code,
      companyId: item.company_id,
      companyName: item.company_name,
      branchName: item.branch_name,
      departmentName: item.department_name,
      designationName: item.designation_name,
      // Stable catalog order — kept, so the chips read the same way on every row.
      signals: [...item.signals],
      pendingLeaves: item.pending_leaves,
      missingCheckouts: item.missing_checkouts,
      openTickets: item.open_tickets,
      contractEndsOn: item.contract_ends_on,
      documentExpiresOn: item.document_expires_on,
      joiningDate: item.joining_date,
    })),
    total: raw.total,
  }
}
