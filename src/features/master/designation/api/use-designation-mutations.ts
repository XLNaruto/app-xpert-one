import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { DesignationFormValues } from '../schemas'
import {
  createDesignation,
  deleteDesignation,
  updateDesignation,
} from './designation-api'

/** POST /designations — create a designation, then refresh the list. */
export function useCreateDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DesignationFormValues) => createDesignation(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}

/** PUT /designations/:id — update a designation, then refresh the list + detail. */
export function useUpdateDesignation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DesignationFormValues) => updateDesignation(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}

/** DELETE /designations/:id — remove a designation, then refresh the list. */
export function useDeleteDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDesignation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}
