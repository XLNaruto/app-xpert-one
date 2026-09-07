import type { AxiosRequestConfig } from 'axios'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  attentionResponseSchema,
  breakdownResponseSchema,
  heatmapResponseSchema,
  radarResponseSchema,
  seriesResponseSchema,
  summaryResponseSchema,
} from '../schemas'
import {
  toAttention,
  toBreakdown,
  toHeatmap,
  toRadar,
  toSeries,
  toSummary,
} from '../lib/dashboard-mappers'
import type { DashboardQuery } from '../lib/dashboard-query'
import type {
  DashboardAttention,
  DashboardBreakdown,
  DashboardHeatmap,
  DashboardRadar,
  DashboardSeries,
  DashboardSummary,
} from '../types'

/**
 * The six `/user/dashboard/*` reads.
 *
 * Every one takes an already-serialised query (see `lib/dashboard-query.ts`) —
 * the SAME object that is the TanStack cache key, so a panel can't send one
 * filter while caching under another.
 *
 * `signal` is threaded through to axios on every call. Six requests fire on each
 * filter change, so a fast user would otherwise paint a stale panel next to a
 * fresh one; TanStack hands each query an `AbortSignal` and the superseded
 * requests are cancelled in flight.
 *
 * ERRORS ARE LEFT AS `ApiError` AND NOT SWALLOWED. Two statuses matter to the
 * screen and both are read off the error rather than guessed at:
 *
 * * **403** — the user lacks `dashboard:read`. It is ONE code for the whole
 *   screen, so that is a screen-level empty state, not six broken panels.
 * * **400** — `leave_days` on the weekday/hour grid, which is now the only one
 *   the client can produce: a leave application has dates and no clock. It is a
 *   bug the UI prevents, and the message names the valid options, so the panel
 *   surfaces it in place rather than as a toast.
 */

/** Per-request axios config — just the abort signal TanStack supplies. */
function requestConfig(query: DashboardQuery, signal?: AbortSignal): AxiosRequestConfig {
  return { params: query, signal }
}

/** GET /user/dashboard/summary — the hero strip. */
export async function fetchDashboardSummary(
  query: DashboardQuery,
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  try {
    const raw = await http.get<unknown>(
      endpoints.DASHBOARD.SUMMARY,
      requestConfig(query, signal),
    )
    return toSummary(summaryResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the dashboard summary.")
  }
}

/**
 * GET /user/dashboard/series — the trend panels.
 *
 * `metrics` and `granularity` ride in the query the caller built: EVERY LINE ON
 * ONE CHART COMES FROM ONE REQUEST, because fetching them separately lets the
 * series land against slightly different clocks and end up a bucket apart on the
 * same axis.
 */
export async function fetchDashboardSeries(
  query: DashboardQuery,
  signal?: AbortSignal,
): Promise<DashboardSeries> {
  try {
    const raw = await http.get<unknown>(
      endpoints.DASHBOARD.SERIES,
      requestConfig(query, signal),
    )
    return toSeries(seriesResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the trend.")
  }
}

/**
 * GET /user/dashboard/breakdown — bar, donut and comparative columns.
 *
 * One request feeds all three shapes, because every item carries both windows:
 * `value` and `previous_value`. There is no separate compare endpoint and no
 * second call for the "vs last period" chart. Every measure pairs with every one
 * of the six dimensions, so there is no impossible combination to reject.
 */
export async function fetchDashboardBreakdown(
  query: DashboardQuery,
  signal?: AbortSignal,
): Promise<DashboardBreakdown> {
  try {
    const raw = await http.get<unknown>(
      endpoints.DASHBOARD.BREAKDOWN,
      requestConfig(query, signal),
    )
    return toBreakdown(breakdownResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the breakdown.")
  }
}

/** GET /user/dashboard/radar — the group scorecard web. */
export async function fetchDashboardRadar(
  query: DashboardQuery,
  signal?: AbortSignal,
): Promise<DashboardRadar> {
  try {
    const raw = await http.get<unknown>(
      endpoints.DASHBOARD.RADAR,
      requestConfig(query, signal),
    )
    return toRadar(radarResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the scorecard.")
  }
}

/** GET /user/dashboard/heatmap — the 7×24 grid or the day calendar. */
export async function fetchDashboardHeatmap(
  query: DashboardQuery,
  signal?: AbortSignal,
): Promise<DashboardHeatmap> {
  try {
    const raw = await http.get<unknown>(
      endpoints.DASHBOARD.HEATMAP,
      requestConfig(query, signal),
    )
    return toHeatmap(heatmapResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the heatmap.")
  }
}

/**
 * GET /user/dashboard/attention — the worklist.
 *
 * Offset-paged like every other list on this API, but the population it pages
 * over is measured AS OF NOW rather than over the window, so the caller sends
 * the population filters WITHOUT the dates.
 */
export async function fetchDashboardAttention(
  query: DashboardQuery,
  signal?: AbortSignal,
): Promise<DashboardAttention> {
  try {
    const raw = await http.get<unknown>(
      endpoints.DASHBOARD.ATTENTION,
      requestConfig(query, signal),
    )
    return toAttention(attentionResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the worklist.")
  }
}
