import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { documentTypeOptions, useDocumentTypes } from '@/features/master/document-type'
import { DOCUMENT_DEFAULT_SORT } from '../constants'
import { useDocuments } from '../api/use-documents'
import { useDeleteDocument } from '../api/use-document-mutations'
import type { Document } from '../types'

/**
 * Orchestrates the document master list screen: the list query, the document
 * type filter, navigation to the create/edit screens and the delete flow. The
 * page consumes this and only renders.
 */
export function useDocumentList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, DOCUMENT_DEFAULT_SORT)

  /** The type filter — '' is "every type", which the API gets as no filter. */
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading, isError, error } = useDocuments(
    params,
    typeFilter ? Number(typeFilter) : undefined,
  )
  const deleteDocument = useDeleteDocument()

  // The filter dropdown is driven by the document type master.
  const documentTypes = useDocumentTypes()
  const typeOptions = useMemo(
    () => documentTypeOptions(documentTypes.data?.items ?? []),
    [documentTypes.data],
  )

  const [pendingDelete, setPendingDelete] = useState<Document | null>(null)

  /** Filtering is a different result set, so it starts at its own first page. */
  const changeTypeFilter = (value: string) => {
    setTypeFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }

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
    /** Type filter — applied server-side via `document_type_id`. */
    typeFilter,
    changeTypeFilter,
    typeOptions,
    isTypesLoading: documentTypes.isLoading,
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
    isDeleting: deleteDocument.isPending,
  }
}
