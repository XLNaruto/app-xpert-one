import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchDocuments } from './document-api'

/**
 * GET /user/documents — the company's document master, name A→Z.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with
 * no argument it returns the whole master, for dropdowns.
 *
 * `documentTypeId` narrows the page to one category server-side; leave it off to
 * list every document of the company.
 */
export function useDocuments(params: PageParams = ALL_ROWS, documentTypeId?: number) {
  return useQuery({
    queryKey: queryKeys.document.list(params, documentTypeId),
    queryFn: () => fetchDocuments(params, documentTypeId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}
