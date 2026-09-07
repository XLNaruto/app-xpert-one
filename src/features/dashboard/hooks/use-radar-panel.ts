import { useCallback, useMemo, useState } from 'react'
import { RADAR_LIMIT } from '../constants'
import { useDashboardRadar } from '../api/use-dashboard-panels'
import type { DashboardQuery } from '../lib/dashboard-query'
import type { RadarGroupBy } from '../types'

/**
 * The scorecard web: what to group by, and which rings are drawn.
 *
 * Above ~6 rings a radar becomes mud, so `limit` stays at 6 and the legend
 * TOGGLES rings instead of the limit being raised. A hidden ring is hidden in
 * the client, not dropped from the request — re-fetching to hide a polygon would
 * also re-cut the group list, and the user would find a different six.
 */

export function useRadarPanel(baseQuery: DashboardQuery, initialGroupBy: RadarGroupBy = 'department') {
  const [groupBy, setGroupBy] = useState<RadarGroupBy>(initialGroupBy)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  const query = useMemo<DashboardQuery>(
    () => ({ ...baseQuery, group_by: groupBy, limit: RADAR_LIMIT }),
    [baseQuery, groupBy],
  )

  const result = useDashboardRadar(query)

  // A different grouping is a different set of rings, so old hidden keys would
  // silently blank a ring in the new set that happens to share a key.
  const changeGroupBy = useCallback((next: RadarGroupBy) => {
    setGroupBy(next)
    setHidden(new Set())
  }, [])

  const toggleGroup = useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const groups = useMemo(
    () => (result.data?.groups ?? []).filter((group) => !hidden.has(group.key)),
    [result.data, hidden],
  )

  return {
    ...result,
    groupBy,
    setGroupBy: changeGroupBy,
    /** Every group the response carried — the legend lists all of them. */
    allGroups: result.data?.groups ?? [],
    /** The groups actually plotted. */
    groups,
    hidden,
    toggleGroup,
    axes: result.data?.axes ?? [],
  }
}
