import type { ComboboxOption } from '@/components/ui/combobox'
import type { DesignationFormValues, WageStructureRow } from './schemas'

/** Days a monthly salary is divided by to arrive at the wage per day. */
export const WAGE_DAYS_PER_MONTH = 26

/** How the salary is quoted for the designation. */
export const SALARY_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Daily', value: 'Daily' },
  { label: 'Fix (Monthly)', value: 'Fix' },
]

/** Display label for a stored salary type — "Fix" doesn't read on its own. */
export const SALARY_TYPE_LABELS: Record<string, string> = {
  Daily: 'Daily',
  Fix: 'Fix (Monthly)',
}

/** How the month's paid working days are arrived at. */
export const WORKING_DAY_CALCULATION_OPTIONS: ComboboxOption[] = [
  { label: 'Fixed', value: 'Fixed' },
  { label: 'As Per Calculation', value: 'As Per Calculation' },
]

/** Weekly off day — asked only when working days are calculated. */
export const WEEKLY_OFF_OPTIONS: ComboboxOption[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
].map((d) => ({ label: d, value: d }))

/** How the employee's PF share is worked out. */
export const PF_DEDUCTION_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Fixed', value: 'Fixed' },
  { label: 'Percentage', value: 'Percentage' },
]

/** What the ESIC contribution is calculated on. */
export const ESIC_DEDUCTION_BASIS_OPTIONS: ComboboxOption[] = [
  { label: 'Gross Salary', value: 'Gross Salary' },
  { label: 'Earned Salary', value: 'Earned Salary' },
  { label: 'Basic Salary', value: 'Basic Salary' },
]

/** Slab-driven or hand-entered — shared by PT and LWF. */
export const ACT_AMOUNT_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'As Per Act', value: 'As Per Act' },
  { label: 'Manual', value: 'Manual' },
]

/** How the overtime rate is arrived at. */
export const OVERTIME_CALCULATION_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Manual', value: 'Manual' },
  { label: 'As Per Calculation', value: 'As Per Calculation' },
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

  lwfActApplicable: false,
  lwfActType: 'As Per Act',
  lwfAmount: '',

  overtimeApplicable: false,
  overtimeCalculationType: 'As Per Calculation',
  overtimeRatePerHour: '',

  allowances: [],
  deductions: [],
}

/* ── Wage structure history ─────────────────────────────────────────────── */

/**
 * Allowance heads that make up a wage structure row, in column order. Fixed
 * rather than master-driven: the grid's columns have to stay stable across the
 * whole history, so a head added to the master later doesn't shift older rows.
 */
export const WAGE_ALLOWANCE_HEADS = [
  { code: 'LOC', label: 'Local Conveyance' },
  { code: 'BONUS', label: 'Bonus' },
  { code: 'EDU', label: 'Education Allowance' },
  { code: 'WA', label: 'Washing Allowance' },
  { code: 'UNIFORM', label: 'Uniform Allowance' },
  { code: 'SPA', label: 'Special Allowance' },
  { code: 'CAR', label: 'Car Allowance' },
  { code: 'MEDI', label: 'Medical Allowance' },
  { code: 'CONV', label: 'Conveyance Allowance' },
  { code: 'HRA', label: 'House Rent Allowance' },
] as const

/** Deduction heads that make up a wage structure row, in column order. */
export const WAGE_DEDUCTION_HEADS = [
  { code: 'TDS', label: 'Tax Deducted at Source' },
  { code: 'ELE', label: 'Electricity' },
  { code: 'SERVICE', label: 'Service Charge' },
  { code: 'WATER', label: 'Water' },
  { code: 'RENT', label: 'Rent' },
  { code: 'ADV', label: 'Advance' },
] as const

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

/** How the overtime rate is arrived at inside the grid. */
export const WAGE_OVERTIME_CALCULATION_OPTIONS: ComboboxOption[] = [
  { label: 'Auto', value: 'Auto' },
  { label: 'Manual', value: 'Manual' },
]

/** What ESIC is deducted on. */
export const WAGE_ESIC_DEDUCTION_BASIS_OPTIONS: ComboboxOption[] = [
  { label: 'Wage Ceiling', value: 'Wage Ceiling' },
  { label: 'Gross Salary', value: 'Gross Salary' },
  { label: 'As Per ACT', value: 'As Per ACT' },
]

/** Slab-driven or hand-entered, abbreviated to fit the grid's narrow columns. */
export const WAGE_ACT_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Act', value: 'As Per Act' },
  { label: 'Manual', value: 'Manual' },
]

/** How far back and forward the effective-from month picker reaches. */
export const EFFECTIVE_MONTH_RANGE = { back: 12, forward: 12 } as const

/** A blank draft row — one entry per head, nothing valued, no act applied. */
export const EMPTY_WAGE_STRUCTURE_ROW: WageStructureRow = {
  effectiveFrom: '',

  workingDayCalculationType: 'Fixed',
  weeklyOff: 'Sunday',
  workingDays: '',
  salaryType: 'Monthly',
  basicPay: '',
  wagePerDay: '',
  extraDayAmountPerDay: '',

  allowances: WAGE_ALLOWANCE_HEADS.map((head) => ({
    head: head.code,
    valueType: 'Percentage' as const,
    amount: '',
    pfApplicable: false,
    esicApplicable: false,
    ptApplicable: false,
  })),
  deductions: WAGE_DEDUCTION_HEADS.map((head) => ({
    head: head.code,
    valueType: 'Fixed' as const,
    amount: '',
  })),

  overtimeApplicable: false,
  overtimeCalculationType: 'Auto',
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

  lwfActApplicable: false,
  lwfActType: 'As Per Act',
  lwfAmount: '',
}
