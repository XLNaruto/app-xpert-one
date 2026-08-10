import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { WeekoffDefaultScope, WeekoffPolicyFormValues } from '../schemas'
import {
  clearDefaultWeekoffPolicy,
  createWeekoffPolicy,
  deleteWeekoffPolicy,
  setDefaultWeekoffPolicy,
  updateWeekoffPolicy,
} from './weekoff-policy-api'

/** POST /user/weekoff-policies — create a policy, then refresh the master. */
export function useCreateWeekoffPolicy(companyId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: WeekoffPolicyFormValues) =>
      createWeekoffPolicy(values, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weekoffPolicy.all })
    },
  })
}

/** PATCH /user/weekoff-policies/:id — update a policy, then refresh list + detail. */
export function useUpdateWeekoffPolicy(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: WeekoffPolicyFormValues) => updateWeekoffPolicy(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weekoffPolicy.all })
    },
  })
}

/** DELETE /user/weekoff-policies/:id — remove a policy, then refresh the master. */
export function useDeleteWeekoffPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteWeekoffPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weekoffPolicy.all })
    },
  })
}

/**
 * POST /user/weekoff-policies/:id/set-default — pin one policy as the default for
 * a company or a department.
 *
 * The company and department masters are invalidated alongside the policies: the
 * default is stored on them, so their screens have to re-read to reflect it. The
 * employee shift lookups go too — which days are off is part of the answer they
 * resolve for a date.
 */
export function useSetDefaultWeekoffPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      policyId,
      scope,
    }: {
      policyId: number
      scope: WeekoffDefaultScope
    }) => setDefaultWeekoffPolicy(policyId, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weekoffPolicy.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.department.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}

/** POST /user/weekoff-policies/clear-default — drop a company's or department's. */
export function useClearDefaultWeekoffPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (scope: WeekoffDefaultScope) => clearDefaultWeekoffPolicy(scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weekoffPolicy.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.department.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
    },
  })
}
