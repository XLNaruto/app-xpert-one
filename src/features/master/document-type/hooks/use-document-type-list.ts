import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { DOCUMENT_TYPE_DEFAULT_SORT } from '../constants'
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
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, DOCUMENT_TYPE_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useDocumentTypes(params)
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

  // A 403 isn't a broken screen, it's a missing permission — the page shows the
  // 403 screen with the server's reason instead of an inline error line.
  const isForbidden = isForbiddenError(error)

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    // Server-side ordering — a header click re-queries instead of sorting the
    // page on screen.
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteDocumentType.isPending,
  }
}
