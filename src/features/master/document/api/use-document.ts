import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDocument } from './document-api'

/** GET /documents/:id — a single document record. */
export function useDocument(id: number) {
  return useQuery({
    queryKey: queryKeys.document.detail(id),
    queryFn: () => fetchDocument(id),
    enabled: Number.isFinite(id),
  })
}
