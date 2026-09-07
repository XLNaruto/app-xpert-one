import { isForbiddenError } from '@/lib/api-error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useDashboardSummary } from '../api/use-dashboard-panels'
import { useDashboardFilters } from './use-dashboard-filters'

/**
 * The screen itself: the shared filter, the hero strip, and the two answers that
 * are screen-level rather than per-panel.
 *
 * **403 is one answer for the whole page.** All six endpoints are gated on the
 * single code `dashboard:read`, so a refusal means the user cannot see the
 * dashboard at all — that is a screen-level empty state, not six broken panels.
 * The page shell with six error cards in it would be six ways of saying the same
 * thing.
 *
 * **Zeroes and nulls everywhere are DATA, not failure.** A COMPANY-scoped user
 * with no companies granted gets valid, empty responses, and so does a
 * brand-new account with no employees. Both want "no data yet" copy and both
 * want the null rules — em-dashes, not zeroes, for the rates.
 */
export function useDashboardScreen() {
  const filterState = useDashboardFilters()
  const access = useResourceAccess(PERMISSIONS.dashboard)

  const summary = useDashboardSummary(filterState.query)

  /*
   * `/summary` is the fast one and is always enabled, so it is the panel that
   * answers the permission question first. A 403 from any of the six means the
   * same thing, so there is nothing to gain from waiting for the others.
   */
  const isForbidden = isForbiddenError(summary.error)

  /**
   * `all_time` KILLS EVERY COMPARISON. There is no equally-long period before
   * all of history, so each `previous_*` comes back 0 and each `change_pct`
   * null. The delta badges are hidden outright in this mode rather than
   * rendering a row of em-dashes that look like missing data.
   */
  const showComparisons = !filterState.appliedFilters.allTime

  /**
   * Whether the account has anything at all. Distinguishing this from a failure
   * is the difference between "no data yet" and "something went wrong".
   */
  const isEmptyAccount =
    summary.isSuccess &&
    summary.data.workforce.headcount === 0 &&
    summary.data.workforce.joined === 0 &&
    summary.data.workforce.exited === 0 &&
    summary.data.attendance.accountedDays === 0

  return {
    ...filterState,
    access,
    summary,
    isForbidden,
    showComparisons,
    isEmptyAccount,
    /** The window the SERVER measured — what every panel on the page describes. */
    resolvedWindow: summary.data
      ? { from: summary.data.from, to: summary.data.to }
      : undefined,
  }
}
