import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDocuments } from './document-api'

/** GET /documents — the document master list. */
export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.document.list(),
    queryFn: fetchDocuments,
  })
}
