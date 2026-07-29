import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { DocumentTypeFormValues } from '../schemas'
import {
  createDocumentType,
  deleteDocumentType,
  updateDocumentType,
} from './document-type-api'

/** POST /document-types — create a document type, then refresh the list. */
export function useCreateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DocumentTypeFormValues) => createDocumentType(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentType.all })
    },
  })
}

/** PUT /document-types/:id — update a document type, then refresh list + detail. */
export function useUpdateDocumentType(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DocumentTypeFormValues) => updateDocumentType(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentType.all })
    },
  })
}

/** DELETE /document-types/:id — remove a document type, then refresh the list. */
export function useDeleteDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDocumentType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentType.all })
    },
  })
}
