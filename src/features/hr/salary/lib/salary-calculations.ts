import type { SalaryHead, SalaryRegisterRow } from '../types'

/**
 * The little arithmetic the register does for itself.
 *
 * Deliberately little. **The server computes the pay** — from the wage structure
 * in force at the cycle's close, through the same calculation the register
 * previewed with — so re-deriving a gross or a net here would be inventing a
 * second payroll engine that is wrong the moment a statutory rule changes.
 *
 * What's left is the two figures that follow straight from a cell just typed
 * (`wage per day × days`, `rate × hours`) and the footer's column sums. Both are
 * marked on screen as previews of what the save will write, never as the figure.
 */

/** Money rounded the way a rupee figure is stored — two places, no more. */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Earned basic for the days on the row: the daily wage carried over them.
 *
 * The server arrives at the same figure for a whole month, and this is the shape
 * of it — but it, not this, owns the edges: a short month, an extra day beyond
 * the working days, a structure quoted monthly rather than daily. So this stands
 * in only while a typed day count hasn't been saved yet.
 */
export function previewEarnedBasic(wagesPerDay: number, presentDays: number): number {
  if (!wagesPerDay || !presentDays) return 0
  return round(wagesPerDay * presentDays)
}

/** Overtime wage for the hours on the row, at the structure's hourly rate. */
export function previewOtAmount(ratePerHour: number, hours: number): number {
  if (!ratePerHour || !hours) return 0
  return round(ratePerHour * hours)
}

/** Every figure the footer's grand-total row shows, summed down the page. */
export interface SalaryColumnTotals {
  earnedBasic: number
  basicPay: number
  /** Total per allowance / deduction head, keyed by `payComponentId`. */
  allowanceByHead: Map<number, number>
  deductionByHead: Map<number, number>
  totalAllowance: number
  otHours: number
  otAmount: number
  grossPay: number
  employeePf: number
  employeeEsic: number
  employeePt: number
  employeeLwf: number
  employeeTds: number
  totalDeduction: number
  netPay: number
}

function addHeads(into: Map<number, number>, heads: SalaryHead[]) {
  heads.forEach((head) => {
    into.set(head.payComponentId, (into.get(head.payComponentId) ?? 0) + head.amount)
  })
}

/**
 * Sum the page as it stands on the server: stored figures where the month is
 * processed, previewed ones where it isn't.
 *
 * The totals follow the *figures*, not the cells — a row whose day count has
 * been typed but not saved has no server figure to add, so the footer keeps
 * describing what the register currently holds. That's why the grid marks such a
 * row instead: what the footer would come to after the save is exactly what
 * saving is for.
 */
export function salaryColumnTotals(rows: SalaryRegisterRow[]): SalaryColumnTotals {
  const totals: SalaryColumnTotals = {
    earnedBasic: 0,
    basicPay: 0,
    allowanceByHead: new Map(),
    deductionByHead: new Map(),
    totalAllowance: 0,
    otHours: 0,
    otAmount: 0,
    grossPay: 0,
    employeePf: 0,
    employeeEsic: 0,
    employeePt: 0,
    employeeLwf: 0,
    employeeTds: 0,
    totalDeduction: 0,
    netPay: 0,
  }

  rows.forEach(({ figures }) => {
    totals.earnedBasic += figures.earnedBasic
    totals.basicPay += figures.basicPay
    addHeads(totals.allowanceByHead, figures.allowances)
    addHeads(totals.deductionByHead, figures.deductions)
    totals.totalAllowance += figures.totalAllowance
    totals.otHours += figures.otHours
    totals.otAmount += figures.otAmount
    totals.grossPay += figures.grossPay
    totals.employeePf += figures.employeePf
    totals.employeeEsic += figures.employeeEsic
    totals.employeePt += figures.employeePt
    totals.employeeLwf += figures.employeeLwf
    totals.employeeTds += figures.employeeTds
    totals.totalDeduction += figures.totalDeduction
    totals.netPay += figures.netPay
  })

  return totals
}
