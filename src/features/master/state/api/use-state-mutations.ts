import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { StateFormValues } from '../schemas'
import { createState, deleteState, updateState } from './state-api'

/** POST /states — create a state, then refresh the list. */
export function useCreateState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: StateFormValues) => createState(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.state.all })
    },
  })
}

/** PUT /states/:id — update a state, then refresh the list. */
export function useUpdateState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: StateFormValues }) =>
      updateState(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.state.all })
    },
  })
}

/** DELETE /states/:id — remove a state, then refresh the list. */
export function useDeleteState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteState(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.state.all })
    },
  })
}
