import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { refreshAccessToken } from '@/lib/auth-refresh'
import type { PageParams } from '@/lib/pagination'
import {
  cancelScheduledSwitch,
  createSwitchRequest,
  fetchCredits,
  fetchPendingSwitchRequest,
  fetchSwitchRequests,
  previewPlanSwitch,
  switchPlan,
  withdrawSwitchRequest,
} from './billing-api'
import type { SwitchChoice, SwitchRequest, SwitchResult } from '../types'

/**
 * POST /user/subscriptions/switch/preview — the priced summary for one choice.
 *
 * A POST, but it writes nothing, so it's read as a query keyed by the whole
 * choice: flipping the term or the timing is a new quote, and flipping back is
 * served from cache. Pass null to hold it (no plan picked, or a running plan
 * still waiting on its timing). The previous quote stays up while the next one
 * loads, so the breakdown doesn't collapse on every click.
 */
export function useSwitchPreview(choice: SwitchChoice | null) {
  return useQuery({
    queryKey: queryKeys.billing.switchPreview(
      choice ?? { planId: 0, isYearly: false, extendType: null },
    ),
    queryFn: () => previewPlanSwitch(choice!),
    enabled: choice !== null,
    placeholderData: keepPreviousData,
    // Proration is by the second — a quote left open for minutes has drifted.
    staleTime: 0,
  })
}

/**
 * POST /user/subscriptions/switch — apply the switch.
 *
 * When the plan's permissions moved (`refresh_required`), the access token is
 * re-issued before the mutation settles: permissions ride inside the token, and
 * a screen that reloads on success must not read the old ones. A failed refresh
 * is left to the 401 interceptor — the switch itself already happened.
 */
export function useSwitchPlan() {
  const queryClient = useQueryClient()

  return useMutation<SwitchResult, Error, SwitchChoice>({
    mutationFn: async (choice) => {
      const result = await switchPlan(choice)
      if (result.refreshRequired) {
        await refreshAccessToken().catch(() => undefined)
      }
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      if (result.refreshRequired) {
        // The menu and every gate are cut from `my-role`.
        queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
      }
    },
  })
}

/** DELETE /user/subscriptions/switch — cancel the booked `next_renewal` switch. */
export function useCancelScheduledSwitch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelScheduledSwitch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}

/** GET /user/billing/credits — the stored-credit balance and one ledger page. */
export function useBillingCredits(params: PageParams = { limit: 20, offset: 0 }) {
  return useQuery({
    queryKey: queryKeys.billing.credits(params),
    queryFn: () => fetchCredits(params),
    placeholderData: keepPreviousData,
  })
}

/** GET /user/subscriptions/switch-requests/pending — the open request, or null. */
export function usePendingSwitchRequest() {
  return useQuery({
    queryKey: queryKeys.billing.pendingSwitchRequest(),
    queryFn: fetchPendingSwitchRequest,
  })
}

/** GET /user/subscriptions/switch-requests — request history, newest first. */
export function useSwitchRequests(params: PageParams) {
  return useQuery({
    queryKey: queryKeys.billing.switchRequests(params),
    queryFn: () => fetchSwitchRequests(params),
    placeholderData: keepPreviousData,
  })
}

/** POST /user/subscriptions/switch-requests — send the super admin a request. */
export function useCreateSwitchRequest() {
  const queryClient = useQueryClient()

  return useMutation<SwitchRequest, Error, SwitchChoice & { note?: string }>({
    mutationFn: createSwitchRequest,
    onSuccess: (request) => {
      queryClient.setQueryData(queryKeys.billing.pendingSwitchRequest(), request)
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}

/** DELETE /user/subscriptions/switch-requests/pending — withdraw it. */
export function useWithdrawSwitchRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: withdrawSwitchRequest,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.billing.pendingSwitchRequest(), null)
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}
