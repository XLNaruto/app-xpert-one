export { DesignationListPage } from './pages/designation-list-page'
export { DesignationCreatePage } from './pages/designation-create-page'
export { useDesignations } from './api/use-designations'
export { useDesignation } from './api/use-designation'
export { useDesignationWageStructures } from './api/use-designation-wage-structures'
export type {
  AllowanceValueType,
  Designation,
  DesignationSalaryComponent,
  DesignationWageStructure,
  WageAllowance,
  WageDeduction,
} from './types'
export type { DesignationFormValues, WageStructureRow } from './schemas'

/* ── The wage structure kit ─────────────────────────────────────────────────
 *
 * A wage structure is a designation's, so it's modelled and mapped here — but
 * it is configured from two screens: this master's Wage Structure tab, one
 * designation at a time down its effective-dated history, and HR's bulk wage
 * screen, every designation at once against one month. Both show the same forty
 * columns and both write the same fields, so the row shape, the enum crossings
 * and the mappers are shared from here rather than restated over there.
 */

export { ALLOWANCE_VALUE_TYPES, toValueType } from './lib/api-enums'
export { useWageHeads } from './api/use-wage-heads'
export type { WageHead, WageHeads } from './lib/wage-structure-mappers'
/**
 * The grid itself. Two screens render it: this master's own effective-dated
 * history, and HR's employee wage override, which is the same forty columns
 * against one person instead of a title. It's typed structurally on the form
 * hook, so a screen supplies its own `use…WageForm` of the same shape.
 */
export { WageStructureGrid } from './components/wage-structure-grid'
export { revealFirstError } from './lib/wage-grid-errors'

/* ── The payout schedule ────────────────────────────────────────────────────
 *
 * Every allowance / deduction head carries four settings on top of its amount
 * and its act chips — a payout frequency (with a start-month anchor), an amount
 * mode, a payroll-calculation gate — plus, on a deduction, the base it is priced
 * on. Four screens configure them and the salary register does the arithmetic,
 * so the enums, the coupling rules and the month maths are shared from here.
 */
export {
  ComponentScheduleCell,
  ComponentScheduleField,
  ComponentScheduleInline,
  ComponentScheduleSummary,
} from './components/component-schedule-field'
export {
  AMOUNT_MODES,
  CALCULATION_BASES,
  DEFAULT_CALCULATION_BASE,
  TDS_CALCULATION_BASES,
  DEFAULT_COMPONENT_SCHEDULE,
  DEFAULT_START_MONTH,
  MONTHS_PER_PAYOUT,
  PAYOUT_FREQUENCIES,
  PAYROLL_CALCULATIONS,
  isDefaultSchedule,
  monthName,
  needsStartMonth,
  payoutTiming,
  resolveSchedule,
  shortMonthName,
  supportsAccrual,
  toAmountMode,
  toCalculationBase,
  toPayoutFrequency,
  toPayrollCalculation,
  toStartMonthNumber,
  toStartMonthValue,
  toTdsCalculationBase,
} from './lib/component-schedule'
export type {
  AmountMode,
  CalculationBase,
  ComponentSchedule,
  PayoutFrequency,
  PayoutTiming,
  PayrollCalculation,
  TdsCalculationBase,
} from './lib/component-schedule'
export {
  AMOUNT_MODE_OPTIONS,
  AMOUNT_TYPE_OPTIONS,
  CALCULATION_BASE_OPTIONS,
  TDS_CALCULATION_BASE_HINT,
  TDS_CALCULATION_BASE_OPTIONS,
  tdsBaseLabel,
  PAYOUT_FREQUENCY_OPTIONS,
  PAYROLL_CALCULATION_OPTIONS,
  START_MONTH_OPTIONS,
} from './constants'
export { schedulePayload } from './lib/wage-structure-mappers'
export { NO_WAGE_HEADS } from './lib/wage-structure-mappers'
export {
  blankWageStructureRow,
  carryForwardWageRow,
  toWageStructure,
  wageRowToPayload,
  wageStructureToRow,
  zeroedWageStructureRow,
} from './lib/wage-structure-mappers'
export { deriveOvertimeRate, deriveWages } from './lib/wage-structure-calculations'
export { effectiveMonthBounds, formatMonth } from './lib/effective-month'
export {
  missingWageField,
  salaryComponentResponseSchema,
  wageStructureFormSchema,
  wageStructureResponseSchema,
  wageStructureRowBaseSchema,
} from './schemas'
export type {
  SalaryComponentPayload,
  SalaryComponentResponse,
  WageStructureFormValues,
  WageStructurePayload,
  WageStructureResponse,
} from './schemas'
export {
  WAGE_ACT_TYPE_OPTIONS,
  WAGE_ESIC_DEDUCTION_BASIS_OPTIONS,
  WAGE_SALARY_TYPE_OPTIONS,
  WAGE_WEEKLY_OFF_OPTIONS,
  WORKING_DAY_CALCULATION_OPTIONS,
} from './constants'
