import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { EmployeeTicketStatusPayload } from '../schemas'
import {
  postEmployeeTicketMessage,
  updateEmployeeTicketAssignee,
  updateEmployeeTicketStatus,
} from './employee-ticket-api'

/**
 * All three mutations invalidate `employeeSupportTicket.all` — one prefix covering
 * the queue under any filter, the tab strip's counts and the open thread.
 *
 * That breadth is deliberate rather than lazy. A reply is not just a message: an
 * `open` ticket moves to `in_progress` on the server when the office answers, so
 * a mutation that looks like it only touches the thread has in fact moved the
 * row between two tabs and changed two of the five counts.
 */

/** POST /user/employee-support-tickets/:id/messages — reply, with an optional file. */
export function useReplyToEmployeeTicket(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, attachment }: { body: string; attachment?: File | null }) =>
      postEmployeeTicketMessage(id, body, attachment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeSupportTicket.all })
    },
  })
}

/**
 * PATCH /user/employee-support-tickets/:id/status — pick it up, answer it, or
 * file it away. The payload is the union the endpoint expects, built by the
 * caller so `resolved` can't travel without its note.
 */
export function useUpdateEmployeeTicketStatus(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EmployeeTicketStatusPayload) =>
      updateEmployeeTicketStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeSupportTicket.all })
    },
  })
}

/**
 * PATCH /user/employee-support-tickets/:id/assignee — hand it to a colleague,
 * or pass `null` to release it back to the unassigned queue.
 *
 * Invalidates the same broad prefix as the others, and needs to: a hand-over
 * moves the row in and out of the "unassigned only" and "on my plate" views,
 * closes any open work stretch (so the effort figure and the work-session panel
 * both move) and flips `needs_pickup` — while leaving the STATUS alone, so the
 * ticket stays in the tab it was already in.
 */
export function useAssignEmployeeTicket(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    // `null` is a real argument here, not an absent one — it's the release.
    mutationFn: (assignedToUserId: number | null) =>
      updateEmployeeTicketAssignee(id, assignedToUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeSupportTicket.all })
    },
  })
}
