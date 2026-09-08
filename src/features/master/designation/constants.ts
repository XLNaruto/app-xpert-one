import type { ComboboxOption } from '@/components/ui/combobox'
import { currencySymbol } from '@/lib/currency'
import { monthName } from './lib/component-schedule'
import type {
  AmountMode,
  PayoutFrequency,
  PayrollCalculation,
} from './lib/component-schedule'
import type { DesignationFormValues, WageStructureRow } from './schemas'
import type { AllowanceValueType } from './types'

/** Days a monthly salary is divided by to arrive at the wage per day. */
export const WAGE_DAYS_PER_MONTH = 26

/**
 * The `sort` values `/user/designations` accepts — the endpoint orders by the
 * title or the creation stamp and nothing else. Sorting is server-side, so a
 * column is sortable only if it appears here: the list gives each of these the
 * API's field name as its column id and marks the rest unsortable.
 */
export const DESIGNATION_SORT = {
  designationName: 'name',
  createdAt: 'created_at',
} as const

/**
 * Newest designation first — the order the list opens in and reverts to. This is
 * not the endpoint's own default (name A→Z), so it's always sent.
 */
export const DESIGNATION_DEFAULT_SORT = { id: DESIGNATION_SORT.createdAt, desc: true }

/**
 * The edit screen's tabs, in the order they're shown. The values double as the
 * screen's `?tab=` search param, so the route can validate against this list and
 * a refresh comes back to the tab that was open.
 */
export const DESIGNATION_FORM_TABS = ['basic', 'wage', 'leave'] as const

export type DesignationFormTab = (typeof DESIGNATION_FORM_TABS)[number]

/** How the salary is quoted for the designation. */
export const SALARY_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Daily', value: 'Daily' },
  { label: 'Fix (Monthly)', value: 'Fix' },
]

/** How the month's paid working days are arrived at. */
export const WORKING_DAY_CALCULATION_OPTIONS: ComboboxOption[] = [
  { label: 'Fixed', value: 'Fixed' },
  { label: 'As Per Calculation', value: 'As Per Calculation' },
]

/**
 * Weekly off day — asked only when working days are calculated. "Rotation" is
 * one of the API's own answers, for a roster with no fixed off day.
 */
export const WEEKLY_OFF_OPTIONS: ComboboxOption[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Rotation',
].map((d) => ({ label: d, value: d }))

/** How the employee's PF share is worked out. */
export const PF_DEDUCTION_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Fixed', value: 'Fixed' },
  { label: 'Percentage', value: 'Percentage' },
]

/**
 * What the ESIC contribution is calculated on — the three answers the API's
 * `esic_deduction_basis` accepts, spelled its way.
 */
export const ESIC_DEDUCTION_BASIS_OPTIONS: ComboboxOption[] = [
  { label: 'Wage Ceiling', value: 'Wage Ceiling' },
  { label: 'Gross Salary', value: 'Gross Salary' },
  { label: 'As Per Act', value: 'As Per Act' },
]

/** Slab-driven or hand-entered — shared by PT and LWF. */
export const ACT_AMOUNT_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'As Per Act', value: 'As Per Act' },
  { label: 'Manual', value: 'Manual' },
]

/** Blank form values for a brand-new designation. */
export const EMPTY_DESIGNATION_FORM: DesignationFormValues = {
  designationName: '',

  salaryType: '',
  basicPay: '',
  workingDayCalculationType: 'Fixed',
  workingDays: '',
  weeklyOff: '',
  extraDayAmountPerDay: '',

  pfActApplicable: true,
  pfDeductionType: 'Percentage',
  pfDeductionValue: '',
  employeePfContributionOnWageLimit: false,
  employerPfContributionOnWageLimit: false,

  esicActApplicable: true,
  esicDeductionBasis: '',

  ptActApplicable: true,
  ptActType: 'As Per Act',
  ptAmount: '',

  tdsActApplicable: false,
  tdsPercentage: '',
  tdsCalculationBase: '',

  lwfActApplicable: false,
  lwfActType: 'As Per Act',
  lwfAmount: '',

  overtimeApplicable: false,
  overtimeRatePerHour: '',

  allowances: [],
  deductions: [],
}

/* ── Wage structure history ─────────────────────────────────────────────── */

/** How the wage is quoted in a wage structure row. */
export const WAGE_SALARY_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Daily', value: 'Daily' },
  { label: 'Monthly', value: 'Monthly' },
]

/**
 * Weekly off inside the grid — the designation form's list plus an explicit
 * "None", since a wage structure row always records one answer or the other.
 */
export const WAGE_WEEKLY_OFF_OPTIONS: ComboboxOption[] = [
  ...WEEKLY_OFF_OPTIONS,
  { label: 'None', value: 'None' },
]

/** What ESIC is deducted on. */
export const WAGE_ESIC_DEDUCTION_BASIS_OPTIONS: ComboboxOption[] =
  ESIC_DEDUCTION_BASIS_OPTIONS

/** Slab-driven or hand-entered, abbreviated to fit the grid's narrow columns. */
export const WAGE_ACT_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Act', value: 'As Per Act' },
  { label: 'Manual', value: 'Manual' },
]

/** How far back and forward the effective-from month picker reaches. */
export const EFFECTIVE_MONTH_RANGE = { back: 12, forward: 12 } as const

/**
 * A blank draft row, less its heads — nothing valued, no act applied.
 *
 * The heads themselves come from the allowance / deduction master, so a row is
 * only complete once that has loaded: `blankWageStructureRow(heads)` spreads this
 * and fills both sides in. Nothing here is nested, so that spread is a full copy.
 */
export const EMPTY_WAGE_STRUCTURE_ROW: WageStructureRow = {
  effectiveFrom: '',

  /* A designation's row IS the head catalog, so its heads are always its own.
     Only the employee wage screen ever turns this off. */
  ownHeads: true,

  workingDayCalculationType: 'Fixed',
  weeklyOff: 'Sunday',
  workingDays: '',
  salaryType: 'Monthly',
  basicPay: '',
  wagePerDay: '',
  extraDayAmountPerDay: '',

  /* Filled from the master by `blankWageStructureRow`. */
  allowances: [],
  deductions: [],

  overtimeApplicable: false,
  overtimeRatePerHour: '',

  pfActApplicable: false,
  employeePfContributionOnWageLimit: false,
  employerPfContributionOnWageLimit: false,
  pfValueType: 'Percentage',
  pfValue: '12',

  esicActApplicable: false,
  esicDeductionBasis: '',

  ptActApplicable: false,
  ptActType: 'As Per Act',
  ptAmount: '',

  tdsActApplicable: false,
  tdsPercentage: '',
  tdsCalculationBase: '',

  lwfActApplicable: false,
  lwfActType: 'As Per Act',
  lwfAmount: '',
}

/* ── Payout schedule ────────────────────────────────────────────────────────
 *
 * The labels behind the four (five, on a deduction) settings every allowance /
 * deduction head now carries. The values are the API's own enums — see
 * `lib/component-schedule.ts`, which owns the types, the coupling rules and the
 * month arithmetic; this file only says how each answer is written on screen.
 */

/**
 * How often the head is paid out.
 *
 * `short` is what a grid chip has room for, and `hint` is the control's own
 * tooltip — the abbreviations ("2 Mo", "Qtr") are not self-explaining, and the
 * consequence of each choice (which months the head actually pays in) is the
 * thing being decided.
 */
export const PAYOUT_FREQUENCY_OPTIONS: {
  value: PayoutFrequency
  label: string
  short: string
  hint: string
}[] = [
  {
    value: 'MONTHLY',
    label: 'Monthly',
    short: 'Monthly',
    hint: 'Paid every month. No start month, and always Per Payout.',
  },
  {
    value: 'BI_MONTHLY',
    label: 'Every 2 Months',
    short: '2 Mo',
    hint: 'Paid once every 2 months — six payouts a year, counted from the start month.',
  },
  {
    value: 'QUARTERLY',
    label: 'Quarterly',
    short: 'Qtr',
    hint: 'Paid once every 3 months — four payouts a year, counted from the start month.',
  },
  {
    value: 'HALF_YEARLY',
    label: 'Half Yearly',
    short: 'Half',
    hint: 'Paid twice a year, six months apart, counted from the start month.',
  },
  {
    value: 'ANNUAL',
    label: 'Annual',
    short: 'Annual',
    hint: 'Paid once a year, in the start month.',
  },
]

/** What the configured figure means across a non-monthly cycle. */
export const AMOUNT_MODE_OPTIONS: {
  value: AmountMode
  label: string
  hint: string
}[] = [
  {
    value: 'PER_PAYOUT',
    label: 'Per Payout',
    hint: 'The figure entered is paid in full in each payout month.',
  },
  {
    value: 'ACCRUED',
    label: 'Accrued',
    hint: 'The figure entered accrues every month, and the payout month releases the whole period at once — a quarterly head pays three times the figure.',
  },
]

/** Why "Accrued" is dead on a monthly head — the design's own wording. */
export const ACCRUED_ON_MONTHLY_HINT =
  'Always Per Payout on a monthly payout — there is nothing to accumulate'

/** Whether the head enters the base the other heads calculate on. */
export const PAYROLL_CALCULATION_OPTIONS: {
  value: PayrollCalculation
  label: string
  hint: string
}[] = [
  {
    value: 'INCLUDE',
    label: 'Include',
    hint: 'Counts towards the base the other heads calculate on — and towards PF, ESI and PT wherever this head’s own chip is set.',
  },
  {
    value: 'EXCLUDE',
    label: 'Exclude',
    hint: 'Still paid, and still in gross pay — but kept out of every base, the statutory ones included, whatever this head’s chips say.',
  },
]

/** What EXCLUDE actually does — said next to the control, since it surprises. */
export const PAYROLL_CALCULATION_HINT =
  'An excluded head is still paid and still lands in gross pay — it is only kept out of every base the other heads calculate on.'

/**
 * What a deduction head is priced on. The labels are the design's, including
 * "Total Satutory Cost" — spelled the API's way so the two can be matched up.
 */
export const CALCULATION_BASE_OPTIONS: ComboboxOption[] = [
  {
    label: 'Basic Earned For Present Days',
    value: 'BASIC_EARNED_FOR_PRESENT_DAYS',
    hint: 'default',
  },
  { label: 'Basic Pay', value: 'BASIC_PAY' },
  { label: 'Gross Pay', value: 'GROSS_PAY' },
  { label: 'Net Pay', value: 'NET_PAY' },
  { label: 'Total Satutory Cost', value: 'TOTAL_STATUTORY_COST' },
  { label: 'Total Invoice Amount', value: 'TOTAL_INVOICE_AMOUNT' },
]

/**
 * What a **TDS** rate is quoted on — five of the six bases.
 *
 * A percentage on its own cannot say what it applies to: contractor TDS under
 * section 194C is 2% of the TOTAL BILL, which is not a wage figure at all. So the
 * wage structure names the amount alongside the rate, and leaving it empty
 * deducts nothing — a rate with no base is inert.
 *
 * `NET_PAY` is deliberately absent and the API refuses it with a 400: the net
 * already has TDS taken out of it, so quoting TDS on it would make it an input to
 * itself. It stays a legitimate choice for an ordinary deduction HEAD's
 * `calculation_base`, which is a different question.
 */
export const TDS_CALCULATION_BASE_OPTIONS: ComboboxOption[] =
  CALCULATION_BASE_OPTIONS.filter((option) => option.value !== 'NET_PAY')

/**
 * A stored TDS base as a read-only row prints it. `null` — nothing recorded —
 * reads as a dash rather than a guessed base: that month deducted nothing.
 */
export function tdsBaseLabel(base: string | null | undefined): string | null {
  if (!base) return null
  return (
    TDS_CALCULATION_BASE_OPTIONS.find((option) => option.value === base)?.label ?? base
  )
}

/** Said next to the TDS base picker — an empty base is not an inert setting. */
export const TDS_CALCULATION_BASE_HINT =
  'What the TDS rate is charged on. Left empty nothing is deducted at all — a percentage with no base cannot say what it applies to.'

/**
 * NET_PAY as a *base* is gross less the statutory five only — it deliberately
 * leaves out the very deduction heads being priced on it, which is why it never
 * equals the net printed at the foot of the payslip.
 */
export const NET_PAY_BASE_HINT =
  'Gross less PF, ESIC, PT, LWF and TDS only — not the net printed on the payslip.'

/**
 * How a head's configured figure is read — the four `amount_type` answers.
 *
 * `unit` is what a cell prints beside the figure, and `hint` is the toggle's own
 * tooltip, because the last two are the pair that gets confused: a `Per Day` rate
 * pays the payable days as they stand (extra days included), while a `Days` count
 * is a whole-month entitlement and so is prorated down by a short month.
 */
export const AMOUNT_TYPE_OPTIONS: {
  value: AllowanceValueType
  label: string
  unit: string
  hint: string
}[] = [
  {
    value: 'Percentage',
    label: 'Percentage',
    unit: '%',
    hint: 'A share of the base this head is calculated on — the earned basic on an allowance, the named base on a deduction.',
  },
  {
    value: 'Fixed',
    label: 'Fixed',
    unit: currencySymbol(),
    hint: 'A monthly rupee figure, prorated by attendance — 13 of 26 days pays half.',
  },
  {
    value: 'Per Day',
    label: 'Per Day',
    unit: `${currencySymbol()}/day`,
    hint: 'A rupee rate for each payable day. Not prorated again — the day count already carries the attendance, so 29 payable days against a 26-day month pay all 29.',
  },
  {
    value: 'Days',
    label: 'Days',
    unit: 'days',
    hint: 'A count of days at the day’s wage — an entitlement for a full month, so a 25-of-26-day month accrues 25/26 of it, capped at the month.',
  },
]

/** Only a percentage is capped at 100 — a day rate and a day count are not. */
export const CAPPED_VALUE_TYPES: AllowanceValueType[] = ['Percentage']

/** The twelve months the START MONTH anchor picks from, as `1`–`12`. */
export const START_MONTH_OPTIONS: ComboboxOption[] = Array.from(
  { length: 12 },
  (_, index) => ({ label: monthName(index + 1), value: String(index + 1) }),
)
