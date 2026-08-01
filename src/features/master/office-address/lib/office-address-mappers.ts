import type {
  OfficeAddressFormValues,
  OfficeAddressPayload,
  OfficeAddressResponse,
} from '../schemas'
import type { OfficeAddress, OfficeFor } from '../types'

/** Trimmed value, or `null` when blank — how the API stores "not recorded". */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * API record → the UI address. Nullable columns read as empty strings, and since
 * the API only tracks `created_at` the rest of the audit trail stays empty (the
 * audit columns render a dash for it).
 *
 * Names come off the record when the API sends them. `stateName`/`districtName`
 * are a fallback for the callers that resolve them another way (the edit form
 * looks its one record's names up); a name neither source has reads as a dash.
 */
export function toOfficeAddress(
  response: OfficeAddressResponse,
  stateName?: string,
  districtName?: string,
): OfficeAddress {
  return {
    id: response.id,
    // A record with no `office_for` can't belong to a screen; treat it as PF's
    // rather than widening the type, and the list filter will place it there.
    officeFor: (response.office_for ?? 'PF') as OfficeFor,
    officeName: response.office_name ?? '',
    officeCode: response.office_code ?? '',
    officeType: response.office_type ?? '',
    mobile: response.mobile_number ?? '',
    phone: response.phone_number ?? '',
    email: response.email ?? '',
    addressLine1: response.address1 ?? '',
    addressLine2: response.address2 ?? '',
    addressLine3: response.address3 ?? '',
    stateId: response.state_id,
    stateName: response.state_name || stateName || '—',
    districtId: response.district_id,
    districtName: response.district_name || districtName || '—',
    city: response.city ?? '',
    pinCode: response.pin_code ?? '',
    createdBy: '',
    createdAt: response.created_at,
    updatedBy: null,
    updatedAt: null,
  }
}

/**
 * Validated form values → the create/update request body. `officeFor` comes from
 * the screen doing the saving, not the form — it's what files the record under
 * one of the five screens.
 */
export function officeAddressToPayload(
  values: OfficeAddressFormValues,
  officeFor: OfficeFor,
): OfficeAddressPayload {
  return {
    office_for: officeFor,
    office_name: values.officeName.trim(),
    office_code: orNull(values.officeCode),
    office_type: orNull(values.officeType),
    mobile_number: orNull(values.mobile),
    phone_number: orNull(values.phone),
    email: orNull(values.email),
    address1: orNull(values.addressLine1),
    address2: orNull(values.addressLine2),
    address3: orNull(values.addressLine3),
    state_id: values.stateId ? Number(values.stateId) : null,
    district_id: values.districtId ? Number(values.districtId) : null,
    city: orNull(values.city),
    pin_code: orNull(values.pinCode),
  }
}

/** Hydrate the edit form from a stored office address. */
export function officeAddressToFormValues(
  record: OfficeAddress,
): OfficeAddressFormValues {
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
    stateId: record.stateId === null ? '' : String(record.stateId),
    districtId: record.districtId === null ? '' : String(record.districtId),
    city: record.city,
    pinCode: record.pinCode,
  }
}

/** The address lines joined for a single-line table cell; blank → dash. */
export function formatAddress(record: OfficeAddress): string {
  const parts = [
    record.addressLine1,
    record.addressLine2,
    record.addressLine3,
    record.city,
    record.pinCode,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
