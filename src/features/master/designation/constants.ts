import type { ComboboxOption } from '@/components/ui/combobox'
import type { DesignationFormValues } from './schemas'

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
