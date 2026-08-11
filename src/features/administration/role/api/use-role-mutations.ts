import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { RoleFormValues } from '../schemas'
import { createRole, deleteRole, updateRole } from './role-api'

/** POST /user/roles — author a role, then refresh the list. */
export function useCreateRole(companyId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: RoleFormValues) => createRole(values, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.role.all })
    },
  })
}

/**
 * PATCH /user/roles/:id — update a role, then refresh list + detail.
 *
 * `permissions.all` goes too: editing the role the signed-in user is on changes
 * what the sidebar and every gated button may show. The API mints permissions
 * into the access token, so the change only truly lands at their next login —
 * but leaving a stale `my-role` cached would show them the *old* menu even after
 * that, which is worse than one extra request.
 */
export function useUpdateRole(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: RoleFormValues) => updateRole(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.role.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
    },
  })
}

/** DELETE /user/roles/:id — remove a role, then refresh the list. */
export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.role.all })
    },
  })
}
