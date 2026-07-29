import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchDocumentTypes } from './document-type-api'

/** GET /document-types — the document type master list. */
export function useDocumentTypes() {
  return useQuery({
    queryKey: queryKeys.documentType.list(),
    queryFn: fetchDocumentTypes,
  })
}
