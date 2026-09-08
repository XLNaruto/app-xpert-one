/**
 * The payout schedule an allowance / deduction head carries — five settings that
 * sit on top of its amount and its PF / ESI / PT chips.
 *
 * They are configured on four screens (the designation's create form, its wage
 * structure history, HR's bulk wage grid and an employee's own wage) and read by
 * a fifth (the salary register, which does the arithmetic), so the enums, the
 * coupling rules and the month maths all live here and nowhere else.
 *
 * **The API enforces the coupling**, and a violation is a 400 — so the rules
 * below are not cosmetic:
 *
 * - `MONTHLY` must send **no** `start_month`; every other frequency **must** send
 *   one (`needsStartMonth`).
 * - `MONTHLY` accepts `PER_PAYOUT` only (`supportsAccrual`).
 * - `calculation_base` is **deduction-only** — an allowance sending one is
 *   refused.
 *
 * Switching a head back to `MONTHLY` needs no clean-up on the wire: the API
 * itself forces `start_month` to null and `amount_mode` to `PER_PAYOUT`. The
 * form still clears them locally, so what is on screen is what would be sent.
 *
 * Pure functions only — no React, per the feature layout.
 */

/** How often a head is actually paid out or deducted. */
export type PayoutFrequency =
  | 'MONTHLY'
  | 'BI_MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'ANNUAL'

/**
 * What the configured amount *means* on a non-monthly head.
 *
 * `PER_PAYOUT` pays the figure once, in each payout month. `ACCRUED` treats it
 * as a monthly accrual and releases the whole period in one go — an annual head
 * configured at ₹12,000 accrued pays ₹144,000 in its start month.
 */
export type AmountMode = 'PER_PAYOUT' | 'ACCRUED'

/**
 * Whether the head enters the base other heads calculate on.
 *
 * `EXCLUDE` is still paid / deducted and still lands in gross pay — it is only
 * kept out of every base. It is a stricter gate than the PF / ESI / PT chips: an
 * excluded head is out of all of them whatever its chips say.
 */
export type PayrollCalculation = 'INCLUDE' | 'EXCLUDE'

/** What a non-statutory **deduction** head is priced on. Allowances carry none. */
export type CalculationBase =
  | 'BASIC_EARNED_FOR_PRESENT_DAYS'
  | 'BASIC_PAY'
  | 'GROSS_PAY'
  | 'NET_PAY'
  | 'TOTAL_STATUTORY_COST'
  | 'TOTAL_INVOICE_AMOUNT'

/**
 * The schedule as a **form row** holds it. `startMonth` is a string because
 * that's what the picker gives us — `''` is "not anchored", which is the only
 * legal state on a monthly head.
 */
export interface ComponentSchedule {
  payoutFrequency: PayoutFrequency
  /** `'1'`–`'12'` (1 = January), or `''` on a monthly head. */
  startMonth: string
  amountMode: AmountMode
  payrollCalculation: PayrollCalculation
  /**
   * Read on a **deduction** row only — an allowance never sends it. Kept on both
   * sides of the form because both sides share one row shape, exactly as the act
   * chips do.
   */
  calculationBase: CalculationBase
}

/** Months one payout covers — the `N` every schedule calculation turns on. */
export const MONTHS_PER_PAYOUT: Record<PayoutFrequency, number> = {
  MONTHLY: 1,
  BI_MONTHLY: 2,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  ANNUAL: 12,
}

/*
 * The enums as non-empty tuples, so `z.enum()` can take them directly and the
 * schemas can't drift from the types above.
 */

/** Every frequency, in the order the screens offer them. */
export const PAYOUT_FREQUENCIES = [
  'MONTHLY',
  'BI_MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'ANNUAL',
] as const satisfies readonly PayoutFrequency[]

export const AMOUNT_MODES = [
  'PER_PAYOUT',
  'ACCRUED',
] as const satisfies readonly AmountMode[]

export const PAYROLL_CALCULATIONS = [
  'INCLUDE',
  'EXCLUDE',
] as const satisfies readonly PayrollCalculation[]

export const CALCULATION_BASES = [
  'BASIC_EARNED_FOR_PRESENT_DAYS',
  'BASIC_PAY',
  'GROSS_PAY',
  'NET_PAY',
  'TOTAL_STATUTORY_COST',
  'TOTAL_INVOICE_AMOUNT',
] as const satisfies readonly CalculationBase[]

/**
 * What a **TDS** rate can be quoted on — the same bases less `NET_PAY`.
 *
 * The net already has TDS deducted from it, so quoting TDS on it would make the
 * figure an input to itself. The API refuses it with a 400; it stays perfectly
 * legal for an ordinary deduction head, which is a different question.
 */
export const TDS_CALCULATION_BASES = [
  'BASIC_EARNED_FOR_PRESENT_DAYS',
  'BASIC_PAY',
  'GROSS_PAY',
  'TOTAL_STATUTORY_COST',
  'TOTAL_INVOICE_AMOUNT',
] as const satisfies readonly CalculationBase[]

export type TdsCalculationBase = (typeof TDS_CALCULATION_BASES)[number]

/**
 * The month a non-monthly cycle is anchored on when the user hasn't picked one —
 * April, the first month of the Indian financial year, which is where a bonus or
 * an annual head's cycle almost always starts.
 */
export const DEFAULT_START_MONTH = 4

/** The default the API itself applies to a deduction with no base recorded. */
export const DEFAULT_CALCULATION_BASE: CalculationBase =
  'BASIC_EARNED_FOR_PRESENT_DAYS'

/**
 * What a head that has never been configured reads as — and what every
 * pre-existing head reads back as, since the migration's defaults *are* the old
 * behaviour: monthly, per payout, in the calculation, no anchor.
 */
export const DEFAULT_COMPONENT_SCHEDULE: ComponentSchedule = {
  payoutFrequency: 'MONTHLY',
  startMonth: '',
  amountMode: 'PER_PAYOUT',
  payrollCalculation: 'INCLUDE',
  calculationBase: DEFAULT_CALCULATION_BASE,
}

/** Whether the START MONTH picker applies — shown and required off monthly. */
export function needsStartMonth(frequency: PayoutFrequency): boolean {
  return frequency !== 'MONTHLY'
}

/** Whether `ACCRUED` is offered. Nothing accumulates between monthly payouts. */
export function supportsAccrual(frequency: PayoutFrequency): boolean {
  return frequency !== 'MONTHLY'
}

/** Whether the schedule is the plain default — what the closed chip greys on. */
export function isDefaultSchedule(
  schedule: ComponentSchedule,
  side: 'allowance' | 'deduction',
): boolean {
  return (
    schedule.payoutFrequency === 'MONTHLY' &&
    schedule.amountMode === 'PER_PAYOUT' &&
    schedule.payrollCalculation === 'INCLUDE' &&
    (side === 'allowance' || schedule.calculationBase === DEFAULT_CALCULATION_BASE)
  )
}

/* ── Reading a stored / typed value back ────────────────────────────────── */

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.find((option) => option === value) ?? fallback
}

export function toPayoutFrequency(value: string | null | undefined): PayoutFrequency {
  return oneOf((value ?? '').toUpperCase(), PAYOUT_FREQUENCIES, 'MONTHLY')
}

export function toAmountMode(value: string | null | undefined): AmountMode {
  return oneOf((value ?? '').toUpperCase(), AMOUNT_MODES, 'PER_PAYOUT')
}

export function toPayrollCalculation(
  value: string | null | undefined,
): PayrollCalculation {
  return oneOf((value ?? '').toUpperCase(), PAYROLL_CALCULATIONS, 'INCLUDE')
}

export function toCalculationBase(value: string | null | undefined): CalculationBase {
  return oneOf((value ?? '').toUpperCase(), CALCULATION_BASES, DEFAULT_CALCULATION_BASE)
}

/**
 * A stored `tds_calculation_base`, or `null` where none is recorded.
 *
 * `null` is the answer that matters and is never defaulted away: it means the
 * structure names no base, and nothing is deducted however high the rate. An
 * unrecognised value — `NET_PAY` from a body the API would have refused — also
 * reads as `null`, which is the reading that deducts nothing rather than the one
 * that invents a base.
 */
export function toTdsCalculationBase(
  value: string | null | undefined,
): TdsCalculationBase | null {
  const upper = (value ?? '').trim().toUpperCase()
  return TDS_CALCULATION_BASES.find((base) => base === upper) ?? null
}

/** A stored `start_month` as the form's string; anything out of 1–12 reads blank. */
export function toStartMonthValue(value: number | null | undefined): string {
  if (value == null) return ''
  return Number.isInteger(value) && value >= 1 && value <= 12 ? String(value) : ''
}

/** A form `startMonth` as the number the API takes; `null` off a valid month. */
export function toStartMonthNumber(value: string): number | null {
  const parsed = Number((value ?? '').trim())
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null
}

/**
 * A schedule repaired against its own frequency — the one place the coupling is
 * applied, so no screen can hold a state the API would refuse.
 *
 * Monthly loses its anchor and is pinned to `PER_PAYOUT`; every other frequency
 * is given the default anchor when it has none.
 */
export function resolveSchedule(schedule: ComponentSchedule): ComponentSchedule {
  const frequency = schedule.payoutFrequency

  if (!needsStartMonth(frequency)) {
    return {
      ...schedule,
      startMonth: '',
      amountMode: 'PER_PAYOUT',
    }
  }

  return {
    ...schedule,
    startMonth:
      toStartMonthNumber(schedule.startMonth) === null
        ? String(DEFAULT_START_MONTH)
        : schedule.startMonth,
  }
}

/* ── What a head is worth this month ────────────────────────────────────── */

/** How a head's schedule lands on one payroll month. */
export interface PayoutTiming {
  /** `N` — months one payout covers. */
  monthsPerPayout: number
  /** Whether this month is one the head pays out in. */
  isPayoutMonth: boolean
  /**
   * What the monthly amount is multiplied by: `0` off a payout month, `N` when
   * an `ACCRUED` payout releases the whole period, `1` otherwise.
   */
  factor: number
  /** 1–12 — the next month this head pays out; this month when it pays now. */
  nextPayoutMonth: number
  /** Months released in one go — `N` on an accrued payout, `1` otherwise. */
  accruedMonths: number
}

/**
 * The schedule against a calendar month (1–12).
 *
 * Every frequency divides 12 evenly, so the payout months are the same set in
 * every calendar year and the year never enters the arithmetic. With an anchor of
 * March: annual pays in March; half-yearly in March and September; quarterly in
 * March, June, September and December; bi-monthly in every odd month.
 *
 * A head with no anchor recorded is read against January, which is what the API
 * does (`start_month ?? 1`) — that only happens on data written before the
 * coupling was enforced.
 */
export function payoutTiming(
  schedule: Pick<ComponentSchedule, 'payoutFrequency' | 'startMonth' | 'amountMode'>,
  month: number,
): PayoutTiming {
  const monthsPerPayout = MONTHS_PER_PAYOUT[schedule.payoutFrequency]

  if (monthsPerPayout === 1) {
    return {
      monthsPerPayout: 1,
      isPayoutMonth: true,
      factor: 1,
      nextPayoutMonth: month,
      accruedMonths: 1,
    }
  }

  const anchor = toStartMonthNumber(schedule.startMonth) ?? 1
  const since = (((month - anchor) % monthsPerPayout) + monthsPerPayout) % monthsPerPayout
  const isPayoutMonth = since === 0
  const accruedMonths = schedule.amountMode === 'ACCRUED' ? monthsPerPayout : 1

  return {
    monthsPerPayout,
    isPayoutMonth,
    factor: isPayoutMonth ? accruedMonths : 0,
    /* Months to the next anchor-aligned month, wrapped into 1–12. */
    nextPayoutMonth: isPayoutMonth
      ? month
      : ((month + (monthsPerPayout - since) - 1) % 12) + 1,
    accruedMonths,
  }
}

/** `1` → `January`. Out-of-range reads as an empty string. */
export function monthName(month: number | null | undefined): string {
  if (month == null || month < 1 || month > 12) return ''
  return MONTH_NAMES[month - 1]
}

/** `1` → `Jan` — for the chips and the grid's narrow cells. */
export function shortMonthName(month: number | null | undefined): string {
  return monthName(month).slice(0, 3)
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
