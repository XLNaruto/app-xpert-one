import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { LeaveTypeFormValues } from '../schemas'
import {
  createLeaveType,
  deleteLeaveType,
  updateLeaveType,
} from './leave-type-api'

/** POST /leave-types — create a leave type, then refresh the list. */
export function useCreateLeaveType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: LeaveTypeFormValues) => createLeaveType(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveType.all })
    },
  })
}

/** PUT /leave-types/:id — update a leave type, then refresh the list + detail. */
export function useUpdateLeaveType(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: LeaveTypeFormValues) => updateLeaveType(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveType.all })
    },
  })
}

/** DELETE /leave-types/:id — remove a leave type, then refresh the list. */
export function useDeleteLeaveType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveType.all })
    },
  })
}
