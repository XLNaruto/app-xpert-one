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
}

/** HTTP status the API uses for a missing permission. */
export const FORBIDDEN_STATUS = 403

/** The API's error code for a missing permission. */
export const FORBIDDEN_CODE = 'FORBIDDEN'

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

  /** True when the caller is authenticated but not permitted. */
  get isForbidden(): boolean {
    return this.status === FORBIDDEN_STATUS || this.code === FORBIDDEN_CODE
  }
}

/** Pull a human-readable message out of any thrown error (Axios or otherwise). */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    return data?.message || data?.error || error.message || fallback
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
  if (error instanceof ApiError) return error.isForbidden
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    return error.response?.status === FORBIDDEN_STATUS || data?.code === FORBIDDEN_CODE
  }
  return false
}
