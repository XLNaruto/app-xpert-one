import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ALL_PAGE_SIZE } from '@/components/data-table'
import { usePagination } from '@/hooks/use-pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { toastApiError } from '@/lib/api-toast'
import { usePurchasedPlans } from '../api/use-purchased-plans'
import { useDownloadInvoice } from '../api/use-billing-mutations'
import type { PurchasedPlan } from '../types'

/**
 * Orchestrates the Purchase History screen: the paged read, the per-row invoice
 * download and the way back to billing. The page consumes this and only renders.
 *
 * Search is server-side; there's no sort — the endpoint always answers newest
 * purchase first.
 */
export function usePurchaseHistory() {
  const navigate = useNavigate()
  const { params, limit, offset, onPaginationChange, search, setSearch } =
    usePagination(ALL_PAGE_SIZE)

  const { data, isLoading, isError, error } = usePurchasedPlans(params)
  // `mutate` is stable across renders; the mutation object itself isn't.
  const { mutate: requestInvoice } = useDownloadInvoice()

  /**
   * The row whose invoice is being fetched. Tracked per row rather than read off
   * `download.isPending`, so only that row's button spins.
   */
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const downloadInvoice = useCallback(
    (row: PurchasedPlan) => {
      // Only a paid term has an invoice — the button isn't rendered otherwise,
      // and asking anyway would just earn a 404.
      if (!row.invoiceNumber) return
      setDownloadingId(row.id)
      requestInvoice(
        { subscriptionId: row.id, invoiceNumber: row.invoiceNumber },
        {
          onError: (err) => toastApiError(err, "Couldn't Download the Invoice."),
          onSettled: () => setDownloadingId(null),
        },
      )
    },
    [requestInvoice],
  )

  return {
    rows: data?.items ?? [],
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    isLoading,
    isError,
    error,
    // A 403 is a missing permission, not a broken screen.
    isForbidden: isForbiddenError(error),
    forbiddenMessage: isForbiddenError(error) ? getApiErrorMessage(error) : undefined,
    downloadInvoice,
    downloadingId,
    goBack: useCallback(() => navigate({ to: '/administration/billing' }), [navigate]),
  }
}
