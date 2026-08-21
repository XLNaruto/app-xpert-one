/**
 * Week-Off Policy — the module's public surface.
 *
 * Two screens (the master list and the one create/edit form behind it) plus the
 * reads other features need: the shift form points a shift at a policy, and the
 * employee shift tab spells a pattern out. Cross-feature imports come through
 * here, never through a deep path.
 */
export { WeekoffPolicyListPage } from './pages/weekoff-policy-list-page'
export { WeekoffPolicyCreatePage } from './pages/weekoff-policy-create-page'

export { useWeekoffPolicies, useWeekoffPolicy } from './api/use-weekoff-policies'
export {
  useCreateWeekoffPolicy,
  useUpdateWeekoffPolicy,
  useDeleteWeekoffPolicy,
  useSetDefaultWeekoffPolicy,
  useClearDefaultWeekoffPolicy,
} from './api/use-weekoff-policy-mutations'

export {
  weekoffPolicyOptions,
  weekoffSummary,
  weekoffPolicySummary,
  flexibleWeekoffCaption,
  weekDayName,
  weekDayShort,
  ruleLabel,
} from './lib/weekoff-policy-mappers'
export { WEEK_DAYS } from './constants'

export type { WeekoffPolicy, WeekoffDay, WeekoffOffType } from './types'
