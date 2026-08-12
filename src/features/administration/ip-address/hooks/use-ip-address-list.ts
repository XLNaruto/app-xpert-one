import { useState } from 'react'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { IP_ADDRESS_DEFAULT_SORT } from '../constants'
import { useIpAddresses } from '../api/use-ip-addresses'
import { useDeleteIpAddress } from '../api/use-ip-address-mutations'
import type { IpAddressType } from '../schemas'
import type { IpAddress } from '../types'

/**
 * Orchestrates the IP access list screen: the list query, the allow/block
 * filter, the add/edit dialog and the delete flow. The page consumes this and
 * only renders.
 */
export function useIpAddressList() {
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, IP_ADDRESS_DEFAULT_SORT)

  /** '' is "both lists", which the API gets as no `type` at all. */
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading, isError, error } = useIpAddresses(
    params,
    typeFilter ? (typeFilter as IpAddressType) : undefined,
  )
  const deleteIpAddress = useDeleteIpAddress()

  /** The add/edit dialog and the row it's seeded with (`null` = create). */
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<IpAddress | null>(null)
  const [pendingDelete, setPendingDelete] = useState<IpAddress | null>(null)

  /** Filtering is a different result set, so it starts at its own first page. */
  const changeTypeFilter = (value: string) => {
    setTypeFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }

  const resetFilters = () => {
    setSearch('')
    changeTypeFilter('')
  }

  /** Open the form dialog blank (create). */
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  /** Open the form dialog seeded with a row (edit) — no extra read needed. */
  const openEdit = (record: IpAddress) => {
    setEditing(record)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteIpAddress.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('IP address removed')
        setPendingDelete(null)
      },
      // A 409 here is the server refusing to strand the panel — the last allowed
      // entry of a RESTRICTED company. Its message says so, so surface it.
      onError: (err) =>
        toast.error(getApiErrorMessage(err, 'Failed to delete IP address')),
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
    /** List filter — applied server-side via `type`. */
    typeFilter,
    changeTypeFilter,
    resetFilters,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    formOpen,
    setFormOpen,
    editing,
    openCreate,
    openEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteIpAddress.isPending,
  }
}
