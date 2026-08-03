import type {
  AllowanceDeductionFormValues,
  PayComponentResponse,
  PayComponentUpdatePayload,
} from '../schemas'
import type { AllowanceDeduction, AllowanceDeductionType } from '../types'

/**
 * The API spells the component type lowercase (`allowance` / `deduction`); the
 * UI holds it uppercase. These two keep the casing at the wire boundary.
 *
 * Anything unrecognised reads as a deduction — the conservative side, since an
 * allowance mistakenly added to pay costs money.
 */
function toType(type: string): AllowanceDeductionType {
  return type.toUpperCase() === 'ALLOWANCE' ? 'ALLOWANCE' : 'DEDUCTION'
}

function toApiType(type: AllowanceDeductionType): PayComponentUpdatePayload['type'] {
  return type === 'ALLOWANCE' ? 'allowance' : 'deduction'
}

/**
 * API record → the UI allowance / deduction. The audit trail only comes back on
 * the list rows; on a single-record response it's absent and renders as a dash.
 */
export function toAllowanceDeduction(
  response: PayComponentResponse,
): AllowanceDeduction {
  return {
    id: response.id,
    companyId: response.company_id,
    type: toType(response.type),
    name: response.name,
    shortName: response.short_code,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at,
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a record between
 * tenants, so the update body stops here.
 */
export function allowanceDeductionToPayload(
  values: AllowanceDeductionFormValues,
): PayComponentUpdatePayload {
  return {
    short_code: values.shortName.trim(),
    name: values.name.trim(),
    type: toApiType(values.type),
  }
}

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
