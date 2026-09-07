export { DashboardPage } from './pages/dashboard-page'

/**
 * The dashboard's public surface. Only the page crosses the boundary today — the
 * panels, hooks and formatters are internal, because every one of them assumes
 * the screen's single shared filter. Anything that reused a panel with a filter
 * of its own would be reintroducing exactly the drift the one-filter rule exists
 * to prevent.
 */
export type {
  DashboardFilters,
  DashboardSummary,
  DashboardSeries,
  DashboardBreakdown,
  DashboardRadar,
  DashboardHeatmap,
  DashboardAttention,
  AttentionSignal,
} from './types'
