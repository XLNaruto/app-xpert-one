import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDocumentType } from './document-type-api'

/** GET /user/document-types/:id — a single document type record. */
export function useDocumentType(id: number) {
  return useQuery({
    queryKey: queryKeys.documentType.detail(id),
    queryFn: () => fetchDocumentType(id),
    enabled: Number.isFinite(id),
  })
}
