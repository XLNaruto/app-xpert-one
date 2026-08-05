import type { Path } from 'react-hook-form'
import type { EmployeeBasicFormValues } from '../schemas'

/**
 * The two address blocks' field names.
 *
 * The employee record carries the same nine address columns twice, either side of a
 * `current` / `permanent` prefix. Naming both sets explicitly — rather than
 * building paths from a prefix string — keeps them checked against the form type,
 * so a renamed field is a compile error instead of a silently dead binding.
 */
export interface AddressFieldNames {
  address1: Path<EmployeeBasicFormValues>
  address2: Path<EmployeeBasicFormValues>
  address3: Path<EmployeeBasicFormValues>
  country: Path<EmployeeBasicFormValues>
  stateId: Path<EmployeeBasicFormValues>
  districtId: Path<EmployeeBasicFormValues>
  taluka: Path<EmployeeBasicFormValues>
  city: Path<EmployeeBasicFormValues>
  pinCode: Path<EmployeeBasicFormValues>
}

/** Where the employee lives now. */
export const CURRENT_ADDRESS_FIELDS: AddressFieldNames = {
  address1: 'currentAddress1',
  address2: 'currentAddress2',
  address3: 'currentAddress3',
  country: 'currentCountry',
  stateId: 'currentStateId',
  districtId: 'currentDistrictId',
  taluka: 'currentTaluka',
  city: 'currentCity',
  pinCode: 'currentPinCode',
}

/** The employee's home address. */
export const PERMANENT_ADDRESS_FIELDS: AddressFieldNames = {
  address1: 'permanentAddress1',
  address2: 'permanentAddress2',
  address3: 'permanentAddress3',
  country: 'permanentCountry',
  stateId: 'permanentStateId',
  districtId: 'permanentDistrictId',
  taluka: 'permanentTaluka',
  city: 'permanentCity',
  pinCode: 'permanentPinCode',
}
