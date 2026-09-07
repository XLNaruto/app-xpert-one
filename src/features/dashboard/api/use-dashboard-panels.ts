import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchDashboardAttention,
  fetchDashboardBreakdown,
  fetchDashboardHeatmap,
  fetchDashboardRadar,
  fetchDashboardSeries,
  fetchDashboardSummary,
} from './dashboard-api'
import type { DashboardQuery } from '../lib/dashboard-query'

/**
 * One query hook per panel. All six fire in parallel and each resolves
 * independently, so the tiles paint as soon as `/summary` lands (it is the fast
 * one) instead of the whole screen waiting on the slowest chart.
 *
 * Two settings are shared and both matter:
 *
 * * **`placeholderData: keepPreviousData`.** A filter change is a new cache key,
 *   which would otherwise blank every panel back to a skeleton and jump the
 *   layout. Holding the previous render (the panels dim it while `isFetching`)
 *   keeps the page still while the six requests land.
 * * **A short `staleTime`.** These are aggregate reads over a window the user
 *   just chose; re-fetching them on every window focus would cost six requests
 *   for numbers that cannot have moved much.
 *
 * Nothing here is mutated, so there is no invalidation beyond the company switch
 * that clears every tenant-scoped key.
 */
const PANEL_QUERY = {
  placeholderData: keepPreviousData,
  staleTime: 60 * 1000,
} as const

/** GET /user/dashboard/summary — the KPI strip and the five section cards. */
export function useDashboardSummary(query: DashboardQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(query),
    queryFn: ({ signal }) => fetchDashboardSummary(query, signal),
    ...PANEL_QUERY,
  })
}

/** GET /user/dashboard/series — one call per panel, every line included. */
export function useDashboardSeries(query: DashboardQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.series(query),
    queryFn: ({ signal }) => fetchDashboardSeries(query, signal),
    enabled,
    ...PANEL_QUERY,
  })
}

/**
 * GET /user/dashboard/breakdown.
 *
 * `enabled` is how an impossible measure/dimension pair is prevented rather than
 * caught: the panel re-filters its dimension dropdown when the measure changes,
 * and holds the request back for the render in between.
 */
export function useDashboardBreakdown(query: DashboardQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.breakdown(query),
    queryFn: ({ signal }) => fetchDashboardBreakdown(query, signal),
    enabled,
    ...PANEL_QUERY,
  })
}

/** GET /user/dashboard/radar — the group scorecard. */
export function useDashboardRadar(query: DashboardQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.radar(query),
    queryFn: ({ signal }) => fetchDashboardRadar(query, signal),
    ...PANEL_QUERY,
  })
}

/**
 * GET /user/dashboard/heatmap.
 *
 * `enabled` also covers the other 400 the client can prevent: `leave_days` is
 * calendar-only, because a leave application has dates and no clock.
 */
export function useDashboardHeatmap(query: DashboardQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.heatmap(query),
    queryFn: ({ signal }) => fetchDashboardHeatmap(query, signal),
    enabled,
    ...PANEL_QUERY,
  })
}

/** GET /user/dashboard/attention — the paged worklist. */
export function useDashboardAttention(query: DashboardQuery) {
  return useQuery({
    queryKey: queryKeys.dashboard.attention(query),
    queryFn: ({ signal }) => fetchDashboardAttention(query, signal),
    ...PANEL_QUERY,
  })
}
