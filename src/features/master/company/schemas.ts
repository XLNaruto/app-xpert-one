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

/** Create/edit form for a company master record. */
export const companySchema = z.object({
  // Company information
  companyName: z.string().trim().min(1, 'Company name is required'),
  companyCode: z.string().trim().min(1, 'Company code is required'),
  establishYear: z.string().trim().min(1, 'Establish year is required'),
  registrationNumber: z.string().trim(),
  panNumber: z
    .string()
    .trim()
    .min(1, 'PAN number is required')
    .toUpperCase()
    .regex(PAN_RE, 'Enter a valid PAN (e.g. ABCDE1234F)'),
  gstNumber: optionalMatch(GST_RE, 'Enter a valid 15-character GST number'),

  // Address details
  addressLine1: z.string().trim().min(1, 'Address line 1 is required'),
  addressLine2: z.string().trim(),
  addressLine3: z.string().trim(),
  state: z.string().trim().min(1, 'State is required'),
  city: z.string().trim(),
  pinCode: optionalMatch(PIN_RE, 'Pin code must be 6 digits'),

  // Contact details
  phone: z.string().trim(),
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
