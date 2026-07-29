import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchAllowanceDeduction } from './allowance-deduction-api'

/** GET /allowance-deductions/:id — a single allowance / deduction record. */
export function useAllowanceDeduction(id: number) {
  return useQuery({
    queryKey: queryKeys.allowanceDeduction.detail(id),
    queryFn: () => fetchAllowanceDeduction(id),
    enabled: Number.isFinite(id),
  })
}
