import { ANY_VALUE } from '../constants'
import type { DashboardFilters } from '../types'

/**
 * The shared filter, as the six endpoints spell it.
 *
 * ONE state object, SIX requests. Every panel serialises the same filter through
 * here, so two panels on one screen can never end up describing different
 * populations — which is the failure that makes the numbers stop reconciling.
 *
 * Two rules the serialiser enforces:
 *
 * * **An empty multi-select sends NOTHING.** `?company_ids=` happens to be read
 *   as absent, but the key is omitted rather than relying on that.
 * * **Company reach is the server's business.** A COMPANY-level user asking for a
 *   company they do not hold gets the intersection, not a 403, so a saved filter
 *   keeps working after an access change. The picker is populated from
 *   `GET /user/my/companies`; nothing here reasons about reach.
 */

/** A serialised query — plain, so it doubles as the TanStack cache key. */
export type DashboardQuery = Readonly<Record<string, string | number | boolean>>

/**
 * A local `yyyy-MM-dd` day boundary as an ISO instant.
 *
 * `from`/`to` are real datetimes on the wire (unlike a bucket), and the window
 * has to be the user's own day boundaries — so the date is read in the browser's
 * zone and handed over as an instant. The `timezone` param is set to that same
 * zone, which is what keeps the boundary the server measures and the boundary
 * the picker showed the same one.
 */
function dayBoundary(date: string, edge: 'start' | 'end'): string {
  const [year, month, day] = date.split('-').map(Number)
  const local =
    edge === 'start'
      ? new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0)
      : new Date(year, (month ?? 1) - 1, day ?? 1, 23, 59, 59, 999)
  return local.toISOString()
}

/** A repeatable id list as the comma-separated form the endpoints accept. */
function ids(values: string[]): string | undefined {
  const cleaned = values.map((value) => value.trim()).filter(Boolean)
  return cleaned.length ? cleaned.join(',') : undefined
}

/** Drop every key whose value is `undefined` or an empty string. */
function compact(
  entries: Record<string, string | number | boolean | undefined>,
): DashboardQuery {
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === ANY_VALUE) continue
    out[key] = value
  }
  return out
}

/**
 * The filter as query params. `all_time` replaces the window entirely rather
 * than being sent alongside it, so a stale `from`/`to` can't narrow a request
 * that was meant to cover all of history.
 */
export function toDashboardQuery(filters: DashboardFilters): DashboardQuery {
  return compact({
    ...(filters.allTime
      ? { all_time: true }
      : {
          from: dayBoundary(filters.from, 'start'),
          to: dayBoundary(filters.to, 'end'),
        }),
    timezone: filters.timezone,
    company_ids: ids(filters.companyIds),
    branch_ids: ids(filters.branchIds),
    department_ids: ids(filters.departmentIds),
    designation_ids: ids(filters.designationIds),
    employment_type: filters.employmentType,
    grade: filters.grade,
    gender: filters.gender,
  })
}

/**
 * The POPULATION half of the filter — everything except the window.
 *
 * The worklist wants this: every signal on `/attention` is measured AS OF NOW
 * rather than over the window, so the population filters apply and the dates do
 * not. Sending the dates anyway would be harmless, but it would also make the
 * request look window-scoped to anyone reading the network tab, and the card
 * deliberately shows no date range for the same reason.
 */
export function toPopulationQuery(filters: DashboardFilters): DashboardQuery {
  return compact({
    timezone: filters.timezone,
    company_ids: ids(filters.companyIds),
    branch_ids: ids(filters.branchIds),
    department_ids: ids(filters.departmentIds),
    designation_ids: ids(filters.designationIds),
    employment_type: filters.employmentType,
    grade: filters.grade,
    gender: filters.gender,
  })
}

/**
 * How many population FIELDS are narrowed — the filter bar's badge count.
 *
 * Fields, not selections: picking three branches is one narrowing ("branch"),
 * and it shows as one chip. Counting the selections instead would put a 3 on a
 * badge sitting above a single chip.
 */
export function activeFilterCount(filters: DashboardFilters): number {
  return (
    (filters.companyIds.length ? 1 : 0) +
    (filters.branchIds.length ? 1 : 0) +
    (filters.departmentIds.length ? 1 : 0) +
    (filters.designationIds.length ? 1 : 0) +
    (filters.employmentType ? 1 : 0) +
    (filters.grade ? 1 : 0) +
    (filters.gender ? 1 : 0)
  )
}
