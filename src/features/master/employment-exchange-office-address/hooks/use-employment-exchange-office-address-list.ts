import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { useEmploymentExchangeOfficeAddresses } from '../api/use-employment-exchange-office-addresses'
import { useDeleteEmploymentExchangeOfficeAddress } from '../api/use-employment-exchange-office-address-mutations'
import type { EmploymentExchangeOfficeAddress } from '../types'

/**
 * Orchestrates the employment exchange office address list screen: the list query, navigation
 * to the create/edit screen and the delete flow. The page consumes this and
 * only renders.
 */
export function useEmploymentExchangeOfficeAddressList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useEmploymentExchangeOfficeAddresses()
  const deleteAddress = useDeleteEmploymentExchangeOfficeAddress()

  const [pendingDelete, setPendingDelete] = useState<EmploymentExchangeOfficeAddress | null>(null)

  const goToCreate = () => navigate({ to: '/master/employment-exchange-office-address/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({
      to: '/master/employment-exchange-office-address/create',
      search: { data: encryptId(id) },
    })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteAddress.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('employment exchange office address deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete employment exchange office address',
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
