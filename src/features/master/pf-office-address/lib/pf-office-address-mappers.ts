import type { PfOfficeAddressFormValues } from '../schemas'
import type { PfOfficeAddress } from '../types'

/** The user-editable half of a record — identity and audit fields are the API's. */
export type PfOfficeAddressEditableFields = Omit<
  PfOfficeAddress,
  'id' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'
>

/** Validated form values → the stored record's editable half. */
export function pfOfficeAddressFromFormValues(
  values: PfOfficeAddressFormValues,
): PfOfficeAddressEditableFields {
  return { ...values }
}

/** Hydrate the edit form from a stored PF office address. */
export function pfOfficeAddressToFormValues(
  record: PfOfficeAddress,
): PfOfficeAddressFormValues {
  return {
    officeName: record.officeName,
    officeCode: record.officeCode,
    officeType: record.officeType,
    mobile: record.mobile,
    phone: record.phone,
    email: record.email,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    addressLine3: record.addressLine3,
    state: record.state,
    district: record.district,
    city: record.city,
    pinCode: record.pinCode,
  }
}

/** The address lines joined for a single-line table cell; blank → dash. */
export function formatAddress(record: PfOfficeAddress): string {
  const parts = [
    record.addressLine1,
    record.addressLine2,
    record.addressLine3,
    record.city,
    record.pinCode,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
