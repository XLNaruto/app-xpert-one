import type {
  SalaryRegisterItemResponse,
  SalaryRegisterResponse,
  SalaryRow,
  SalarySaveRow,
} from '../schemas'
import type {
  SalaryAttendance,
  SalaryFigures,
  SalaryHead,
  SalaryPeriod,
  SalaryRegister,
  SalaryRegisterRow,
  SalaryTotals,
  SalaryWageStructure,
} from '../types'

/**
 * The register's boundary — API shape in, screen shape out, and the days the
 * screen sends back.
 *
 * The one decision worth naming lives in `figures()`: the API answers the same
 * money twice, once as `computed` (what *would* be saved) and once as `salary` +
 * `components` (what *was*). Which one a cell should show is a property of the
 * row, not of the cell, so it's settled once here and the grid reads a single
 * block. Pure functions only — no React, per the feature layout.
 */

/** `null` reads as zero: an absent figure and a nil figure both pay nothing. */
function amount(value: number | null | undefined): number {
  return value ?? 0
}

function text(value: string | null | undefined): string {
  return value ?? ''
}

function toPeriod(period: SalaryRegisterResponse['period']): SalaryPeriod {
  return {
    month: period.month,
    year: period.year,
    from: period.from,
    to: period.to,
    cycleStartDay: period.cycle_start_day,
    totalDaysInMonth: period.total_days_in_month,
  }
}

function toTotals(totals: SalaryRegisterResponse['totals']): SalaryTotals {
  return {
    totalEmployees: totals.total_employees,
    salaryDone: totals.salary_done,
    salaryPending: totals.salary_pending,
  }
}

function toAttendance(
  attendance: SalaryRegisterItemResponse['attendance'],
): SalaryAttendance {
  return {
    presentDays: attendance.present_days,
    fullDays: attendance.full_days,
    holidayDays: attendance.holiday_days,
    paidLeaveDays: attendance.paid_leave_days,
    unpaidLeaveDays: attendance.unpaid_leave_days,
    weeklyOffDays: attendance.weekly_off_days,
    payableDays: attendance.payable_days,
    workingDays: attendance.working_days,
  }
}

function toWageStructure(
  wage: SalaryRegisterItemResponse['wage_structure'],
): SalaryWageStructure | null {
  if (!wage) return null
  return {
    id: wage.id,
    designationId: wage.designation_id,
    salaryType: wage.salary_type,
    basicPay: wage.basic_pay,
    wagesPerDay: wage.wages_per_day,
    workingDays: wage.working_days,
    weeklyOff: wage.weekly_off,
    extraDayAmountPerDay: wage.extra_day_amount_per_day,
    isOvertimeApplicable: wage.is_overtime_applicable,
    overtimeRatePerHour: wage.overtime_rate_per_hour,
    isPfActApplicable: wage.is_pf_act_applicable ?? false,
    isEsicActApplicable: wage.is_esic_act_applicable ?? false,
    isPtActApplicable: wage.is_pt_act_applicable ?? false,
    isLwfActApplicable: wage.is_lwf_act_applicable ?? false,
    isTdsActApplicable: wage.is_tds_act_applicable ?? false,
  }
}

/** A head's column heading — its short code, falling back to the full name. */
function headLabel(code: string | null, name: string | null): string {
  return (code ?? '').trim() || (name ?? '').trim() || 'Head'
}

function toHead(head: {
  pay_component_id: number
  pay_component_name: string | null
  pay_component_short_code: string | null
  amount: number
}): SalaryHead {
  return {
    payComponentId: head.pay_component_id,
    code: headLabel(head.pay_component_short_code, head.pay_component_name),
    name: text(head.pay_component_name) || headLabel(head.pay_component_short_code, null),
    amount: head.amount,
  }
}

/**
 * The row's money, from whichever side of the register it belongs to.
 *
 * A processed row reads from `salary` and `components` — the figures that were
 * actually committed, which is what the month is now owed on. A pending row
 * reads from `computed`, the preview of what committing it would write. Falling
 * back the other way round would be worse than showing nothing: a processed row
 * would then quietly display a *fresh* preview as though it were the stored pay.
 */
function toFigures(item: SalaryRegisterItemResponse): SalaryFigures {
  const stored = item.salary
  const computed = item.computed

  /* Stored heads carry their side in `pay_component_type`; the preview keeps the
     two apart in separate arrays already. */
  const storedComponents = item.components ?? []
  const storedSide = (type: 'ALLOWANCE' | 'DEDUCTION') =>
    storedComponents
      .filter((component) => (component.pay_component_type ?? '').toUpperCase() === type)
      .map(toHead)

  const source = stored ?? computed

  return {
    basicPay: amount(source?.basic_pay),
    wagesPerDay: amount(source?.wages_per_day),
    earnedBasic: amount(source?.basic_pay_for_present_days),
    allowances: stored ? storedSide('ALLOWANCE') : (computed?.allowances ?? []).map(toHead),
    deductions: stored ? storedSide('DEDUCTION') : (computed?.deductions ?? []).map(toHead),
    totalAllowance: amount(source?.total_allowance),
    totalDeduction: amount(source?.total_deduction),
    grossPay: amount(source?.gross_pay),
    netPay: amount(source?.net_pay),
    employeePf: amount(source?.employee_pf),
    employerPf: amount(source?.employer_pf),
    employeeEsic: amount(source?.employee_esic),
    employerEsic: amount(source?.employer_esic),
    employeePt: amount(source?.employee_pt),
    employeeLwf: amount(source?.employee_lwf),
    employeeTds: amount(source?.employee_tds),
    extraDays: amount(source?.extra_days),
    extraDaysAmount: amount(source?.extra_days_amount),
    otHours: amount(source?.ot_hours),
    /* The rate is the wage structure's; a stored month keeps its own copy of the
       one it was paid at, which is the one worth showing on a processed row. */
    otRate: amount(stored?.overtime_rate_per_hour ?? item.wage_structure?.overtime_rate_per_hour),
    otAmount: amount(source?.ot_amount),
  }
}

/** One API row as the grid reads it. */
export function toSalaryRegisterRow(item: SalaryRegisterItemResponse): SalaryRegisterRow {
  return {
    employeeId: item.employee_id,
    employeeServiceId: item.employee_service_id,
    employeeCode: text(item.employee_code),
    employeeName: text(item.employee_name),
    employeePrefix: text(item.employee_prefix),
    photo: text(item.photo),
    designationId: item.designation_id,
    designationName: text(item.designation_name),
    departmentId: item.department_id,
    departmentName: text(item.department_name),
    joiningDate: text(item.joining_date),
    leavingDate: text(item.leaving_date),
    status: item.status,
    attendance: toAttendance(item.attendance),
    wageStructure: toWageStructure(item.wage_structure),
    figures: toFigures(item),
    storedPresentDays: item.salary?.present_days ?? null,
    storedWorkingDays: item.salary?.working_days ?? null,
    isProcessed: item.salary !== null,
    salaryId: item.salary?.id ?? null,
    isPaid: item.salary?.is_paid ?? false,
    paymentDate: text(item.salary?.payment_date),
    isImported: item.salary?.is_import_from_sheet ?? false,
  }
}

/** The whole register read. */
export function toSalaryRegister(response: SalaryRegisterResponse): SalaryRegister {
  return {
    period: toPeriod(response.period),
    totals: toTotals(response.totals),
    items: response.items.map(toSalaryRegisterRow),
    total: response.total,
  }
}

/* ── Columns ────────────────────────────────────────────────────────────── */

/** A head as a *column*: which head it is and how to head the column. */
export type SalaryHeadColumn = Omit<SalaryHead, 'amount'>

/**
 * The allowance and deduction columns the grid lays out — the heads carried by
 * the rows on screen, each once.
 *
 * Taken from the rows rather than from the allowance / deduction master: the
 * screen is read one designation at a time, and what it has to show is that
 * designation's heads, not every head the company has ever defined. A master of
 * thirty heads would otherwise open twenty-six empty columns on a row that
 * carries four.
 *
 * Ordered by `payComponentId` — creation order — so a head added later lands at
 * the right-hand end instead of shifting the columns already on the grid, and so
 * the pending and processed tabs agree on the order.
 */
export function salaryHeadColumns(rows: SalaryRegisterRow[]): {
  allowances: SalaryHeadColumn[]
  deductions: SalaryHeadColumn[]
} {
  const allowances = new Map<number, SalaryHeadColumn>()
  const deductions = new Map<number, SalaryHeadColumn>()

  const collect = (into: Map<number, SalaryHeadColumn>, heads: SalaryHead[]) => {
    heads.forEach(({ payComponentId, code, name }) => {
      if (!into.has(payComponentId)) into.set(payComponentId, { payComponentId, code, name })
    })
  }

  rows.forEach((row) => {
    collect(allowances, row.figures.allowances)
    collect(deductions, row.figures.deductions)
  })

  const byId = (a: SalaryHeadColumn, b: SalaryHeadColumn) =>
    a.payComponentId - b.payComponentId

  return {
    allowances: [...allowances.values()].sort(byId),
    deductions: [...deductions.values()].sort(byId),
  }
}

/** A row's heads by id, so a cell is a lookup rather than a scan per column. */
export function headAmounts(heads: SalaryHead[]): Map<number, number> {
  return new Map(heads.map((head) => [head.payComponentId, head.amount]))
}

/* ── Form ───────────────────────────────────────────────────────────────── */

/** A number as a grid cell holds it; `null`/`0`-less values read as blank. */
function cell(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

/**
 * The three editable cells a row opens on.
 *
 * A processed row opens on what was *stored* — that's what the month was paid
 * on, and it's what a revision starts from. A pending row opens on the
 * attendance's `payable_days`, which is what the server would use anyway: the
 * cell states the default rather than leaving it to be guessed at, so anyone
 * paying a different number of days can see what they're changing it from.
 *
 * `workingDays` and `otHours` are left blank when there's nothing stored — both
 * are overrides, and blank means "as the wage structure and attendance say".
 */
export function toSalaryRow(row: SalaryRegisterRow): SalaryRow {
  return {
    employeeServiceId: row.employeeServiceId,
    employeeName: row.employeeName,
    presentDays: cell(
      row.isProcessed ? row.storedPresentDays : row.attendance.payableDays,
    ),
    workingDays: cell(row.storedWorkingDays),
    otHours: row.figures.otHours ? cell(row.figures.otHours) : '',
  }
}

/**
 * One row of the save body. Blank overrides are dropped rather than sent as
 * zero — `working_days: 0` is not "as the structure says", and a `0` OT rate
 * would read as an override to no overtime rather than as none given.
 */
export function salaryRowToPayload(row: SalaryRow): SalarySaveRow {
  const workingDays = row.workingDays.trim()
  const otHours = row.otHours.trim()

  return {
    employee_service_id: row.employeeServiceId,
    present_days: Number(row.presentDays),
    ...(workingDays ? { working_days: Number(workingDays) } : {}),
    ...(otHours ? { ot_hours: Number(otHours) } : {}),
  }
}
