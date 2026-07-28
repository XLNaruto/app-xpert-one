import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useFactoryOfficeAddresses } from '../api/use-factory-office-addresses'
import { useDeleteFactoryOfficeAddress } from '../api/use-factory-office-address-mutations'
import type { FactoryOfficeAddress } from '../types'

/**
 * Orchestrates the factory office address list screen: the list query, navigation
 * to the create/edit screen and the delete flow. The page consumes this and
 * only renders.
 */
export function useFactoryOfficeAddressList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useFactoryOfficeAddresses()
  const deleteAddress = useDeleteFactoryOfficeAddress()

  const [pendingDelete, setPendingDelete] = useState<FactoryOfficeAddress | null>(null)

  const goToCreate = () => navigate({ to: '/master/factory-office-address/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: '/master/factory-office-address/create',
      search: { data: encryptId(id) },
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteAddress.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('factory office address deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete factory office address',
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
