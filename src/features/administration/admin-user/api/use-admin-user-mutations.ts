import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { AdminUserFormValues } from '../schemas'
import type { AdminUser } from '../types'
import { createAdminUser, deleteAdminUser, updateAdminUser } from './admin-user-api'

/** POST /user/admin-users — create a login, then refresh the list. */
export function useCreateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AdminUserFormValues) => createAdminUser(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser.all })
    },
  })
}

/**
 * PATCH /user/admin-users/:id — update a user, then refresh list + detail.
 *
 * `record` is what's currently stored, which is what decides whether the role
 * travels: an unchanged pick is omitted rather than sent to be rejected.
 *
 * `permissions.all` goes too, because the caller may have just edited their own
 * row — the sidebar and every gated button read from `my-role`, and leaving a
 * stale copy cached would keep showing them the old menu.
 */
export function useUpdateAdminUser(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ values, record }: { values: AdminUserFormValues; record: AdminUser }) =>
      updateAdminUser(id, values, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
    },
  })
}

/** DELETE /user/admin-users/:id — remove a user, then refresh the list. */
export function useDeleteAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser.all })
    },
  })
}
