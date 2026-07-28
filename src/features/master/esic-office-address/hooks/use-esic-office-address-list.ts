import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useEsicOfficeAddresses } from '../api/use-esic-office-addresses'
import { useDeleteEsicOfficeAddress } from '../api/use-esic-office-address-mutations'
import type { EsicOfficeAddress } from '../types'

/**
 * Orchestrates the ESIC office address list screen: the list query, navigation
 * to the create/edit screen and the delete flow. The page consumes this and
 * only renders.
 */
export function useEsicOfficeAddressList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useEsicOfficeAddresses()
  const deleteAddress = useDeleteEsicOfficeAddress()

  const [pendingDelete, setPendingDelete] = useState<EsicOfficeAddress | null>(null)

  const goToCreate = () => navigate({ to: '/master/esic-office-address/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: '/master/esic-office-address/create',
      search: { data: encryptId(id) },
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteAddress.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('ESIC office address deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete ESIC office address',
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
