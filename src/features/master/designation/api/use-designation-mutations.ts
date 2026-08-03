import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { DesignationFormValues } from '../schemas'
import {
  createDesignation,
  deleteDesignation,
  updateDesignationName,
} from './designation-api'

/**
 * POST /user/designations — create a designation together with its opening wage
 * structure, then refresh the list.
 */
export function useCreateDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DesignationFormValues) => createDesignation(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}

/**
 * PATCH /user/designations/:id — rename a designation, then refresh the list +
 * detail. The endpoint owns the name and nothing else: a pay revision is a new
 * wage structure version, saved through `useSaveDesignationWageStructures`.
 */
export function useUpdateDesignationName(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => updateDesignationName(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}

/** DELETE /user/designations/:id — remove a designation, then refresh the list. */
export function useDeleteDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDesignation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}
