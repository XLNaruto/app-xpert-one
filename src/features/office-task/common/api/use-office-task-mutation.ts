import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isStaleRowError } from './office-task-request'

/**
 * A mutation over the Office Task API. Any write can move work on another
 * screen (an assignment creates My Tasks rows, a hand-in fills Task Approval),
 * so every success refreshes the whole `officeTask` tree.
 *
 * A 409 does too: `TASK_STARTED` means "this control will never work again",
 * and every other conflict means the row moved under the screen — either way
 * the row's flags (`can_delete`, `locked_fields`, …) are stale and are re-read,
 * so the refused button disappears instead of being pressed again.
 */
export function useOfficeTaskMutation<TVars, TResult = unknown>(
  mutationFn: (vars: TVars) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.officeTask.all })
  return useMutation({
    mutationFn,
    onSuccess: refresh,
    onError: (error) => {
      if (isStaleRowError(error)) void refresh()
    },
  })
}
