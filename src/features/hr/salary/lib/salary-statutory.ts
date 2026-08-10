import type {
  SalaryHead,
  SalaryPtSlab,
  SalaryRates,
  SalaryWageStructure,
} from '../types'

/**
 * PF, ESIC, professional tax and LWF — worked out here, on the client.
 *
 * This is new, and it is the register's own change of shape. `GET
 * /salary/register` used to answer these as figures it had computed and the
 * screen carried them through untouched; it now answers `rates` — the PF / ESIC
 * / PT / LWF masters in force for the period — and leaves the arithmetic to
 * whoever is pricing the row. Which is this screen, for the same reason it
 * prices the heads: **the client decides the pay**, `bulk-save` stores every
 * figure as sent, and a statutory deduction that didn't follow the days was the
 * one thing on the grid that couldn't be made to add up.
 *
 * Two sources meet in every one of these. The **rate master** says what the act
 * charges — a percentage, a ceiling, a slab table. The **wage structure** says
 * how this designation applies it: PF at a flat rupee figure rather than the
 * act's percentage, ESIC on gross rather than on the ceiling, PT hand-entered
 * rather than off the slabs. The structure wins wherever it answers, because
 * that is what configuring it meant.
 *
 * Where a rate is missing the act deducts **nothing**. Falling back to another
 * period's rate would price a month at a percentage that was not in force for
 * it, which is worse than a visible zero.
 *
 * Pure functions only — no React, no hooks, per the feature layout.
 */

/** Money rounded the way a rupee figure is stored — two places, no more. */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** A configured string, compared the way the masters spell it. */
function is(value: string | null | undefined, expected: string): boolean {
  return (value ?? '').trim().toLowerCase() === expected.toLowerCase()
}

/**
 * The wage an act is charged on.
 *
 * Not the gross: each head carries its own `pfApplicable` / `esicApplicable` /
 * `ptApplicable`, which is exactly the question "does this head count towards
 * that act". So the base is the earned basic plus the heads that opt in, and a
 * conveyance allowance excluded from PF stays excluded however large it grows.
 *
 * Overtime is left out. Whether OT attracts an act is `pf_applicable_on_overtime`
 * and its two siblings on the wage structure, which `GET /salary/register` does
 * not report — see the note in `salaryRowToPayload`. Counting it would be a
 * guess in the direction that over-deducts.
 */
export function actWage(
  earnedBasic: number,
  allowances: SalaryHead[],
  act: 'pf' | 'esic' | 'pt',
): number {
  const applies = (head: SalaryHead) =>
    act === 'pf' ? head.pfApplicable : act === 'esic' ? head.esicApplicable : head.ptApplicable

  return round(
    earnedBasic +
      allowances.reduce((sum, head) => (applies(head) ? sum + head.amount : sum), 0),
  )
}

/* ── Provident fund ─────────────────────────────────────────────────────── */

/** The employee's and the employer's PF for the month. */
export interface PfResult {
  employee: number
  employer: number
  /** The wage the percentages were taken on — what a "why?" would want shown. */
  base: number
}

/**
 * PF, by the rule the designation is configured under.
 *
 * `Fixed` is a flat monthly deduction and is the answer on its own: a
 * designation set to deduct ₹120 deducts ₹120, which is why a row with no
 * present days can still show PF. `Percentage` uses the structure's own rate
 * where it has one and the master's `employee_pf_contribution` otherwise.
 *
 * The employer's share always follows the master — a designation configures what
 * comes off the employee, not what the company owes on top.
 *
 * On the ceiling: `rates.pf.wage_ceiling_limit` is the statutory cap, and
 * whether *this* designation caps at it is `is_employee_pf_contribution_on_wage_limit`
 * on the wage structure — which the register does not report. Until it does, the
 * cap is applied to the employer's share only, where it is the near-universal
 * arrangement, and the employee's share is charged on the full base. See the
 * note in `salaryRowToPayload`.
 */
export function pfFor(
  base: number,
  wage: SalaryWageStructure | null,
  rates: SalaryRates,
): PfResult {
  if (!wage?.isPfActApplicable) return { employee: 0, employer: 0, base: 0 }

  const master = rates.pf
  const ceiling = master?.wageCeilingLimit ?? null

  if (is(wage.pfDeductionType, 'Fixed')) {
    const employee = wage.pfDeductionAmount ?? 0
    const employerBase = ceiling === null ? base : Math.min(base, ceiling)
    return {
      employee: round(employee),
      employer: round((employerBase * (master?.employerContribution ?? 0)) / 100),
      base,
    }
  }

  /* Percentage — the structure's rate where it sets one, else the act's. */
  const employeeRate = is(wage.pfDeductionType, 'Percentage')
    ? (wage.pfDeductionAmount ?? master?.employeeContribution ?? 0)
    : (master?.employeeContribution ?? 0)
  const employerBase = ceiling === null ? base : Math.min(base, ceiling)

  return {
    employee: round((base * employeeRate) / 100),
    employer: round((employerBase * (master?.employerContribution ?? 0)) / 100),
    base,
  }
}

/* ── ESIC ───────────────────────────────────────────────────────────────── */

export interface EsicResult {
  employee: number
  employer: number
  base: number
  /** The percentages used — echoed on the save, which stores them per row. */
  employeeRate: number
  employerRate: number
}

/**
 * ESIC, on the wage its `esic_deduction_basis` names.
 *
 * The three bases are three different questions. **Wage Ceiling** charges the
 * ceiling where the wage exceeds it, so a well-paid employee still contributes
 * on the capped figure. **Gross Salary** charges the whole wage, ceiling
 * ignored. **As Per Act** applies the coverage rule instead: above the ceiling
 * the employee is out of the scheme for the contribution period and nothing is
 * deducted at all — which is not the same as contributing on the cap, and is the
 * reading the act itself takes.
 */
export function esicFor(
  base: number,
  wage: SalaryWageStructure | null,
  rates: SalaryRates,
): EsicResult {
  const master = rates.esic
  const employeeRate = master?.employeeContribution ?? 0
  const employerRate = master?.employerContribution ?? 0
  const nothing = { employee: 0, employer: 0, base: 0, employeeRate, employerRate }

  if (!wage?.isEsicActApplicable || !master) return nothing

  const ceiling = master.wageCeilingLimit ?? null
  let charged = base

  if (is(wage.esicDeductionBasis, 'Wage Ceiling')) {
    charged = ceiling === null ? base : Math.min(base, ceiling)
  } else if (is(wage.esicDeductionBasis, 'As Per Act')) {
    if (ceiling !== null && base > ceiling) return nothing
  }
  /* 'Gross Salary', and anything unrecognised, charges the wage as it stands. */

  return {
    employee: round((charged * employeeRate) / 100),
    employer: round((charged * employerRate) / 100),
    base: charged,
    employeeRate,
    employerRate,
  }
}

/* ── Professional tax ───────────────────────────────────────────────────── */

/**
 * Whether a slab's month covers the period. `'0'` is every month; anything else
 * is `'01'`–`'12'`, compared numerically so `'6'` and `'06'` both work.
 */
function monthApplies(month: string | null, periodMonth: number): boolean {
  const value = (month ?? '').trim()
  if (!value || value === '0') return true
  return Number(value) === periodMonth
}

/**
 * PT for the month — a flat amount off the state's slab table, or the figure the
 * designation was given when it is set to `Manual`.
 *
 * A slab is picked on the wage alone. The master narrows bands by gender and by
 * a minimum age as well, and the register reports neither against the row, so
 * the bands that name one are skipped rather than guessed at: an unrestricted
 * band (`Both`, no minimum age) is the one that can be applied correctly. Where
 * a state's table only has gendered bands, PT comes out zero and wants typing
 * over — which the cell allows.
 */
export function ptFor(
  base: number,
  wage: SalaryWageStructure | null,
  rates: SalaryRates,
  periodMonth: number,
): number {
  if (!wage?.isPtActApplicable) return 0
  if (is(wage.ptActType, 'Manual')) return round(wage.ptAmount ?? 0)

  const slabs = rates.pt?.slabs ?? []
  const match = slabs.find((slab) => coversWage(slab, base, periodMonth))
  return match ? round(match.amount) : 0
}

function coversWage(slab: SalaryPtSlab, wage: number, periodMonth: number): boolean {
  if (!monthApplies(slab.month, periodMonth)) return false
  /* Gendered or age-restricted bands need facts the register doesn't carry. */
  if (!is(slab.gender, 'Both') && (slab.gender ?? '').trim() !== '') return false
  if (slab.minAge !== null) return false
  if (slab.minSalary !== null && wage < slab.minSalary) return false
  if (slab.maxSalary !== null && wage > slab.maxSalary) return false
  return true
}

/* ── Labour welfare fund ────────────────────────────────────────────────── */

/**
 * LWF for the month — a flat contribution, and only in the months the state
 * collects it.
 *
 * `month` on the rate is the whole rule: `'0'` collects every month, `'06'`
 * collects in June alone. A designation set to `Manual` deducts its own figure
 * instead, and does so in the collecting months just the same — the setting
 * changes the amount, not when it falls due.
 */
export function lwfFor(
  wage: SalaryWageStructure | null,
  rates: SalaryRates,
  periodMonth: number,
): { employee: number; employer: number } {
  if (!wage?.isLwfActApplicable) return { employee: 0, employer: 0 }

  const master = rates.lwf
  if (!master || !monthApplies(master.month, periodMonth)) {
    return { employee: 0, employer: 0 }
  }

  if (is(wage.lwfActType, 'Manual')) {
    return { employee: round(wage.lwfAmount ?? 0), employer: 0 }
  }

  return {
    employee: round(master.employeeContribution ?? 0),
    employer: round(master.employerContribution ?? 0),
  }
}

/* ── TDS ────────────────────────────────────────────────────────────────── */

/**
 * TDS — the designation's percentage of the gross, where one is configured.
 *
 * The wage structure is the only thing that says anything about TDS: there is no
 * rate master behind it and no slab to read, so a designation with no percentage
 * set deducts nothing and the cell is where a figure gets typed for the month.
 */
export function tdsFor(grossPay: number, wage: SalaryWageStructure | null): number {
  if (!wage?.isTdsActApplicable) return 0
  return round((grossPay * (wage.tdsPercentage ?? 0)) / 100)
}

/** Every statutory figure a row comes to, and the bases behind them. */
export interface StatutoryResult {
  employeePf: number
  employerPf: number
  employeeEsic: number
  employerEsic: number
  employeeEsicRate: number
  employerEsicRate: number
  employeePt: number
  employeeLwf: number
  employerLwf: number
  employeeTds: number
}

/**
 * The five acts against one row, in the order they depend on each other: PF and
 * ESIC and PT off their own wage bases, LWF off the calendar, TDS off the gross.
 */
export function statutoryFor(input: {
  earnedBasic: number
  allowances: SalaryHead[]
  grossPay: number
  wage: SalaryWageStructure | null
  rates: SalaryRates
  periodMonth: number
}): StatutoryResult {
  const { earnedBasic, allowances, grossPay, wage, rates, periodMonth } = input

  const pf = pfFor(actWage(earnedBasic, allowances, 'pf'), wage, rates)
  const esic = esicFor(actWage(earnedBasic, allowances, 'esic'), wage, rates)
  const pt = ptFor(actWage(earnedBasic, allowances, 'pt'), wage, rates, periodMonth)
  const lwf = lwfFor(wage, rates, periodMonth)

  return {
    employeePf: pf.employee,
    employerPf: pf.employer,
    employeeEsic: esic.employee,
    employerEsic: esic.employer,
    employeeEsicRate: esic.employeeRate,
    employerEsicRate: esic.employerRate,
    employeePt: pt,
    employeeLwf: lwf.employee,
    employerLwf: lwf.employer,
    employeeTds: tdsFor(grossPay, wage),
  }
}
