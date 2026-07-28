import { z } from 'zod'

const PIN_RE = /^\d{6}$/
const MOBILE_RE = /^[6-9]\d{9}$/
const PHONE_RE = /^[\d\s()+-]{6,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Passes when the value is blank (optional field) or matches `re`. */
const optionalMatch = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || re.test(v), message)

/** Every optional free-text field on the form. */
const text = z.string().trim()

/** Create/edit form for an factory office address. */
export const factoryOfficeAddressSchema = z.object({
  // Office information
  officeName: z.string().trim().min(1, 'Office name is required'),
  officeCode: text,

  // Contact details
  mobile: optionalMatch(MOBILE_RE, 'Enter a valid 10-digit mobile number'),
  phone: optionalMatch(PHONE_RE, 'Enter a valid phone number'),
  email: optionalMatch(EMAIL_RE, 'Enter a valid email address'),

  // Address details
  addressLine1: z.string().trim().min(1, 'Address line 1 is required'),
  addressLine2: text,
  addressLine3: text,
  state: z.string().trim().min(1, 'Please select state'),
  district: z.string().trim().min(1, 'Please select district'),
  city: text,
  pinCode: optionalMatch(PIN_RE, 'Pin code must be 6 digits'),
})

export type FactoryOfficeAddressFormValues = z.infer<typeof factoryOfficeAddressSchema>
