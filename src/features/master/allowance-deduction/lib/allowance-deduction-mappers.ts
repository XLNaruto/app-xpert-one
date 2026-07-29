import type { AllowanceDeductionFormValues } from '../schemas'
import type { AllowanceDeduction } from '../types'

/** Hydrate the edit form from a stored allowance / deduction. */
export function allowanceDeductionToFormValues(
  record: AllowanceDeduction,
): AllowanceDeductionFormValues {
  return {
    type: record.type,
    name: record.name,
    shortName: record.shortName,
  }
}
