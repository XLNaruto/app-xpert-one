import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { PageParams } from '@/lib/pagination'
import { fetchPaymentBatch, fetchPaymentHistory } from './pay-salary-api'
import type { PaymentHistoryFilters } from '../schemas'

/**
 * GET /user/salary/payments/history — the period's batches, newest first.
 *
 * Keyed by the same period and scope the Pay Salary screen reads for, so
 * arriving from it with a department filter set shows that department's batches
 * rather than the whole company's.
 */
export function usePaymentHistory(
  filters: PaymentHistoryFilters,
  params: PageParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.salary.paymentHistory({ ...filters }, params),
    queryFn: () => fetchPaymentHistory(filters, params),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/**
 * One batch expanded — fetched only when a card is actually opened, since the
 * history screen shows a dozen cards and nobody opens all of them.
 */
export function usePaymentBatch(
  id: number | null,
  params: PageParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.salary.paymentBatch(id ?? 0, params),
    queryFn: () => fetchPaymentBatch(id as number, params),
    enabled: enabled && id !== null,
    placeholderData: keepPreviousData,
  })
}
