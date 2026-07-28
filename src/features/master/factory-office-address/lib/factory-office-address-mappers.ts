import type { FactoryOfficeAddressFormValues } from '../schemas'
import type { FactoryOfficeAddress } from '../types'

/** The user-editable half of a record — identity and audit fields are the API's. */
export type FactoryOfficeAddressEditableFields = Omit<
  FactoryOfficeAddress,
  'id' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'
>

/** Validated form values → the stored record's editable half. */
export function factoryOfficeAddressFromFormValues(
  values: FactoryOfficeAddressFormValues,
): FactoryOfficeAddressEditableFields {
  return { ...values }
}

/** Hydrate the edit form from a stored factory office address. */
export function factoryOfficeAddressToFormValues(
  record: FactoryOfficeAddress,
): FactoryOfficeAddressFormValues {
  return {
    officeName: record.officeName,
    officeCode: record.officeCode,
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
export function formatAddress(record: FactoryOfficeAddress): string {
  const parts = [
    record.addressLine1,
    record.addressLine2,
    record.addressLine3,
    record.city,
    record.pinCode,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
