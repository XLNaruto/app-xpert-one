import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  createLeave,
  decideLeave,
  deleteLeave,
  updateLeave,
  uploadLeaveAttachment,
} from './leave-api'
import type { LeavePayloadMode } from '../lib/leave-mappers'
import type { LeaveDecisionFormValues, LeaveFormValues } from '../schemas'

/**
 * The register's writes. Each one refreshes the whole leave key: a record can
 * move between pages and between status filters, so refreshing only the page it
 * was on would leave a stale row behind. The balance lives under the same key,
 * and every write moves it — a new leave spends allowance, a rejection returns
 * it — so it is refreshed by the same call.
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

/**
 * PATCH …/:id — one of the endpoint's two behaviours, chosen by `mode`:
 * `schedule` re-runs the split (PENDING only, and the row ids change), `notes`
 * writes just the reason and attachment (any status).
 */
export function useUpdateLeave(id: number) {
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: ({
      values,
      mode,
    }: {
      values: LeaveFormValues
      mode: Extract<LeavePayloadMode, 'schedule' | 'notes'>
    }) => updateLeave(id, values, mode),
    onSuccess: invalidate,
  })
}

/** DELETE …/:id — removes the whole application, both halves of a split. */
export function useDeleteLeave() {
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: (id: number) => deleteLeave(id),
    onSuccess: invalidate,
  })
}

/**
 * PATCH …/status — the Approve / Reject action. It decides the whole application
 * from any one of its rows, and only a pending one can be decided, so a second
 * decision comes back 400 and the screen shows the server's message.
 */
export function useDecideLeave() {
  const invalidate = useInvalidateLeaves()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: LeaveDecisionFormValues }) =>
      decideLeave(id, values),
    onSuccess: invalidate,
  })
}

/**
 * The proof file. Uploaded on pick rather than on submit, so the form holds a
 * durable object key by the time it is saved — nothing is written to the database
 * by the handshake, so an abandoned upload leaves a stray object and no half-saved
 * row.
 */
export function useUploadLeaveAttachment() {
  return useMutation({ mutationFn: (file: File) => uploadLeaveAttachment(file) })
}
