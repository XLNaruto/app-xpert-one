import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { CompanyFormValues } from '../schemas'
import { createCompany, deleteCompany, updateCompany } from './company-api'

/** POST /user/companies — create a company, then refresh the list. */
export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CompanyFormValues) => createCompany(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
    },
  })
}

/** PATCH /user/companies/:id — update a company, then refresh the list + detail. */
export function useUpdateCompany(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CompanyFormValues) => updateCompany(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
    },
  })
}

/** DELETE /user/companies/:id — remove a company, then refresh the list. */
export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all })
    },
  })
}
