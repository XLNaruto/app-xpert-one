import type { ComboboxOption } from '@/components/ui/combobox'
import type { DesignationFormValues, WageStructureRow } from './schemas'

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
export const DESIGNATION_FORM_TABS = ['basic', 'wage'] as const

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

  lwfActApplicable: false,
  lwfActType: 'As Per Act',
  lwfAmount: '',
}
