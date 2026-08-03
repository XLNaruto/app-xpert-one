import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  BranchFormValues,
  BranchResponse,
  BranchUpdatePayload,
} from '../schemas'
import type { Branch } from '../types'
import type { BranchActsFormValues } from './act-mappers'

/**
 * The branch half of the form — everything `/user/branches` itself stores. The
 * acts half is seeded separately, from its own endpoint.
 */
export type BranchDetailFormValues = Omit<BranchFormValues, keyof BranchActsFormValues>

/** Trimmed value, or `null` when blank — how the API stores "not recorded". */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * API record → the UI branch. Nullable columns read as empty strings, and the
 * audit trail only comes back on the list rows — on a single-record response
 * it's absent and the audit columns render a dash.
 *
 * The state and district names come off the record alongside their ids where
 * the API resolves them; a name it left out reads as a dash.
 */
export function toBranch(response: BranchResponse): Branch {
  return {
    id: response.id,
    companyId: response.company_id,
    branchName: response.branch_name,
    registrationNumber: response.registration_number ?? '',
    panNumber: response.pan_number ?? '',
    gstNumber: response.gst_number ?? '',
    addressLine1: response.address1 ?? '',
    addressLine2: response.address2 ?? '',
    addressLine3: response.address3 ?? '',
    stateId: response.state_id,
    stateName: response.state_name || '—',
    districtId: response.district_id,
    districtName: response.district_name || '—',
    city: response.city ?? '',
    pinCode: response.pin_code ?? '',
    phone: response.phone ?? '',
    mobile1: response.mobile_number1 ?? '',
    mobile2: response.mobile_number2 ?? '',
    email: response.email ?? '',
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at,
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update. The
 * create call adds `company_id` on top; an edit can't move a branch between
 * companies, so the update body stops here.
 */
export function branchToPayload(values: BranchFormValues): BranchUpdatePayload {
  return {
    branch_name: values.branchName.trim(),
    registration_number: orNull(values.registrationNumber),
    pan_number: orNull(values.panNumber.toUpperCase()),
    gst_number: orNull(values.gstNumber.toUpperCase()),
    address1: orNull(values.addressLine1),
    address2: orNull(values.addressLine2),
    address3: orNull(values.addressLine3),
    state_id: values.stateId ? Number(values.stateId) : null,
    district_id: values.districtId ? Number(values.districtId) : null,
    city: orNull(values.city),
    pin_code: orNull(values.pinCode),
    phone: orNull(values.phone),
    mobile_number1: orNull(values.mobile1),
    mobile_number2: orNull(values.mobile2),
    email: orNull(values.email),
  }
}

/**
 * Dropdown options for the pickers that pin something to a branch. The value is
 * the branch's **id** — that's what `branch_id` expects — while the label is the
 * name the user picks by.
 */
export function branchOptions(branches: Branch[]): ComboboxOption[] {
  return branches.map((branch) => ({
    label: branch.branchName,
    value: String(branch.id),
  }))
}

/** Hydrate the branch half of the edit form from a stored branch. */
export function branchToFormValues(branch: Branch): BranchDetailFormValues {
  return {
    branchName: branch.branchName,
    registrationNumber: branch.registrationNumber,
    panNumber: branch.panNumber,
    gstNumber: branch.gstNumber,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    addressLine3: branch.addressLine3,
    stateId: branch.stateId === null ? '' : String(branch.stateId),
    districtId: branch.districtId === null ? '' : String(branch.districtId),
    city: branch.city,
    pinCode: branch.pinCode,
    phone: branch.phone,
    mobile1: branch.mobile1,
    mobile2: branch.mobile2,
    email: branch.email,
  }
}
