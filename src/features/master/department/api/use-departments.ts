import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDepartments } from './department-api'

/** GET /departments — the department master list. */
export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.department.list(),
    queryFn: fetchDepartments,
  })
}
