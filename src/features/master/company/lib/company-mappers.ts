import type { CompanyFormValues, CompanyPayload, CompanyResponse } from '../schemas'
import type { Company, CompanyBilling } from '../types'

/** Trimmed value, or `null` when blank — how the API stores "not recorded". */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * API record → the UI company. Nullable columns read as empty strings, and the
 * audit trail only comes back on the list rows — on a single-record response
 * it's absent and the audit columns render a dash.
 *
 * The state and district names come off the record alongside their ids, so no
 * screen has to join the geography masters; a name the API left out reads as a
 * dash.
 */
export function toCompany(response: CompanyResponse): Company {
  return {
    id: response.id,
    companyName: response.company_name,
    companyCode: response.company_code,
    establishYear: response.establish_year === null ? '' : String(response.establish_year),
    logo: response.logo ?? '',
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
    billing: toBilling(response.billing),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at,
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * The billing block off a response — `null` where the company has never
 * configured charges, which is "not configured" rather than zero.
 */
function toBilling(response: CompanyResponse['billing']): CompanyBilling | null {
  if (!response) return null
  return {
    effectiveFrom: response.effective_from ?? '',
    agencyChargePercentage: response.agency_charge_percentage ?? null,
    gstPercentage: response.gst_percentage ?? null,
  }
}

/**
 * Validated form values → the create/update request body.
 *
 * `billingTouched` is load-bearing. Sending either percentage opens or patches a
 * charges VERSION dated `billing_effective_from` (today if omitted), so a body
 * that carried them unconditionally would open a pointless new version dated
 * today every time somebody corrected an address. The three keys are therefore
 * left out entirely unless the user actually edited the billing block — and a
 * rate they cleared goes as an explicit `null`, which is how "invoice at cost"
 * is recorded.
 */
export function companyToPayload(
  values: CompanyFormValues,
  { billingTouched = false }: { billingTouched?: boolean } = {},
): CompanyPayload {
  return {
    company_name: values.companyName.trim(),
    logo: orNull(values.logo),
    establish_year: values.establishYear ? Number(values.establishYear) : null,
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
    ...(billingTouched
      ? {
          agency_charge_percentage: orNullNumber(values.agencyChargePercentage),
          gst_percentage: orNullNumber(values.gstPercentage),
          /* Omitted rather than sent blank — the API reads a missing date as
             today, which is what a rate entered with no date means. */
          ...(values.billingEffectiveFrom.trim()
            ? { billing_effective_from: values.billingEffectiveFrom.trim() }
            : {}),
        }
      : {}),
  }
}

/** A rate as the body carries it; blank clears it (`null` = invoice at cost). */
function orNullNumber(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : Number(trimmed)
}

/** Hydrate the edit form from a stored company. */
export function companyToFormValues(company: Company): CompanyFormValues {
  return {
    companyName: company.companyName,
    logo: company.logo,
    establishYear: company.establishYear,
    registrationNumber: company.registrationNumber,
    panNumber: company.panNumber,
    gstNumber: company.gstNumber,
    addressLine1: company.addressLine1,
    addressLine2: company.addressLine2,
    addressLine3: company.addressLine3,
    stateId: company.stateId === null ? '' : String(company.stateId),
    districtId: company.districtId === null ? '' : String(company.districtId),
    city: company.city,
    pinCode: company.pinCode,
    phone: company.phone,
    mobile1: company.mobile1,
    mobile2: company.mobile2,
    email: company.email,
    /* Blank where no charges were ever configured, so an untouched form sends
       nothing and the company keeps invoicing at cost. */
    agencyChargePercentage: rate(company.billing?.agencyChargePercentage),
    gstPercentage: rate(company.billing?.gstPercentage),
    billingEffectiveFrom: company.billing?.effectiveFrom ?? '',
  }
}

/** A stored rate as the form holds it; unset reads blank, never `0`. */
function rate(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}
