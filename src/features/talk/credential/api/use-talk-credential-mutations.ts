import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { TalkCredentialFormValues } from '../schemas'
import {
  createTalkCredential,
  deleteTalkCredential,
  updateTalkCredential,
} from './talk-credential-api'

/** POST /user/talk-credentials — issue a login, then refresh the list. */
export function useCreateTalkCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: TalkCredentialFormValues) => createTalkCredential(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talkCredential.all })
    },
  })
}

/** PATCH /user/talk-credentials/:id — update one, then refresh list + detail. */
export function useUpdateTalkCredential(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: TalkCredentialFormValues) => updateTalkCredential(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talkCredential.all })
    },
  })
}

/** DELETE /user/talk-credentials/:id — revoke a login, then refresh the list. */
export function useDeleteTalkCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteTalkCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.talkCredential.all })
    },
  })
}
