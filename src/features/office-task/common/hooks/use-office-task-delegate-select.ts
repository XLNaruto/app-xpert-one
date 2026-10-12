import type { ComboboxOption } from '@/components/ui/combobox'
import { usePagedSelect, type PagedSelect } from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { fetchOfficeTaskDelegates } from '../api/office-task-api'
import { delegateValue } from '../lib/office-task-mappers'
import type { OfficeTaskDelegate } from '../types'

const toOption = (row: OfficeTaskDelegate): ComboboxOption => ({
  label: row.name,
  value: delegateValue(row.kind, row.id),
  hint: row.kind === 'user' ? 'Panel user' : row.code || undefined,
})

/**
 * The delegate dropdown of an "other" project task — employees and panel users
 * in one name-ordered list, scroll-lazy and server-searched. An option's value
 * carries its kind (`employee:12` / `user:3`) since the two ids can collide.
 */
export function useOfficeTaskDelegateSelect({
  selected,
  selectedLabel,
  enabled = true,
}: {
  selected?: string
  /** The saved delegate's name, so an edit shows it before its page loads. */
  selectedLabel?: string
  enabled?: boolean
}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.officeTask.delegates(search),
    fetchPage: fetchOfficeTaskDelegates,
    toOption,
    selected,
    selectedLabel,
    enabled,
  })
}
