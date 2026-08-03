import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { DocumentFormValues } from '../schemas'
import { createDocument, deleteDocument, updateDocument } from './document-api'

/** POST /user/documents — create a document, then refresh the list. */
export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DocumentFormValues) => createDocument(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.document.all })
    },
  })
}

/** PATCH /user/documents/:id — update a document, then refresh the list + detail. */
export function useUpdateDocument(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DocumentFormValues) => updateDocument(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.document.all })
    },
  })
}

/** DELETE /user/documents/:id — remove a document, then refresh the list. */
export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.document.all })
    },
  })
}
