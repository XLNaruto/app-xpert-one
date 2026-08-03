import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { OFFICE_ADDRESS_DEFAULT_SORT } from '../constants'
import { useOfficeAddresses } from '../api/use-office-addresses'
import { useDeleteOfficeAddress } from '../api/use-office-address-mutations'
import type { OfficeAddress, OfficeAddressScreen } from '../types'

/**
 * Orchestrates any one of the five office address list screens: the list query,
 * navigation to the create/edit screen and the delete flow. `screen` is what
 * makes it that screen — which `office_for` it reads and which routes it
 * navigates to. The page consumes this and only renders.
 */
export function useOfficeAddressList(screen: OfficeAddressScreen) {
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
  } = usePagination(DEFAULT_PAGE_SIZE, OFFICE_ADDRESS_DEFAULT_SORT)
  const { data, isLoading, isError, error } = useOfficeAddresses(
    screen.officeFor,
    params,
  )
  const deleteAddress = useDeleteOfficeAddress()

  const [pendingDelete, setPendingDelete] = useState<OfficeAddress | null>(null)

  const goToCreate = () => navigate({ to: screen.createPath })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: screen.createPath, search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteAddress.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(`${screen.shortLabel} deleted`)
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to delete ${screen.shortLabel}`,
        ),
    })
  }

  // A 403 isn't a broken screen, it's a missing permission — the page shows the
  // 403 screen with the server's reason instead of an inline error line.
  const isForbidden = isForbiddenError(error)

  return {
    rows: data?.items ?? [],
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
    isDeleting: deleteAddress.isPending,
  }
}
