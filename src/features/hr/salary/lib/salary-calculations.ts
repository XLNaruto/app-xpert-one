import { payoutTiming } from '@/features/master/designation'
import type { CalculationBase } from '@/features/master/designation'
import { round2 } from '@/lib/currency'
import type {
  SalaryBilling,
  SalaryHead,
  SalaryHeadConfig,
  SalaryHeadConfigs,
  SalaryRates,
  SalaryRegisterRow,
  SalaryWageStructure,
} from '../types'
import type { SalaryRow } from '../schemas'
import { statutoryFor, tdsFor } from './salary-statutory'

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
 *
 * Three things the **payout schedule** adds on top of all that, each of which the
 * server's own engine does the same way:
 *
 * - **A head is only worth anything in its payout months.** A quarterly head
 *   anchored on March pays in March, June, September and December and is `0` in
 *   between — and that zero is "nothing due", not "an amount of nothing", which
 *   is why every line carries `isPayoutMonth`. An `ACCRUED` head goes further:
 *   its figure is a *monthly accrual*, so the payout month releases N months of
 *   it at once (`accruedMonths`).
 * - **An `EXCLUDE` head is paid but calculates on nothing.** It lands in gross
 *   pay like any other head and is kept out of every base — the statutory ones
 *   included, whatever its PF / ESI / PT chips say. That is why there are two
 *   grosses below: `grossPay`, the money on the payslip, and `grossBase`, what
 *   the other heads calculate on.
 * - **A deduction head names its own base.** Six of them, from the earned basic
 *   to the total invoice amount, resolved ONCE in a fixed order (see
 *   `derivedBases`) and then frozen — the deduction heads are priced on the
 *   result, never fed back into it, or the arithmetic would be circular.
 */

/**
 * Money rounded to the **paise**, the way the server's own `round2()` does it —
 * `Number.EPSILON` term and all.
 *
 * Every figure the engine produces is a 2dp figure now, not a whole rupee, and
 * `bulk-save` checks each row's arithmetic to within **5 paise**. So each line is
 * rounded here, once, before it is summed: the server rounds per step, and
 * summing unrounded floats and rounding at the end drifts off it. See
 * `lib/currency`.
 */
const round = round2

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
 * How one head's schedule lands on the month being priced, and the multiplier it
 * comes to. `null` for a head the row has no configuration for — there is no
 * schedule to read, so nothing to explain about its figure.
 */
export function headTiming(
  config: SalaryHeadConfig | undefined,
  periodMonth: number,
) {
  if (!config) return null
  return payoutTiming(config, periodMonth)
}

/**
 * One head's amount, by the rule its configuration puts it under.
 *
 * Four answers, in the order they win:
 *
 * - **Typed over.** `overridden` is what a double-click and a figure leave
 *   behind, and it beats everything below outright — that is the whole point of
 *   being allowed to type it. A schedule cannot override an explicit instruction.
 * - **Unconfigured.** A head the structure doesn't carry has no rule, so the cell
 *   is the only thing that knows the amount.
 * - **Off its payout month.** The schedule's factor is `0`, so the head is worth
 *   nothing this month whatever its configured figure. Read `isPayoutMonth` on
 *   the line to say *why* rather than printing a bare zero.
 * - **Priced, then scaled.** The monthly figure is worked out per `amount_type`
 *   and multiplied by the factor — `1` on an ordinary payout, `N` when an
 *   `ACCRUED` head releases a whole period at once.
 *
 * `base` is what a percentage head earns on: the earned basic for an allowance,
 * and for a deduction whichever of the six bases its `calculation_base` names —
 * resolved by the caller, because those bases depend on the allowances being
 * priced first.
 *
 * **The four `amount_type` rules**, and the two new ones are not the same rule:
 *
 * - `Percentage` — `base * amount / 100`.
 * - `Fixed` — a MONTHLY rupee figure, prorated: `amount * paidDays / workingDays`.
 *   A flat ₹2,600 head on a 13-of-26-day month is worth ₹1,300.
 * - `Per Day` — a rupee RATE per day: `amount * presentDays`, and **not** prorated
 *   again, because the day count already carries the attendance. It therefore
 *   pays on extra days: 29 payable against a 26-day month pays all 29.
 * - `Days` — a COUNT of days at the day's wage:
 *   `amount * wagesPerDay * paidDays / workingDays`. It **is** prorated: it is an
 *   entitlement for a whole month (four days of leave encashment, say), so a
 *   25-of-26-day month accrues 25/26 of it, and `paidDays` caps at the month.
 *
 * On real figures — ₹534.50 a day over 26 working days — `Per Day 146.8846` pays
 * ₹3,819.00 / ₹3,672.12 for 26 / 25 payable days, while `Days 4` pays ₹2,138.00 /
 * ₹2,055.77. Neither column can be got from the other rule.
 */
export function headCellAmount(
  cell: { amount: string; overridden: boolean },
  config: SalaryHeadConfig | undefined,
  base: number,
  days: HeadDays,
  periodMonth: number,
): number {
  if (cell.overridden) return cellNumber(cell.amount)
  if (!config) return cellNumber(cell.amount)

  const timing = payoutTiming(config, periodMonth)
  if (!timing.isPayoutMonth) return 0

  const monthly = monthlyHeadAmount(config, base, days)

  /* Rounded AFTER the factor, which is the order the server rounds in — the
     bulk save's total consistency check is against figures rounded this way. */
  return round(timing.factor * monthly)
}

/**
 * The day counts and the daily wage a head is priced against — everything the
 * four `amount_type` rules read beyond the head's own figure.
 *
 * `presentDays` and `paidDays` differ only once the month is over-worked:
 * `extraDays = max(0, presentDays - workingDays)` are days the month doesn't
 * contain, and `paidDays = presentDays - extraDays` is therefore capped at the
 * month. A `Per Day` rate pays the former; everything prorated uses the latter,
 * so a proration can never exceed 1.
 */
export interface HeadDays {
  presentDays: number
  paidDays: number
  workingDays: number
  wagesPerDay: number
}

/** The day counts for a row, with the over-worked month split off. */
export function headDaysFor(
  presentDays: number,
  workingDays: number,
  wagesPerDay: number,
): HeadDays {
  const extraDays = workingDays > 0 ? Math.max(0, presentDays - workingDays) : 0
  return {
    presentDays,
    paidDays: presentDays - extraDays,
    workingDays,
    wagesPerDay,
  }
}

/**
 * The head's monthly figure before the payout factor — one branch per
 * `amount_type`. A row with no working days on it can't be prorated, so it pays
 * the figure in full rather than nothing.
 */
function monthlyHeadAmount(
  config: SalaryHeadConfig,
  base: number,
  days: HeadDays,
): number {
  const ratio = days.workingDays > 0 ? days.paidDays / days.workingDays : 1

  switch (config.valueType) {
    case 'Percentage':
      return (base * config.value) / 100
    case 'Per Day':
      return config.value * days.presentDays
    case 'Days':
      return config.value * days.wagesPerDay * ratio
    case 'Fixed':
    default:
      return config.value * ratio
  }
}

/**
 * What a **deduction** head is priced on, out of the six bases its
 * `calculation_base` can name.
 *
 * Resolved once, from figures already frozen — see `derivedBases`, which computes
 * them in the fixed order the API documents. Never re-entered: the non-statutory
 * deductions are what is being priced *on* these, so feeding them back in would
 * be circular.
 */
function baseFor(bases: DerivedBases, base: CalculationBase): number {
  switch (base) {
    case 'BASIC_PAY':
      return bases.basicPay
    case 'GROSS_PAY':
      return bases.grossBase
    case 'NET_PAY':
      return bases.netBase
    case 'TOTAL_STATUTORY_COST':
      return bases.totalStatutoryCost
    case 'TOTAL_INVOICE_AMOUNT':
      return bases.totalInvoiceAmount
    case 'BASIC_EARNED_FOR_PRESENT_DAYS':
    default:
      return bases.basicEarned
  }
}

/**
 * The five bases a deduction head can be priced on beyond the earned basic,
 * computed in the fixed order the API documents and then frozen.
 *
 * The order is the point: the basic, then the allowance lines, then the two
 * grosses, then PF / ESIC / PT / LWF, then the **agency bill**, then TDS off
 * whichever of those it is quoted on, and only then the deduction heads.
 * Anything that tried to iterate would never settle — and TDS in particular has
 * to come after the bill, because `TOTAL_INVOICE_AMOUNT` is one of the amounts it
 * can be charged on.
 */
interface DerivedBases {
  basicEarned: number
  basicPay: number
  /** What heads calculate on — gross less every `EXCLUDE` head. */
  grossBase: number
  /**
   * `grossBase` less the STATUTORY five only.
   *
   * **Not the payslip's net.** It deliberately leaves out the non-statutory
   * deduction heads, because those are the very things being priced on it. The
   * `netPay` printed at the foot of the payslip is the real net and will differ;
   * the dropdown is labelled "Net Pay" all the same, because that is the base's
   * name.
   */
  netBase: number
  totalStatutoryCost: number
  /** The agency's service charge on the statutory cost — a column on the bill. */
  agencyChargeAmount: number
  /** GST on the cost plus that charge — the other column on the bill. */
  gstAmount: number
  totalInvoiceAmount: number
}

/**
 * The amount a **TDS** rate is charged on — whichever of the five the wage
 * structure names.
 *
 * `null` is the answer that matters and is never defaulted away: a structure that
 * names no base deducts nothing, which is the behaviour every structure had
 * before TDS computed at all. Returning `0` here is what makes `tdsFor` produce
 * nothing, and `tdsFor` refuses on the same condition, so neither can drift.
 *
 * `NET_PAY` is not among the five and the API refuses it — the net already has
 * TDS out of it, so it would be an input to itself.
 */
function tdsBase(bases: DerivedBases, wage: SalaryWageStructure | null): number {
  switch (wage?.tdsCalculationBase) {
    case 'BASIC_PAY':
      return bases.basicPay
    case 'GROSS_PAY':
      return bases.grossBase
    case 'TOTAL_STATUTORY_COST':
      return bases.totalStatutoryCost
    case 'TOTAL_INVOICE_AMOUNT':
      return bases.totalInvoiceAmount
    case 'BASIC_EARNED_FOR_PRESENT_DAYS':
      return bases.basicEarned
    default:
      return 0
  }
}

/**
 * The bill, and the bases that come off it.
 *
 * The chain is four figures, each rounded to the paise as the server rounds it:
 *
 * ```
 * total_statutory_cost = gross_base + employer_pf + employer_esic
 * agency_charge_amount = total_statutory_cost * agency_charge_percentage / 100
 * gst_amount           = (total_statutory_cost + agency_charge_amount) * gst_percentage / 100
 * total_invoice_amount = total_statutory_cost + agency_charge_amount + gst_amount
 * ```
 *
 * Rounding **per step** matters: the invoice is the sum of three 2dp figures, not
 * one compounded multiplication rounded at the end, and the two answers differ by
 * a paisa often enough to fail the save's 5-paise check.
 *
 * `employeeTds` is taken as an input rather than derived here, because TDS is
 * charged on one of these very figures — see `rowFigures`, which calls this
 * first with no TDS to price the bill, then again once TDS is known so that
 * `netBase` accounts for it.
 */
function derivedBases(input: {
  basicEarned: number
  basicPay: number
  grossBase: number
  employeePf: number
  employeeEsic: number
  employeePt: number
  employeeLwf: number
  employeeTds: number
  employerPf: number
  employerEsic: number
  billing: SalaryBilling | null
}): DerivedBases {
  const statutoryCost = round(
    input.grossBase + input.employerPf + input.employerEsic,
  )
  /* A company with no billing row invoices at cost — 0% agency charge, 0% GST.
     Nothing here may assume 18%: the rate is the company's own. */
  const agencyPct = input.billing?.agencyChargePercentage ?? 0
  const gstPct = input.billing?.gstPercentage ?? 0
  const agencyCharge = round((statutoryCost * agencyPct) / 100)
  const gst = round(((statutoryCost + agencyCharge) * gstPct) / 100)

  return {
    basicEarned: input.basicEarned,
    basicPay: input.basicPay,
    grossBase: input.grossBase,
    netBase: round(
      input.grossBase -
        (input.employeePf +
          input.employeeEsic +
          input.employeePt +
          input.employeeLwf +
          input.employeeTds),
    ),
    totalStatutoryCost: statutoryCost,
    agencyChargeAmount: agencyCharge,
    gstAmount: gst,
    totalInvoiceAmount: round(statutoryCost + agencyCharge + gst),
  }
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
  /** The money on the payslip — every head, `EXCLUDE` ones included. */
  grossPay: number
  /**
   * What the other heads and the acts calculate on — the gross less every
   * `EXCLUDE` head. Equal to `grossPay` when nothing is excluded, which is the
   * usual case, and never printed as the gross.
   */
  grossBase: number
  /** Total allowance that reached `grossBase` — the `INCLUDE` ones. */
  includedAllowance: number
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
   * The invoice side — `grossBase` plus the employer's PF and ESIC, then the
   * agency charge and GST on top of that.
   *
   * Computed here because a deduction head can be priced on either of them, and
   * shown so the figure behind such a head is visible. `bulk-save` records
   * neither: a row saved from this screen comes back with both `null`, since the
   * API only stores what its own engine derived.
   */
  totalStatutoryCost: number
  /** The agency's service charge on the statutory cost — a column on the bill. */
  agencyChargeAmount: number
  /** GST on the statutory cost plus that charge — the bill's other column. */
  gstAmount: number
  totalInvoiceAmount: number
}

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
  live: boolean,
  rates: SalaryRates,
  periodMonth: number,
  /**
   * The company's agency-charge and GST rates, for the two invoice bases a
   * deduction head can be priced on. `null` is a company that has never
   * configured charges — it invoices at statutory cost, which the arithmetic
   * treats as 0% / 0%. **Never assume 18%.**
   */
  billing: SalaryBilling | null = null,
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
    /* A stored row records no base of its own, so the gross stands for both. */
    grossBase: figures.grossPay,
    includedAllowance: figures.totalAllowance,
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
    /* Whatever the server derived, where it derived any — `null` reads as 0 for
       the arithmetic, and the screen shows the stored `null` as a dash. */
    totalStatutoryCost: figures.totalStatutoryCost ?? 0,
    agencyChargeAmount: figures.agencyChargeAmount ?? 0,
    gstAmount: figures.gstAmount ?? 0,
    totalInvoiceAmount: figures.totalInvoiceAmount ?? 0,
  }

  if (!live || !values) return asRegistered

  const presentDays = cellNumber(values.presentDays)
  const workingDays = cellNumber(values.workingDays) || asRegistered.workingDays
  const earnedBasic = earnedBasicFor(figures.wagesPerDay, presentDays)
  /*
   * The day counts every head is priced against — the payable days, the days
   * inside the month, the month itself and the daily wage. Which of them a head
   * reads is its `amount_type`'s business: see `headCellAmount`.
   */
  const days = headDaysFor(presentDays, workingDays, figures.wagesPerDay)
  const otAmount = otAmountFor(figures.otRate, cellNumber(values.otHours))

  /**
   * One head cell → its line. The cells are aligned with the grid's head
   * columns, so a head keeps its identity from `payComponentId` rather than from
   * where it happens to sit.
   *
   * `baseOf` is what a percentage head earns on, and it is the only thing that
   * differs between the two sides: an allowance earns on the earned basic, while
   * a deduction earns on whichever of the six bases its own `calculation_base`
   * names — which is why the deductions can't be priced until the allowances,
   * the grosses and the statutory five are all settled.
   */
  const applyHeads = (
    cells: SalaryRow['allowances'],
    registered: SalaryHead[],
    baseOf: (config: SalaryHeadConfig | undefined) => number,
  ): SalaryHead[] =>
    cells.map((cell) => {
      const head = registered.find((one) => one.payComponentId === cell.payComponentId)
      const config = configs.get(cell.payComponentId)
      const timing = headTiming(config, periodMonth)

      return {
        payComponentId: cell.payComponentId,
        code: head?.code ?? '',
        name: head?.name ?? '',
        pfApplicable: config?.pfApplicable ?? head?.pfApplicable ?? false,
        esicApplicable: config?.esicApplicable ?? head?.esicApplicable ?? false,
        ptApplicable: config?.ptApplicable ?? head?.ptApplicable ?? false,
        amount: headCellAmount(cell, config, baseOf(config), days, periodMonth),
        /* What makes a zero readable — see `SalaryHead`. Null on a head the row
           carries no configuration for: there is no schedule to report. */
        isPayoutMonth: timing?.isPayoutMonth ?? null,
        accruedMonths: timing?.accruedMonths ?? null,
        nextPayoutMonth: timing?.nextPayoutMonth ?? null,
        payrollCalculation: config?.payrollCalculation ?? 'INCLUDE',
      }
    })

  /* ── 1–2. The basic, then the allowance lines ──────────────────────────── */

  const allowances = applyHeads(values.allowances, figures.allowances, () => earnedBasic)

  /* ── 3. The two grosses ────────────────────────────────────────────────── */

  const totalAllowance = round(allowances.reduce((sum, head) => sum + head.amount, 0))
  /*
   * An `EXCLUDE` head is paid, and lands in `grossPay` like any other — it is
   * only kept out of the base the other heads and the acts calculate on. Hence
   * two figures where there used to be one.
   */
  const includedAllowance = round(
    allowances.reduce(
      (sum, head) => (head.payrollCalculation === 'EXCLUDE' ? sum : sum + head.amount),
      0,
    ),
  )
  const grossPay = round(
    earnedBasic + totalAllowance + otAmount + figures.extraDaysAmount,
  )
  const grossBase = round(
    earnedBasic + includedAllowance + otAmount + figures.extraDaysAmount,
  )

  /* ── 4. The statutory five ─────────────────────────────────────────────── */

  /* Off this row's wage structure and the period's rate masters. Each is charged
     on the heads that opt into it — and never on an `EXCLUDE` head, whatever its
     chips say, which `actWage` enforces. A cell typed over keeps its figure;
     that override is the whole reason the cells are editable. */
  const acts = statutoryFor({
    earnedBasic,
    allowances,
    wage: wageStructure,
    rates,
    periodMonth,
  })

  const withoutTds = {
    ...asRegistered,
    employeePf: statutoryAmount(values.statutory?.pf, acts.employeePf),
    employerPf: acts.employerPf,
    employeeEsic: statutoryAmount(values.statutory?.esic, acts.employeeEsic),
    employerEsic: acts.employerEsic,
    employeePt: statutoryAmount(values.statutory?.pt, acts.employeePt),
    employeeLwf: statutoryAmount(values.statutory?.lwf, acts.employeeLwf),
    employeeEsicRate: acts.employeeEsicRate,
    employerEsicRate: acts.employerEsicRate,
    employerLwf: acts.employerLwf,
  }

  /* ── 5. The agency bill, then TDS off it ───────────────────────────────── */

  /*
   * The bill is priced BEFORE TDS, and TDS is then charged on whichever amount
   * the wage structure names — `TOTAL_INVOICE_AMOUNT` among them, which is the
   * whole reason for the order. Contractor TDS under section 194C is 2% of the
   * total bill, not of any wage figure, so nothing about it can be settled until
   * the employer's shares, the agency charge and the GST are.
   *
   * The bases are computed twice: once with no TDS, to price the bill and give
   * `tdsFor` something to quote on, and once more below with the TDS that came
   * out of it, so `netBase` — the "Net Pay" a deduction head can be priced on —
   * accounts for it. The second pass changes nothing on the bill itself: TDS is
   * the employee's deduction and enters none of the four bill figures.
   */
  const billed = derivedBases({
    basicEarned: earnedBasic,
    basicPay: figures.basicPay,
    grossBase,
    employeePf: withoutTds.employeePf,
    employeeEsic: withoutTds.employeeEsic,
    employeePt: withoutTds.employeePt,
    employeeLwf: withoutTds.employeeLwf,
    employeeTds: 0,
    employerPf: withoutTds.employerPf,
    employerEsic: withoutTds.employerEsic,
    billing,
  })

  const statutory = {
    ...withoutTds,
    employeeTds: statutoryAmount(
      values.statutory?.tds,
      tdsFor(tdsBase(billed, wageStructure), wageStructure),
    ),
  }

  /* ── 6. The derived bases, frozen ──────────────────────────────────────── */

  const bases = derivedBases({
    basicEarned: earnedBasic,
    basicPay: figures.basicPay,
    grossBase,
    employeePf: statutory.employeePf,
    employeeEsic: statutory.employeeEsic,
    employeePt: statutory.employeePt,
    employeeLwf: statutory.employeeLwf,
    employeeTds: statutory.employeeTds,
    employerPf: statutory.employerPf,
    employerEsic: statutory.employerEsic,
    billing,
  })

  /* ── 7. The deduction heads, on those frozen bases ─────────────────────── */

  const deductions = applyHeads(values.deductions, figures.deductions, (config) =>
    baseFor(bases, config?.calculationBase ?? 'BASIC_EARNED_FOR_PRESENT_DAYS'),
  )

  /*
   * The total is the non-statutory lines plus the five statutory columns, which
   * is exactly the sum `bulk-save` checks it against:
   *
   *   total_deduction == sum(deductions[]) + employee_pf + employee_esic
   *                        + employee_pt + employee_lwf + employee_tds
   *                        + the two late penalties
   *
   * The five are **columns on the row, not breakdown lines** — see
   * `salaryRowToPayload`. Counting a statutory figure in both places was the one
   * mistake the old ±2 tolerance could hide and the current ±0.05 cannot.
   *
   * Each line is already rounded to the paise, and the sum is rounded again, in
   * the same order the server rounds — summing unrounded floats drifts off it.
   */
  const totalDeduction = round(
    deductions.reduce((sum, head) => sum + head.amount, 0) +
      statutory.employeePf +
      statutory.employeeEsic +
      statutory.employeePt +
      statutory.employeeLwf +
      statutory.employeeTds,
  )

  return {
    ...statutory,
    presentDays,
    workingDays,
    earnedBasic,
    allowances,
    deductions,
    totalAllowance,
    includedAllowance,
    otHours: cellNumber(values.otHours),
    otAmount,
    grossPay,
    grossBase,
    totalStatutoryCost: bases.totalStatutoryCost,
    agencyChargeAmount: bases.agencyChargeAmount,
    gstAmount: bases.gstAmount,
    totalInvoiceAmount: bases.totalInvoiceAmount,
    totalDeduction,
    /* The real net — gross less EVERY deduction, the non-statutory heads
       included. Not `bases.netBase`, which is a base and stops at the statutory
       five precisely so the heads priced on it aren't priced on themselves. */
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
