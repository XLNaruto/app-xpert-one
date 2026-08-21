import { AxiosError } from 'axios'
import { ZodError } from 'zod'

/**
 * The API's error body — e.g.
 * `{ "code": "FORBIDDEN", "message": "Not allowed to read PF rates" }`.
 */
interface ApiErrorBody {
  code?: string
  message?: string
  error?: string
  /** Present on `VALIDATION` failures — one entry per field the endpoint refused. */
  details?: ApiErrorDetail[]
}

/**
 * One field-level complaint inside a `VALIDATION` body. The API mirrors zod's
 * own issue shape, so the field is named twice — as a JSON pointer
 * (`/password`, `/details/0/amount`) and as a path array inside `params.issue`.
 */
interface ApiErrorDetail {
  message?: string
  instancePath?: string
  params?: { issue?: { message?: string; path?: (string | number)[] } }
}

/** HTTP status the API uses for a missing permission. */
export const FORBIDDEN_STATUS = 403

/** The API's error code for a missing permission. */
export const FORBIDDEN_CODE = 'FORBIDDEN'

/**
 * The API's error code for a body that failed the endpoint's own schema. Its
 * top-level `message` is always the generic "Request validation failed"; the
 * field that actually broke is only in `details`, which is why these bodies get
 * unpacked instead of shown as-is.
 */
export const VALIDATION_CODE = 'VALIDATION'

/**
 * The API's error code for a network-level block — the caller's IP isn't on this
 * company's allow list (or is on its block list), see `administration/ip-address`.
 * It also arrives as a 403, but it says nothing about the user's permissions: the
 * same account on an allowed network works fine, and no amount of role editing
 * fixes it. It's answered app-wide by the `RestrictedIp` overlay rather than
 * per-screen, since every request from this address fails the same way.
 */
export const RESTRICTED_IP_CODE = 'RESTRICTED_IP'

/**
 * Our own code for "this screen is company-scoped and no company is active".
 * Raised client-side by `activeCompanyId()` before the request goes out, so a
 * screen can answer it with the company picker instead of a red error line.
 */
export const NO_ACTIVE_COMPANY_CODE = 'NO_ACTIVE_COMPANY'

/**
 * A failed API call, carrying the server's own `message` plus the bits a screen
 * needs to react to it (`status`, `code`). Feature `api/` layers throw this
 * instead of a plain Error so a 403 can be told apart from any other failure
 * once it reaches a hook — the message alone can't be branched on.
 */
export class ApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  /**
   * True when the caller is authenticated but not permitted. A restricted-IP 403
   * is deliberately excluded — it isn't a missing right, so it must not surface
   * as "contact your administrator to request access".
   */
  get isForbidden(): boolean {
    if (this.code === RESTRICTED_IP_CODE) return false
    return this.status === FORBIDDEN_STATUS || this.code === FORBIDDEN_CODE
  }

  /** True when the request was refused because of where it came from. */
  get isRestrictedIp(): boolean {
    return this.code === RESTRICTED_IP_CODE
  }
}

/** How many field complaints a validation message shows before it summarises. */
const MAX_VALIDATION_DETAILS = 3

/** `office_name` / `officeName` → `Office name`. */
function humanizeField(segment: string): string {
  const words = segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The field a detail is about, e.g. `/password` → `Password` and
 * `/details/0/amount` → `Amount (row 1)`. Empty when the complaint is about the
 * body as a whole.
 */
function detailLabel(detail: ApiErrorDetail): string {
  const path = detail.params?.issue?.path?.length
    ? detail.params.issue.path
    : (detail.instancePath ?? '').split('/').filter(Boolean)

  const segments = path.map(String)
  const fields = segments.filter((segment) => !/^\d+$/.test(segment))
  const index = segments.findLast((segment) => /^\d+$/.test(segment))
  const field = fields.at(-1)
  if (!field) return ''

  const label = humanizeField(field)
  return index === undefined ? label : `${label} (row ${Number(index) + 1})`
}

/**
 * Turn the server's zod wording into something a user reads, so a length rule
 * arrives as "Password must be at least 8 characters" rather than
 * "Password: String must contain at least 8 character(s)".
 */
function humanizeValidationMessage(message: string): string {
  return message
    .replace(/^String must contain at least (\d+) character\(s\)$/, 'must be at least $1 characters')
    .replace(/^String must contain at most (\d+) character\(s\)$/, 'must not exceed $1 characters')
    .replace(/^String must contain exactly (\d+) character\(s\)$/, 'must be exactly $1 characters')
    .replace(/^Required$/, 'is required')
    .replace(/^Invalid$/, 'is invalid')
}

/**
 * Flatten a `VALIDATION` body into one line per refused field. Returns
 * `undefined` when there's nothing usable, so the caller falls back to the
 * body's own `message`.
 */
function getValidationMessage(data: ApiErrorBody | undefined): string | undefined {
  if (!data?.details?.length) return undefined

  const lines = data.details
    .map((detail) => {
      const raw = (detail.message || detail.params?.issue?.message || '').trim()
      if (!raw) return ''
      const message = humanizeValidationMessage(raw)
      const label = detailLabel(detail)
      if (!label) return message
      // Our rewrites read as a continuation of the field name ("Password must
      // be…"); anything else is a sentence of its own and gets a colon.
      return /^[a-z]/.test(message) ? `${label} ${message}` : `${label}: ${message}`
    })
    .filter(Boolean)

  if (!lines.length) return undefined

  const shown = lines.slice(0, MAX_VALIDATION_DETAILS)
  const hidden = lines.length - shown.length
  return hidden > 0 ? `${shown.join('\n')}\n(+${hidden} more)` : shown.join('\n')
}

/** Pull a human-readable message out of any thrown error (Axios or otherwise). */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    return (
      getValidationMessage(data) || data?.message || data?.error || error.message || fallback
    )
  }
  // A response that didn't match its schema is a developer-facing problem: its
  // `message` is a JSON dump of every failed path, never something to show a
  // user, so it degrades to the caller's fallback.
  if (error instanceof ZodError) return fallback
  if (error instanceof Error) return error.message || fallback
  return fallback
}

/**
 * Normalise anything thrown by a request into an `ApiError`. Use this in the
 * `catch` of every `api/` function — it keeps the server's message *and* the
 * status/code, so screens can show the 403 screen rather than a red line.
 */
export function toApiError(error: unknown, fallback?: string): ApiError {
  if (error instanceof ApiError) return error

  const status = error instanceof AxiosError ? error.response?.status : undefined
  const code =
    error instanceof AxiosError
      ? (error.response?.data as ApiErrorBody | undefined)?.code
      : undefined

  return new ApiError(getApiErrorMessage(error, fallback), status, code)
}

/**
 * Did this failure happen because no company is active? Safe to call on any
 * thrown value, including a query's `error` (typed `unknown`). Screens branch on
 * this to render the company picker rather than a failure message.
 */
export function isNoActiveCompanyError(error: unknown): boolean {
  return error instanceof ApiError && error.code === NO_ACTIVE_COMPANY_CODE
}

/**
 * Did this failure come back as forbidden? Safe to call on any thrown value,
 * including a query's `error` (which is typed `unknown`).
 */
export function isForbiddenError(error: unknown): boolean {
  if (isRestrictedIpError(error)) return false
  if (error instanceof ApiError) return error.isForbidden
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    return error.response?.status === FORBIDDEN_STATUS || data?.code === FORBIDDEN_CODE
  }
  return false
}

/**
 * Was this failure a network-level block (`{ code: 'RESTRICTED_IP' }`)? Safe to
 * call on any thrown value, including a query's `error` and a raw AxiosError
 * straight out of the interceptor.
 */
export function isRestrictedIpError(error: unknown): boolean {
  if (error instanceof ApiError) return error.isRestrictedIp
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    return data?.code === RESTRICTED_IP_CODE
  }
  return false
}
