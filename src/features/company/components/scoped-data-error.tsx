import { AlertCircle } from 'lucide-react'
import { getApiErrorMessage, isNoActiveCompanyError } from '@/lib/api-error'
import { CompanyRequired } from './company-required'

interface ScopedDataErrorProps {
  /** The failed query's `error` (typed `unknown`). */
  error: unknown
  /** Shown when the failure carries no message of its own. */
  fallback: string
  /** Plural lowercase noun for this screen — `"branches"`, `"employees"`. */
  what: string
}

/**
 * What a company-scoped screen renders instead of its table when the query
 * failed. "No company is active" isn't a broken screen — it's a selection the
 * user hasn't made — so that case becomes the company picker; anything else stays
 * an error line.
 *
 * Use this in every list/tab whose `api/` layer calls `activeCompanyId()`.
 */
export function ScopedDataError({ error, fallback, what }: ScopedDataErrorProps) {
  if (isNoActiveCompanyError(error)) return <CompanyRequired what={what} />

  return (
    <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{getApiErrorMessage(error, fallback)}</span>
    </p>
  )
}
