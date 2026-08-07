export { DesignationListPage } from './pages/designation-list-page'
export { DesignationCreatePage } from './pages/designation-create-page'
export { useDesignations } from './api/use-designations'
export { useDesignation } from './api/use-designation'
export { useDesignationWageStructures } from './api/use-designation-wage-structures'
export type {
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

export { useWageHeads } from './api/use-wage-heads'
export type { WageHead, WageHeads } from './lib/wage-structure-mappers'
export {
  blankWageStructureRow,
  toWageStructure,
  wageRowToPayload,
  wageStructureToRow,
} from './lib/wage-structure-mappers'
export { deriveOvertimeRate, deriveWages } from './lib/wage-structure-calculations'
export { effectiveMonthBounds, formatMonth } from './lib/effective-month'
export {
  missingWageField,
  salaryComponentResponseSchema,
  wageStructureResponseSchema,
  wageStructureRowBaseSchema,
} from './schemas'
export type {
  SalaryComponentPayload,
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
