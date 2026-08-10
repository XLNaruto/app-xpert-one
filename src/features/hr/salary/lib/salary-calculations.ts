import type {
  SalaryHead,
  SalaryHeadConfigs,
  SalaryRates,
  SalaryRegisterRow,
} from '../types'
import type { SalaryRow } from '../schemas'
import { statutoryFor } from './salary-statutory'

/**
 * The register's arithmetic — what a row comes to for the days and the amounts
 * currently in its cells.
 *
 * This used to be almost nothing, because the server priced the month and the
 * screen sent days. Neither endpoint works that way now: `GET /salary/register`
 * hands over the inputs — attendance, wage structure, head configuration and the
 * statutory rate masters — and `POST /salary/bulk-save` takes back the finished
 * figures and stores each as sent, precisely so that payroll can override one at
 * salary time. So **the client decides the pay**, and the joining-up happens
 * here, once, as pure functions the grid, the footer and the save all read.
 *
 * Typing a present-days figure therefore moves the whole row:
 *
 * - **The earned basic** is the daily wage over those days.
 * - **A percentage head earns on the earned basic.** Configured at 10%, it is 10%
 *   of what the present days actually earn, so a short month shrinks it along
 *   with the basic. A fixed head is a rupee amount and doesn't move.
 * - **PF, ESIC, PT and LWF follow from there**, off the wage structure's act
 *   settings and the period's rate masters — see `salary-statutory`. A short
 *   month deducts less PF because the wage PF is charged on is smaller.
 * - **A cell typed over is pinned.** Double-clicking a cell and entering a figure
 *   makes that figure the amount for this row, whatever the days do afterwards.
 *   That is what `overridden` records, and it applies to a statutory cell exactly
 *   as it does to a head — a month where an act was deducted differently is the
 *   case "every figure is stored as sent" exists for.
 */

/** Money rounded the way a rupee figure is stored — two places, no more. */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** A grid cell's string as a number; blank, absent or malformed reads as 0. */
export function cellNumber(value: string | null | undefined): number {
  const parsed = Number((value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

/* ── What a day count is allowed to be ──────────────────────────────────── */

/** The API's own ceiling on `present_days` — no month is longer than this. */
export const PRESENT_DAYS_LIMIT = 31

/**
 * Why a present-days figure can't be paid, or `null` when it can.
 *
 * The real bound is the row's **working days**, not the calendar: working days is
 * what the month's pay is spread over — off the wage structure, or off the
 * attendance where the structure calculates them — so paying 27 days against a
 * 26-day month earns a day the month doesn't contain. Nothing downstream catches
 * it either: the client decides the pay now, so an over-long month is simply
 * saved, and `bulk-save` verifies that a row adds up rather than whether its days
 * are possible. This screen is the only thing between the two.
 *
 * One function so the form schema and the cell can't drift — the message the save
 * refuses with is the message the cell was already showing.
 *
 * Extra days are deliberately not the way through. The register carries
 * `extra_days` as a figure of its own, so days beyond the month are a correction
 * to make there rather than something to wave past here.
 */
export function presentDaysProblem(
  presentDays: string,
  workingDays: string,
): string | null {
  const value = (presentDays ?? '').trim()
  if (value === '') return 'Present days is required'
  if (Number.isNaN(Number(value))) return 'Present days must be a number'

  const days = Number(value)
  if (days < 0) return 'Present days cannot be negative'
  if (days > PRESENT_DAYS_LIMIT) {
    return `Present days cannot be more than ${PRESENT_DAYS_LIMIT}`
  }

  /* No working days means the row has none to check against — a posting with no
     structure in force — and the calendar bound above is then the only one. */
  const limit = Number((workingDays ?? '').trim())
  if (!Number.isFinite(limit) || limit <= 0) return null
  if (days > limit) {
    return `Present days cannot be more than the ${formatDays(limit)} working days`
  }

  return null
}

/** A day count as a message prints it — `26`, not `26.00`. */
function formatDays(value: number): string {
  return Number.isInteger(value) ? String(value) : String(round(value))
}

/**
 * The days a row opens on: what a processed month was stored at, and the
 * attendance's payable days while it is still pending. The seed is worth naming
 * because it is also the comparison — a row is only recalculated once its present
 * days differ from the ones its figures were computed for.
 */
export function seedPresentDays(row: SalaryRegisterRow): number {
  return row.isProcessed ? (row.storedPresentDays ?? 0) : row.attendance.payableDays
}

/**
 * Whether a row's figures are the screen's to work out.
 *
 * A **pending** row always is, edited or not. Nothing has been committed for it
 * and the register no longer offers a preview — it answers the configuration and
 * the rates, and this screen is what turns those into money. So there is nothing
 * else a pending row could show. The screen computes it, shows it, and saves the
 * number it showed.
 *
 * A **processed** row is not, until it is edited. That row's figures are a salary
 * that was actually stored; recomputing it would redraw a committed month behind
 * the person looking at it. Typing into it is the explicit ask to re-price it,
 * and only then does it follow the cells.
 */
export function liveRow(row: SalaryRegisterRow, isDirty: boolean): boolean {
  return isDirty || !row.isProcessed
}

/** Earned basic for the days on the row: the daily wage carried over them. */
export function earnedBasicFor(wagesPerDay: number, presentDays: number): number {
  if (!wagesPerDay || !presentDays) return 0
  return round(wagesPerDay * presentDays)
}

/** Overtime wage for the hours on the row, at the structure's hourly rate. */
export function otAmountFor(ratePerHour: number, hours: number): number {
  if (!ratePerHour || !hours) return 0
  return round(ratePerHour * hours)
}

/**
 * One head's amount, by the rule its configuration puts it under.
 *
 * Three answers, in the order they win:
 *
 * - **Typed over.** `overridden` is what a double-click and a figure leave
 *   behind, and it beats the configuration outright — that is the whole point of
 *   being allowed to type it.
 * - **Fixed.** The configuration's own `value` *is* the money — the register
 *   documents `salary_components.amount` as read through `amount_type`, so a
 *   `Fixed` head carries rupees there and a `Percentage` head carries a percent.
 *   It is a flat monthly figure and the present days do not touch it: a head
 *   configured at ₹2,600 is ₹2,600 whether the month ran 26 days or 12.
 * - **Percentage.** A share of the earned basic, so it moves with the days.
 *
 * The cell is only consulted for an override, or for a head the designation
 * doesn't configure at all — which since the register stopped previewing the pay
 * is the one case where the cell is the only thing that knows the amount.
 */
export function headCellAmount(
  cell: { amount: string; overridden: boolean },
  config: { valueType: string; value: number } | undefined,
  earnedBasic: number,
): number {
  if (cell.overridden) return cellNumber(cell.amount)
  if (!config) return cellNumber(cell.amount)
  if (config.valueType === 'Percentage') return round((earnedBasic * config.value) / 100)
  return round(config.value)
}

/** Every figure a row comes to — what the grid prints and the save sends. */
export interface SalaryRowFigures {
  presentDays: number
  workingDays: number
  wagesPerDay: number
  basicPay: number
  earnedBasic: number
  allowances: SalaryHead[]
  deductions: SalaryHead[]
  totalAllowance: number
  otHours: number
  otRate: number
  otAmount: number
  extraDays: number
  extraDaysAmount: number
  grossPay: number
  employeePf: number
  employerPf: number
  employeeEsic: number
  employerEsic: number
  employeePt: number
  employeeLwf: number
  employeeTds: number
  /** The ESIC percentages the figures were taken at — stored per salary row. */
  employeeEsicRate: number
  employerEsicRate: number
  employerLwf: number
  totalDeduction: number
  netPay: number
  /**
   * Statutory deductions that no head on the row stands for, as their own
   * breakdown lines — see the note below. Empty when the register already
   * reports them as heads, or when the pay-component master has no head to
   * name them by.
   */
  statutoryLines: SalaryHead[]
}

/**
 * The statutory deductions, and the short codes the API routes them by.
 *
 * `bulk-save` verifies `total_deduction` against the breakdown lines sent with
 * it, so a statutory figure in the total and not in the lines fails the row —
 * counting each one exactly once is the thing to get right.
 *
 * Hence `statutoryLines`: a statutory figure becomes its own deduction line
 * unless a head already stands for it, and the total is then simply the sum of
 * the lines. Whichever way the company's catalog names them, the row adds up.
 */
const STATUTORY: { code: string; of: (row: SalaryRowFigures) => number }[] = [
  { code: 'PF', of: (row) => row.employeePf },
  { code: 'ESIC', of: (row) => row.employeeEsic },
  { code: 'PT', of: (row) => row.employeePt },
  { code: 'LWF', of: (row) => row.employeeLwf },
]

/**
 * A statutory cell as it stands: the figure typed into it, or the one the act
 * comes to for this row.
 *
 * The order matters and is the same one the heads follow. A cell double-clicked
 * and typed into is **pinned** — that is the month payroll deducted something
 * else, and re-deriving it would throw the override away on the next keystroke.
 * Everything else follows the wage structure and the rates.
 */
function statutoryAmount(
  cell: { amount: string; overridden: boolean } | undefined,
  computed: number,
): number {
  if (cell?.overridden) return cellNumber(cell.amount)
  return computed
}

/** The catalog ids the statutory codes resolve to, so a line can name its head. */
export type StatutoryComponentIds = Map<string, number>

/** Every short code a statutory deduction is known by in the pay-component master. */
export const STATUTORY_ALIASES: Record<string, string[]> = {
  PF: ['PF', 'EPF', 'PROVIDENT FUND'],
  ESIC: ['ESIC', 'ESI'],
  PT: ['PT', 'PTAX', 'PROFESSIONAL TAX'],
  LWF: ['LWF', 'LABOUR WELFARE FUND'],
}

/**
 * The row as it currently stands.
 *
 * `live` is the switch between the two things this screen has to be at once, and
 * `liveRow` below is the one place that decides it. A **stored** month is left
 * exactly as the register answered it — re-deriving a salary that was already
 * committed would quietly redraw it on screen — while everything else is computed
 * from the cells, because that is what the save is about to write.
 */
export function rowFigures(
  row: SalaryRegisterRow,
  values: SalaryRow | undefined,
  configs: SalaryHeadConfigs,
  statutoryIds: StatutoryComponentIds,
  live: boolean,
  rates: SalaryRates,
  periodMonth: number,
): SalaryRowFigures {
  const { figures, wageStructure, attendance } = row

  const asRegistered: SalaryRowFigures = {
    presentDays: seedPresentDays(row),
    workingDays: row.storedWorkingDays ?? wageStructure?.workingDays ?? attendance.workingDays,
    wagesPerDay: figures.wagesPerDay,
    basicPay: figures.basicPay,
    earnedBasic: figures.earnedBasic,
    allowances: figures.allowances,
    deductions: figures.deductions,
    totalAllowance: figures.totalAllowance,
    otHours: figures.otHours,
    otRate: figures.otRate,
    otAmount: figures.otAmount,
    extraDays: figures.extraDays,
    extraDaysAmount: figures.extraDaysAmount,
    grossPay: figures.grossPay,
    employeePf: figures.employeePf,
    employerPf: figures.employerPf,
    employeeEsic: figures.employeeEsic,
    employerEsic: figures.employerEsic,
    employeePt: figures.employeePt,
    employeeLwf: figures.employeeLwf,
    employeeTds: figures.employeeTds,
    employeeEsicRate: row.storedActs?.employeeEsicPercentage ?? 0,
    employerEsicRate: row.storedActs?.employerEsicPercentage ?? 0,
    employerLwf: 0,
    totalDeduction: figures.totalDeduction,
    netPay: figures.netPay,
    statutoryLines: [],
  }

  if (!live || !values) return asRegistered

  const presentDays = cellNumber(values.presentDays)
  const earnedBasic = earnedBasicFor(figures.wagesPerDay, presentDays)

  /* The heads, each by its own rule. The cells are aligned with the grid's head
     columns, so a head keeps its identity from `payComponentId` rather than from
     where it happens to sit. */
  const applyHeads = (
    cells: SalaryRow['allowances'],
    registered: SalaryHead[],
  ): SalaryHead[] =>
    cells.map((cell) => {
      const head = registered.find((one) => one.payComponentId === cell.payComponentId)
      const config = configs.get(cell.payComponentId)
      return {
        payComponentId: cell.payComponentId,
        code: head?.code ?? '',
        name: head?.name ?? '',
        pfApplicable: config?.pfApplicable ?? head?.pfApplicable ?? false,
        esicApplicable: config?.esicApplicable ?? head?.esicApplicable ?? false,
        ptApplicable: config?.ptApplicable ?? head?.ptApplicable ?? false,
        amount: headCellAmount(cell, config, earnedBasic),
      }
    })

  const allowances = applyHeads(values.allowances, figures.allowances)
  const deductions = applyHeads(values.deductions, figures.deductions)

  const totalAllowance = round(
    allowances.reduce((sum, head) => sum + head.amount, 0),
  )
  const otAmount = otAmountFor(figures.otRate, cellNumber(values.otHours))
  const grossPay = round(
    earnedBasic + totalAllowance + otAmount + figures.extraDaysAmount,
  )

  /* The acts, off this row's wage structure and the period's rate masters. Each
     is charged on the heads that opt into it, so the present days reach PF and
     ESIC the same way they reach a percentage allowance. A cell typed over keeps
     its figure — that override is the whole reason the cells are editable. */
  const acts = statutoryFor({
    earnedBasic,
    allowances,
    grossPay,
    wage: wageStructure,
    rates,
    periodMonth,
  })

  const statutory = {
    ...asRegistered,
    employeePf: statutoryAmount(values.statutory?.pf, acts.employeePf),
    employerPf: acts.employerPf,
    employeeEsic: statutoryAmount(values.statutory?.esic, acts.employeeEsic),
    employerEsic: acts.employerEsic,
    employeePt: statutoryAmount(values.statutory?.pt, acts.employeePt),
    employeeLwf: statutoryAmount(values.statutory?.lwf, acts.employeeLwf),
    employeeTds: statutoryAmount(values.statutory?.tds, acts.employeeTds),
    employeeEsicRate: acts.employeeEsicRate,
    employerEsicRate: acts.employerEsicRate,
    employerLwf: acts.employerLwf,
  }

  const statutoryLines: SalaryHead[] = []
  STATUTORY.forEach(({ code, of }) => {
    const amount = of(statutory)
    if (!amount) return
    if (deductions.some((head) => head.code.trim().toUpperCase() === code)) return
    const payComponentId = statutoryIds.get(code)
    if (payComponentId === undefined) return
    statutoryLines.push({
      payComponentId,
      code,
      name: code,
      amount,
      pfApplicable: false,
      esicApplicable: false,
      ptApplicable: false,
    })
  })

  /* The total is the lines and nothing else, which is what `bulk-save` checks it
     against. TDS is the exception the API models as a column of its own. */
  const totalDeduction = round(
    deductions.reduce((sum, head) => sum + head.amount, 0) +
      statutoryLines.reduce((sum, head) => sum + head.amount, 0) +
      statutory.employeeTds,
  )

  return {
    ...statutory,
    presentDays,
    workingDays: cellNumber(values.workingDays) || asRegistered.workingDays,
    earnedBasic,
    allowances,
    deductions,
    totalAllowance,
    otHours: cellNumber(values.otHours),
    otAmount,
    grossPay,
    statutoryLines,
    totalDeduction,
    netPay: round(grossPay - totalDeduction),
  }
}

/* ── The footer ─────────────────────────────────────────────────────────── */

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
 * Sum the page as it currently reads — the edited rows at what they have been
 * edited to, the rest at what the register answered. The footer therefore says
 * what the save is about to write, which is the question being asked of it.
 */
export function salaryColumnTotals(figures: SalaryRowFigures[]): SalaryColumnTotals {
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

  figures.forEach((row) => {
    totals.earnedBasic += row.earnedBasic
    totals.basicPay += row.basicPay
    addHeads(totals.allowanceByHead, row.allowances)
    addHeads(totals.deductionByHead, row.deductions)
    totals.totalAllowance += row.totalAllowance
    totals.otHours += row.otHours
    totals.otAmount += row.otAmount
    totals.grossPay += row.grossPay
    totals.employeePf += row.employeePf
    totals.employeeEsic += row.employeeEsic
    totals.employeePt += row.employeePt
    totals.employeeLwf += row.employeeLwf
    totals.employeeTds += row.employeeTds
    totals.totalDeduction += row.totalDeduction
    totals.netPay += row.netPay
  })

  return totals
}
