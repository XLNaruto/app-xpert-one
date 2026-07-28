import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useLwfOfficeAddresses } from '../api/use-lwf-office-addresses'
import { useDeleteLwfOfficeAddress } from '../api/use-lwf-office-address-mutations'
import type { LwfOfficeAddress } from '../types'

/**
 * Orchestrates the LWF office address list screen: the list query, navigation
 * to the create/edit screen and the delete flow. The page consumes this and
 * only renders.
 */
export function useLwfOfficeAddressList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useLwfOfficeAddresses()
  const deleteAddress = useDeleteLwfOfficeAddress()

  const [pendingDelete, setPendingDelete] = useState<LwfOfficeAddress | null>(null)

  const goToCreate = () => navigate({ to: '/master/lwf-office-address/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: '/master/lwf-office-address/create',
      search: { data: encryptId(id) },
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteAddress.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('LWF office address deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete LWF office address',
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
    isDeleting: deleteAddress.isPending,
  }
}
