import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { DocumentTypeFormValues } from '../schemas'
import {
  createDocumentType,
  deleteDocumentType,
  updateDocumentType,
} from './document-type-api'

/** POST /user/document-types — create a type, then refresh the list. */
export function useCreateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DocumentTypeFormValues) => createDocumentType(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentType.all })
    },
  })
}

/** PATCH /user/document-types/:id — rename a type, then refresh list + detail.

 * Documents carry their type's NAME on every list row, so the document master
 * is refreshed too — a rename here changes what those rows read. */
export function useUpdateDocumentType(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DocumentTypeFormValues) => updateDocumentType(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentType.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.document.all })
    },
  })
}

/** DELETE /user/document-types/:id — remove a type, then refresh the list.

 * Refused by the server while documents are still filed under it, so the
 * document master is refreshed alongside. */
export function useDeleteDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDocumentType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentType.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.document.all })
    },
  })
}
