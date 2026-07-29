import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchAllowanceDeductions } from './allowance-deduction-api'

/** GET /allowance-deductions — the allowance / deduction master list. */
export function useAllowanceDeductions() {
  return useQuery({
    queryKey: queryKeys.allowanceDeduction.list(),
    queryFn: fetchAllowanceDeductions,
  })
}
