import { z } from 'zod'

/** PAN — five letters, four digits, one letter (e.g. ABCDE1234F). */
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
/** GSTIN — 15-char state-code + PAN + entity + Z + checksum. */
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/
const MOBILE_RE = /^\d{10}$/
const PIN_RE = /^\d{6}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Passes when the value is blank (optional field) or matches `re`. */
const optionalMatch = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || re.test(v), message)

/** An optional free-text field, capped at the API's column length. */
const text = (max: number) =>
  z.string().trim().max(max, `Cannot exceed ${max} characters`)

/**
 * Create/edit form for a company master record. The state and district are held
 * as id strings (that's what the combobox gives us) and parsed to numbers by the
 * mappers. `company_code` isn't on the form — the server generates it.
 */
export const companySchema = z.object({
  // Company information
  companyName: z
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(200, 'Cannot exceed 200 characters'),
  establishYear: z.string().trim().min(1, 'Establish year is required'),
  /**
   * The logo's **object key**, never the file — the bytes go to storage on a
   * presigned PUT and only the key the upload answers is stored here. Blank
   * means no logo.
   */
  logo: z.string().trim().max(500, 'Cannot exceed 500 characters'),
  registrationNumber: text(100),
  panNumber: z
    .string()
    .trim()
    .min(1, 'PAN number is required')
    .toUpperCase()
    .regex(PAN_RE, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  gstNumber: optionalMatch(GST_RE, 'Enter a valid 15-character GST number'),

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
  city: text(100),
  pinCode: optionalMatch(PIN_RE, 'Pin code must be 6 digits'),

  // Contact details
  phone: text(20),
  mobile1: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .regex(MOBILE_RE, 'Enter a valid 10-digit mobile number'),
  mobile2: optionalMatch(MOBILE_RE, 'Enter a valid 10-digit mobile number'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(EMAIL_RE, 'Enter a valid email address'),
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
}
