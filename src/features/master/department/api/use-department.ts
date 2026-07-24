import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDepartment } from './department-api'

/** GET /departments/:id — a single department record. */
export function useDepartment(id: number) {
  return useQuery({
    queryKey: queryKeys.department.detail(id),
    queryFn: () => fetchDepartment(id),
    enabled: Number.isFinite(id),
  })
}
