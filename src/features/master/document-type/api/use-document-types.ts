import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchDocumentTypes } from './document-type-api'

/**
 * GET /user/document-types — the company's document type master, name A→Z.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master — what the Document form's type
 * dropdown asks for.
 */
export function useDocumentTypes(params: PageParams = ALL_ROWS) {
  return useQuery({
    queryKey: queryKeys.documentType.list(params),
    queryFn: () => fetchDocumentTypes(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
