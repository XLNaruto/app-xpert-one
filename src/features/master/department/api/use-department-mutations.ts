import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { DepartmentFormValues } from '../schemas'
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from './department-api'

/** POST /departments — create a department, then refresh the list. */
export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DepartmentFormValues) => createDepartment(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.department.all })
    },
  })
}

/** PUT /departments/:id — update a department, then refresh the list + detail. */
export function useUpdateDepartment(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DepartmentFormValues) => updateDepartment(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.department.all })
    },
  })
}

/** DELETE /departments/:id — remove a department, then refresh the list. */
export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.department.all })
    },
  })
}
