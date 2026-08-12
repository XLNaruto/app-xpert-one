import { z } from 'zod'
import {
  emailField,
  mobileField,
  phoneField,
  pinCodeField,
  recordNameField,
  shortCodeField,
  text,
} from '@/lib/validation'
import { OFFICE_FOR_VALUES } from './types'

/**
 * Create/edit form for an office address — shared by all five screens. The
 * state and district are held as id strings (that's what the combobox gives us)
 * and parsed to numbers by the mappers.
 */
export const officeAddressSchema = z.object({
  // Office information
  officeName: recordNameField('the office name', { max: 250 }),
  officeCode: shortCodeField('the office code', { required: false, max: 250 }),
  officeType: recordNameField('the office type', { required: false, max: 255 }),

  // Contact details
  mobile: mobileField(),
  phone: phoneField(),
  email: emailField(),

  // Address details
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Address line 1 is required')
    .max(500, 'Cannot exceed 500 characters'),
  addressLine2: text(500),
  addressLine3: text(500),
  stateId: z.string().trim().min(1, 'Please select state'),
  districtId: z.string().trim().min(1, 'Please select district'),
  city: recordNameField('the city', { required: false, max: 200 }),
  pinCode: pinCodeField(),
})

export type OfficeAddressFormValues = z.infer<typeof officeAddressSchema>

/**
 * One office address as the API returns it (`POST/GET/PATCH
 * /user/office-addresses`). Every column but `id`/`created_at` is nullable
 * server-side — the mapper substitutes an empty string — and the only audit
 * field is `created_at`.
 */
export const officeAddressResponseSchema = z.object({
  id: z.number(),
  office_for: z.enum(OFFICE_FOR_VALUES).nullable(),
  office_code: z.string().nullable(),
  office_name: z.string().nullable(),
  mobile_number: z.string().nullable(),
  phone_number: z.string().nullable(),
  email: z.string().nullable(),
  office_type: z.string().nullable(),
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  address3: z.string().nullable(),
  state_id: z.number().nullable(),
  district_id: z.number().nullable(),
  /**
   * Resolved names, when the API sends them. Not in the spec today — the list
   * columns need them and joining the geography masters client-side would cost an
   * extra request per page, so they're read straight off the record and the
   * columns fill in as soon as the endpoint returns them.
   */
  state_name: z.string().nullish(),
  district_name: z.string().nullish(),
  city: z.string().nullable(),
  pin_code: z.string().nullable(),
  created_at: z.string(),
})

export type OfficeAddressResponse = z.infer<typeof officeAddressResponseSchema>

/** `GET /user/office-addresses` — an offset-paginated page of addresses. */
export const officeAddressesResponseSchema = z.object({
  items: z.array(officeAddressResponseSchema),
  total: z.number(),
})

/**
 * The create/update request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 *
 * Optional fields go as `null`, never `''` — `office_code` and `office_name`
 * carry a `minLength: 1` and `email` a format check, so an empty string is a
 * validation error where a null is simply "not recorded".
 */
export interface OfficeAddressPayload {
  office_for: string
  office_name: string
  office_code: string | null
  office_type: string | null
  mobile_number: string | null
  phone_number: string | null
  email: string | null
  address1: string | null
  address2: string | null
  address3: string | null
  state_id: number | null
  district_id: number | null
  city: string | null
  pin_code: string | null
}
