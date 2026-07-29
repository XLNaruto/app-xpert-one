import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useDocumentTypes } from '../api/use-document-types'
import { useDeleteDocumentType } from '../api/use-document-type-mutations'
import type { DocumentType } from '../types'

/**
 * Orchestrates the document type master list screen: the list query, navigation
 * to the create/edit screens and the delete flow. The page consumes this and
 * only renders.
 */
export function useDocumentTypeList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useDocumentTypes()
  const deleteDocumentType = useDeleteDocumentType()

  const [pendingDelete, setPendingDelete] = useState<DocumentType | null>(null)

  const goToCreate = () => navigate({ to: '/master/document-type/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/document-type/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDocumentType.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Document type deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete document type',
        ),
    })
  }

  return {
    rows: data ?? [],
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteDocumentType.isPending,
  }
}
