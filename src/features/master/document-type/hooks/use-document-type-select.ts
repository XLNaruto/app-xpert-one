import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { DOCUMENT_TYPE_SORT } from '../constants'
import { fetchDocumentTypes, fetchDocumentType } from '../api/document-type-api'
import { documentTypeOptions } from '../lib/document-type-mappers'
import type { DocumentType } from '../types'

/** A document type as the option the dropdown shows. */
const toOption = (row: DocumentType): ComboboxOption => documentTypeOptions([row])[0]

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.documentType.detail(Number(value)),
  fetch: async (value) => toOption(await fetchDocumentType(Number(value))),
}

/**
 * The document types as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useDocumentTypeSelect({
  toOption: label = toOption,
  ...rest
}: MasterSelectOptions<DocumentType> = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.documentType.infinite(search),
    fetchPage: (params) => fetchDocumentTypes(params),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: DOCUMENT_TYPE_SORT.typeName, sortBy: 'asc' },
    ...rest,
  })
}
