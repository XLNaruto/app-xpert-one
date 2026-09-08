import { z } from 'zod'
import {
  emailField,
  gstField,
  mobileField,
  panField,
  phoneField,
  pinCodeField,
  recordNameField,
  registrationNumberField,
  text,
} from '@/lib/validation'

/**
 * A rate on the billing block: two decimals, 0–100, and blank for "not
 * configured" — which the API stores as no rate at all, not as zero.
 */
function optionalPercentField(label: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' || (/^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100),
      `Enter ${label} as a percentage between 0 and 100`,
    )
}

/**
 * Create/edit form for a company master record. The state and district are held
 * as id strings (that's what the combobox gives us) and parsed to numbers by the
 * mappers. `company_code` isn't on the form — the server generates it.
 */
export const companySchema = z.object({
  // Company information
  companyName: recordNameField('the company name', { max: 200 }),
  establishYear: z.string().trim().min(1, 'Establish year is required'),
  /**
   * The logo's **object key**, never the file — the bytes go to storage on a
   * presigned PUT and only the key the upload answers is stored here. Blank
   * means no logo.
   */
  logo: z.string().trim().max(500, 'Cannot exceed 500 characters'),
  registrationNumber: registrationNumberField(),
  panNumber: panField({ required: true }),
  gstNumber: gstField(),

  // Address details
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Address line 1 is required')
    .max(500, 'Cannot exceed 500 characters'),
  addressLine2: text(500),
  addressLine3: text(500),
  stateId: z.string().trim().min(1, 'State is required'),
  districtId: z.string().trim(),
  city: recordNameField('the city', { required: false, max: 100 }),
  pinCode: pinCodeField(),

  // Contact details
  phone: phoneField({ max: 20 }),
  mobile1: mobileField({ required: true }),
  mobile2: mobileField(),
  email: emailField({ required: true }),

  /*
   * Billing charges. These two rates back the TOTAL_INVOICE_AMOUNT calculation
   * base that a deduction head can be priced on, and they are a VERSIONED row of
   * their own rather than columns on the company — so a processed month keeps the
   * rates it was billed at.
   *
   * Blank is meaningful and is not zero: a company that has never configured
   * charges invoices at statutory cost. `company-mappers` only sends these when
   * the user actually touched them, because sending either one opens a charges
   * version dated `billingEffectiveFrom`.
   */
  agencyChargePercentage: optionalPercentField('the agency charge'),
  gstPercentage: optionalPercentField('GST'),
  /** `yyyy-MM-dd` — the day the rates take effect. Blank means today. */
  billingEffectiveFrom: z.string().trim(),
})

export type CompanyFormValues = z.infer<typeof companySchema>

/**
 * One company as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/companies` and
 * `GET/PATCH /user/companies/:id` answer with the record's own columns only —
 * hence the optional audit fields, which the mapper reads as an empty trail.
 * Everything but the id, the name, the code and `created_at` is nullable.
 */
export const companyResponseSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  company_code: z.string(),
  logo: z.string().nullable(),
  establish_year: z.number().nullable(),
  phone: z.string().nullable(),
  mobile_number1: z.string().nullable(),
  mobile_number2: z.string().nullable(),
  email: z.string().nullable(),
  registration_number: z.string().nullable(),
  pan_number: z.string().nullable(),
  gst_number: z.string().nullable(),
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  address3: z.string().nullable(),
  state_id: z.number().nullable(),
  district_id: z.number().nullable(),
  /**
   * Resolved names, when the API sends them. Not in the spec today — the list
   * columns need them and joining the geography masters client-side would cost
   * an extra request per page, so they're read straight off the record and the
   * columns fill in as soon as the endpoint returns them.
   */
  state_name: z.string().nullish(),
  district_name: z.string().nullish(),
  city: z.string().nullable(),
  pin_code: z.string().nullable(),
  /**
   * Hours a shift may run before an unclosed check-in counts as abandoned.
   * `null` leaves the platform default (18) in force. Nullish rather than
   * nullable — older records answered before the column existed omit it.
   */
  shift_hours: z.number().nullish(),
  /**
   * The billing charges in force — the versioned row behind the agency charge
   * and GST that the TOTAL_INVOICE_AMOUNT calculation base is priced on.
   *
   * `null` means the company has **never** configured charges, which is a real
   * state: it invoices at statutory cost. Read it as "not configured" rather
   * than as zero — the engine computes it as zero, but the screen should not
   * claim a rate was set.
   *
   * Present on every read of a company, list rows included.
   */
  billing: z
    .object({
      effective_from: z.string().nullish(),
      agency_charge_percentage: z.number().nullish(),
      gst_percentage: z.number().nullish(),
    })
    .nullish(),
  created_at: z.string(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type CompanyResponse = z.infer<typeof companyResponseSchema>

/** `GET /user/companies` — an offset-paginated page of companies. */
export const companiesResponseSchema = z.object({
  items: z.array(companyResponseSchema),
  total: z.number(),
})

/**
 * The create/update request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent —
 * `company_code` in particular is server-generated and never sent back.
 *
 * Optional fields go as `null`, never `''` — `email` carries a format check and
 * `pin_code` a pattern, so an empty string is a validation error where a null is
 * simply "not recorded".
 */
export interface CompanyPayload {
  company_name: string
  /** Object key from the logo presign — never the file, and `null` for none. */
  logo: string | null
  establish_year: number | null
  registration_number: string | null
  pan_number: string | null
  gst_number: string | null
  address1: string | null
  address2: string | null
  address3: string | null
  state_id: number | null
  district_id: number | null
  city: string | null
  pin_code: string | null
  phone: string | null
  mobile_number1: string | null
  mobile_number2: string | null
  email: string | null

  /*
   * The billing charges — OPTIONAL, and the one part of this body that must not
   * be sent unless the user touched it.
   *
   * Sending EITHER percentage opens (or patches) a charges version dated
   * `billing_effective_from`, today if that is omitted. So a form that spread
   * every field into a PATCH would open a pointless new version dated today on
   * every address edit. `companyToPayload` takes a flag for exactly this.
   *
   * When one IS sent, the rate left out is carried over from the version in
   * force on an insert and left as stored on a patch; an explicit `null` clears
   * it, which means "invoice at cost for that component".
   */
  agency_charge_percentage?: number | null
  gst_percentage?: number | null
  /** `YYYY-MM-DD`. Omitted means today. */
  billing_effective_from?: string
}
