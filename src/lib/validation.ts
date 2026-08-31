import { z } from 'zod'

/**
 * Shared form-field validation.
 *
 * Every feature's `schemas.ts` used to carry its own copy of the PAN / GST /
 * IFSC / mobile / PIN regexes, which is how the same field ended up strict on
 * one screen and a bare `min(1)` on the next. The patterns and the field
 * builders live here now, so a "company name" or a "GST number" means the same
 * thing everywhere and its message reads the same way.
 *
 * Two conventions carry over from the forms themselves:
 *
 * - **Forms hold strings.** A blank optional field is `''`, never `null` — the
 *   mappers turn it into `null` on the way to the API. So every optional check
 *   below passes `''` and only validates what was actually typed.
 * - **Labels go in lowercase** (`'company name'`), because they're interpolated
 *   mid-sentence: `Please enter company name`.
 */

/* ── Patterns ─────────────────────────────────────────────────────────────── */

/** PAN — five letters, four digits, one letter (e.g. ABCDE1234F). */
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
/** GSTIN — 15 chars: state code + PAN + entity + Z + checksum. */
export const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/
/** IFSC — four bank letters, a zero, then six branch characters. */
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
/** Bank account number — Indian banks run 9 to 18 digits. */
export const ACCOUNT_NUMBER_RE = /^\d{9,18}$/
/** Aadhaar — 12 digits, never starting 0 or 1. */
export const AADHAAR_RE = /^[2-9]\d{11}$/
/** UAN — 12 digits. */
export const UAN_RE = /^\d{12}$/
/** ESIC insurance number — 10 to 17 digits. */
export const ESIC_NUMBER_RE = /^\d{10,17}$/
/** Indian mobile number — 10 digits starting 6-9. */
export const MOBILE_RE = /^[6-9]\d{9}$/
/** Landline / desk phone, with the punctuation people actually type. */
export const PHONE_RE = /^[\d\s()+-]{6,15}$/
/** Indian PIN code — 6 digits, never starting 0. */
export const PIN_CODE_RE = /^[1-9]\d{5}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** A whole number. */
export const DIGITS_RE = /^\d+$/
/** An amount with up to two decimals. */
export const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

/**
 * A person's name — letters, spaces and the punctuation that turns up in real
 * names (`O'Brien`, `Anne-Marie`, `Dr. Rao`). **Digits are not a name**, so none
 * are allowed here; a field that legitimately carries them (an entity's trading
 * name, a branch, a shift) uses {@link recordName} instead.
 */
export const PERSON_NAME_RE = /^[A-Za-z][A-Za-z\s.'-]*$/

/**
 * The name of a *thing* rather than a person — a company, branch, department,
 * shift, holiday. Digits are allowed because they're ordinary here ("Unit 2",
 * "Shift 1", "Sector 17 Branch"), but the value must still contain a letter, so
 * a bare `123` is refused.
 */
export const RECORD_NAME_RE = /^(?=.*[A-Za-z])[A-Za-z0-9\s.,'&()\-/]+$/

/**
 * A short code / abbreviation — the two-or-three character code beside a name
 * (`CL`, `HRA`, `1001`). Letters, digits and `-_/`, starting with a letter or a
 * digit; unlike a name, an all-digit code is perfectly ordinary.
 */
export const SHORT_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9\-_/]*$/

/**
 * A registration / licence / reference number as issued by an authority —
 * letters, digits and the separators that appear on the certificate. No spaces
 * rule, because these are transcribed verbatim.
 */
export const REGISTRATION_NO_RE = /^[A-Za-z0-9][A-Za-z0-9\s\-/]*$/

/* ── Building blocks ──────────────────────────────────────────────────────── */

/** Passes when the value is blank (an optional field) or matches `re`. */
export const optionalMatch = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || re.test(v), message)

/** An optional free-text field, capped at the API's column length. */
export const text = (max: number) =>
  z.string().trim().max(max, `Cannot exceed ${max} characters`)

/** Options every field builder below understands. */
type FieldOptions = {
  /** Whether a blank value is refused. Defaults to `false`. */
  required?: boolean
  /** Lowercase label, interpolated mid-sentence. */
  label?: string
  /** Column length, where the field carries one. */
  max?: number
  /**
   * Fold the value to upper case before checking it, for the codes that are
   * only ever written that way (PAN, GST, IFSC) — so `abcde1234f` is accepted
   * as typed and stored as `ABCDE1234F`.
   */
  uppercase?: boolean
}

/**
 * A required-or-optional pattern field in one place: an optional field passes
 * blank, a required one reports the missing value before the format.
 */
function patternField(
  re: RegExp,
  message: string,
  { required = false, label = 'a value', max, uppercase = false }: FieldOptions = {},
) {
  const trimmed = z.string().trim()
  const base = uppercase ? trimmed.toUpperCase() : trimmed
  const capped = max === undefined ? base : base.max(max, `Cannot exceed ${max} characters`)
  return required
    ? capped.min(1, `Please enter ${label}`).regex(re, message)
    : capped.refine((v) => v === '' || re.test(v), message)
}

/* ── Named identity fields ────────────────────────────────────────────────── */

/**
 * PAN. Kept uppercase so `abcde1234f` is accepted as typed and stored the way
 * the department writes it.
 */
export const panField = (options: FieldOptions = {}) =>
  patternField(PAN_RE, 'Enter a valid PAN, e.g. ABCDE1234F', {
    label: 'the PAN number',
    uppercase: true,
    ...options,
  })

/** GSTIN — 15 characters, and the embedded PAN has to be shaped like one. */
export const gstField = (options: FieldOptions = {}) =>
  patternField(GST_RE, 'Enter a valid 15-character GST number, e.g. 24ABCDE1234F1Z5', {
    label: 'the GST number',
    uppercase: true,
    ...options,
  })

/** IFSC — the branch code on every Indian bank transfer. */
export const ifscField = (options: FieldOptions = {}) =>
  patternField(IFSC_RE, 'Enter a valid IFSC code, e.g. HDFC0001234', {
    label: 'the IFSC code',
    uppercase: true,
    ...options,
  })

/** Bank account number — digits only; no spaces, dashes or letters. */
export const accountNumberField = (options: FieldOptions = {}) =>
  patternField(ACCOUNT_NUMBER_RE, 'Account number must be 9 to 18 digits', {
    label: 'the account number',
    ...options,
  })

/**
 * What's wrong with an Aadhaar number, in the words the user needs — or `null`
 * when nothing is. Blank passes; a required field reports the missing value
 * before this runs.
 *
 * Two failures, and they read differently on purpose: twelve characters that
 * aren't twelve digits is a *length* problem, while twelve digits opening with
 * 0 or 1 is a well-formed number that no Aadhaar can be. Telling the second one
 * "must be 12 digits" sends the user back to count digits they already have
 * right.
 */
export function aadhaarIssue(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (!/^\d{12}$/.test(trimmed)) return 'Aadhaar number must be 12 digits'
  if (!AADHAAR_RE.test(trimmed)) {
    return "Not a valid Aadhaar number — it can't start with 0 or 1"
  }
  return null
}

export const aadhaarField = ({ required = false, max }: FieldOptions = {}) => {
  const base = z.string().trim()
  const capped = max === undefined ? base : base.max(max, `Cannot exceed ${max} characters`)
  const required_ = required
    ? capped.min(1, 'Please enter the Aadhaar number')
    : capped
  // superRefine rather than `patternField`: the two failures need two messages.
  return required_.superRefine((value, ctx) => {
    const issue = aadhaarIssue(value)
    if (issue) ctx.addIssue({ code: 'custom', message: issue })
  })
}

export const uanField = (options: FieldOptions = {}) =>
  patternField(UAN_RE, 'UAN must be 12 digits', { label: 'the UAN', ...options })

export const esicNumberField = (options: FieldOptions = {}) =>
  patternField(ESIC_NUMBER_RE, 'ESIC number must be 10 to 17 digits', {
    label: 'the ESIC number',
    ...options,
  })

export const mobileField = (options: FieldOptions = {}) =>
  patternField(MOBILE_RE, 'Enter a valid 10-digit mobile number', {
    label: 'the mobile number',
    ...options,
  })

export const phoneField = (options: FieldOptions = {}) =>
  patternField(PHONE_RE, 'Enter a valid phone number', {
    label: 'the phone number',
    ...options,
  })

export const pinCodeField = (options: FieldOptions = {}) =>
  patternField(PIN_CODE_RE, 'Enter a valid 6-digit PIN code', {
    label: 'the PIN code',
    ...options,
  })

export const emailField = (options: FieldOptions = {}) =>
  patternField(EMAIL_RE, 'Enter a valid email address', {
    label: 'the email address',
    max: 255,
    ...options,
  })

/** A registration / licence number, transcribed from a certificate. */
export const registrationNumberField = (options: FieldOptions = {}) =>
  patternField(
    REGISTRATION_NO_RE,
    'Use letters, digits and - / only',
    { label: 'the registration number', max: 100, ...options },
  )

/** A whole number held as a string — that's what a text input gives us. */
export const wholeNumberField = (options: FieldOptions = {}) =>
  patternField(DIGITS_RE, 'Enter a whole number', { label: 'a number', ...options })

/** An amount held as a string, up to two decimals. */
export const amountField = (options: FieldOptions = {}) =>
  patternField(AMOUNT_RE, 'Enter a valid amount', { label: 'an amount', ...options })

/* ── Name fields ──────────────────────────────────────────────────────────── */

/**
 * A person's name — no digits at all. Required by default, since a form asking
 * for a person rarely means it optionally.
 */
export function personNameField(
  label: string,
  { required = true, max = 150 }: Omit<FieldOptions, 'label'> = {},
) {
  const base = z.string().trim().max(max, `Cannot exceed ${max} characters`)
  const message = `${label} can only use letters, spaces and . ' -`
  return required
    ? base.min(1, `Please enter ${label}`).min(2, 'Minimum 2 characters').regex(PERSON_NAME_RE, message)
    : base.refine((v) => v === '' || PERSON_NAME_RE.test(v), message)
}

/**
 * The name of a record — a company, branch, department, shift. Digits are fine
 * ("Unit 2"); a value with no letter in it at all is not.
 */

// Only letters, digits, and spaces allowed
const RECORD_NAME_CHARS_RE = /^[a-zA-Z0-9\s]*$/
// The same, plus the punctuation a product name carries — see `allowSpecial`.
// Blank passes here; the required/optional branch below is what refuses it.
const RECORD_NAME_SPECIAL_CHARS_RE = /^[a-zA-Z0-9\s.,'&()\-/]*$/
// Must contain at least one letter somewhere
const RECORD_NAME_HAS_LETTER_RE = /[a-zA-Z]/

export function recordNameField(
  label: string,
  {
    required = true,
    max = 200,
    /**
     * Also accept the punctuation a real product name carries — `T-shirt`,
     * `Uniform (Large)`, `Nuts & Bolts`. Off by default: most masters name a
     * place or a department, where a stray symbol is a typo.
     */
    allowSpecial = false,
    /**
     * Shortest accepted name. Two by default — a one-letter department is a
     * slip. Drop it to 1 where a single character is the real name, as a
     * garment size is: `S`, `M`, `L`.
     */
    min = 2,
  }: Omit<FieldOptions, 'label'> & { allowSpecial?: boolean; min?: number } = {},
) {
  const charsRe = allowSpecial ? RECORD_NAME_SPECIAL_CHARS_RE : RECORD_NAME_CHARS_RE
  const charsMessage = allowSpecial
    ? `${label} can only use letters, numbers, spaces and . , ' & ( ) - /`
    : `${label} can only contain letters, numbers, and spaces`

  const base = z
    .string()
    .trim()
    .max(max, `Cannot exceed ${max} characters`)
    .regex(charsRe, charsMessage)

  return required
    ? base
        .min(1, `Please enter ${label}`)
        .min(min, `Minimum ${min} character${min === 1 ? '' : 's'}`)
        .refine((v) => RECORD_NAME_HAS_LETTER_RE.test(v), `${label} must contain at least one letter`)
    : base.refine(
        (v) => v === '' || RECORD_NAME_HAS_LETTER_RE.test(v),
        `${label} must contain at least one letter`,
      )
}
/** A short code beside a name — `CL`, `HRA`, `SHIFT-A`. */
export function shortCodeField(
  label: string,
  { required = true, max = 20 }: Omit<FieldOptions, 'label'> = {},
) {
  const base = z.string().trim().max(max, `Cannot exceed ${max} characters`)
  const message = `${label} can only use letters, digits and - _ /, and must start with one`
  return required
    ? base.min(1, `Please enter ${label}`).regex(SHORT_CODE_RE, message)
    : base.refine((v) => v === '' || SHORT_CODE_RE.test(v), message)
}
