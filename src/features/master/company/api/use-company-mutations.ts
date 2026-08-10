import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { CompanyFormValues } from '../schemas'
import {
  createCompany,
  deleteCompany,
  updateCompany,
  uploadCompanyLogo,
} from './company-api'

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
      // The tenant list carries the name and logo the shell brands itself with,
      // so an edit to either has to reach the switcher and the sidebar too.
      queryClient.invalidateQueries({ queryKey: queryKeys.myCompany.all })
    },
  })
}

/**
 * Presign + PUT a logo, answering the object key to hold on the form. Nothing is
 * written to the company until the form is saved with that key, so this
 * invalidates nothing.
 */
export function useUploadCompanyLogo() {
  return useMutation({ mutationFn: (file: File) => uploadCompanyLogo(file) })
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
