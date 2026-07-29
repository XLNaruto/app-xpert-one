import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useDocuments } from '../api/use-documents'
import { useDeleteDocument } from '../api/use-document-mutations'
import type { Document } from '../types'

/**
 * Orchestrates the document master list screen: the list query, navigation to
 * the create/edit screens and the delete flow. The page consumes this and only
 * renders.
 */
export function useDocumentList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useDocuments()
  const deleteDocument = useDeleteDocument()

  const [pendingDelete, setPendingDelete] = useState<Document | null>(null)

  const goToCreate = () => navigate({ to: '/master/document/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/document/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDocument.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Document deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete document'),
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
    isDeleting: deleteDocument.isPending,
  }
}
