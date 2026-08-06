import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createLeave, decideLeave, deleteLeave, updateLeave } from './leave-api'
import type { LeaveDecisionFormValues, LeaveFormValues } from '../schemas'

/**
 * The register's writes. Each one refreshes the whole leave key: a record can
 * move between pages and between status filters, so refreshing only the page it
 * was on would leave a stale row behind.
 */
function useInvalidateLeaves() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.leave.all })
}

export function useCreateLeave() {
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: (values: LeaveFormValues) => createLeave(values),
    onSuccess: invalidate,
  })
}

export function useUpdateLeave(id: number) {
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: (values: LeaveFormValues) => updateLeave(id, values),
    onSuccess: invalidate,
  })
}

export function useDeleteLeave() {
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: (id: number) => deleteLeave(id),
    onSuccess: invalidate,
  })
}

/**
 * PATCH …/status — the Approve / Reject action. Only a pending row can be
 * decided, so a second decision comes back 400 and the screen shows the server's
 * message.
 */
export function useDecideLeave() {
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: LeaveDecisionFormValues }) =>
      decideLeave(id, values),
    onSuccess: invalidate,
  })
}
