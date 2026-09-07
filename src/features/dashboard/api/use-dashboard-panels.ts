import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ATTENTION_ALL_BATCH_SIZE } from '../constants'
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
 * GET /user/dashboard/breakdown — bar, donut and comparative columns.
 *
 * No pair guard: every measure now works with every one of the six dimensions,
 * so the 400 this used to hold requests back from can no longer happen.
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

/**
 * GET /user/dashboard/attention — the paged worklist.
 *
 * `enabled` is how the "All" footer switches modes: the pager and the appending
 * scroll are two different reads of the same endpoint, and only one of them may
 * be in flight, or the panel would pay for both on every filter change.
 */
export function useDashboardAttention(query: DashboardQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.attention(query),
    queryFn: ({ signal }) => fetchDashboardAttention(query, signal),
    enabled,
    ...PANEL_QUERY,
  })
}

/**
 * GET /user/dashboard/attention as an appending scroll — the footer's "All".
 *
 * The endpoint caps `limit` at 100, so "All" cannot be one request; it is a
 * batch of 100 per scroll to the bottom. `query` therefore arrives WITHOUT
 * `limit`/`offset` — the page param supplies the offset and the batch size is
 * fixed here, so the cache key stays one key for the whole scroll instead of a
 * new one per batch.
 *
 * The next offset is the number of rows already loaded rather than
 * `pages.length * batch`: they are the same while the server answers full
 * batches, and where it doesn't the count is the one that can't skip a row.
 */
export function useDashboardAttentionInfinite(
  query: DashboardQuery,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.dashboard.attentionInfinite(query),
    queryFn: ({ pageParam, signal }) =>
      fetchDashboardAttention(
        { ...query, limit: ATTENTION_ALL_BATCH_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // An empty batch is the end of the list, whatever `total` claims — without
      // this a total that outruns the rows would fetch the same offset forever.
      if (lastPage.items.length === 0) return undefined
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
    enabled,
    ...PANEL_QUERY,
  })
}
