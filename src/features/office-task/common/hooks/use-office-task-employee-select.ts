import type { ComboboxOption } from '@/components/ui/combobox'
import { usePagedSelect, type PagedSelect } from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { fetchOfficeTaskEmployees } from '../api/office-task-api'
import type { OfficeTaskEmployee, PickBy } from '../types'

interface UseOfficeTaskEmployeeSelectOptions {
  pickBy: PickBy
  /** The picked designation / role id — `''` until one is chosen. */
  targetId: string
  /** SOP Tasks tab 2: marks the people who already run this group. */
  sopGroupId?: number
  /** What the field currently holds, so a picked label outlives its page. */
  selected?: string[]
  /** Overrides the default option — a disabled "already assigned" row, say. */
  toOption?: (row: OfficeTaskEmployee) => ComboboxOption
}

/**
 * The muted text beside a name — an employee's code, or a panel user's email
 * (a user has no code, and email is what a role search matches on).
 */
export const personHint = (row: OfficeTaskEmployee): string | undefined =>
  (row.kind === 'user' ? row.email : row.code) || undefined

/** Name as the label, the code / email as the muted hint. */
const defaultOption = (row: OfficeTaskEmployee): ComboboxOption => ({
  label: row.name,
  value: String(row.id),
  hint: personHint(row),
})

/**
 * The people a designation or role points at, as a scroll-lazy, server-searched
 * `<Combobox>`. Held back until a target is picked — the endpoint requires one.
 */
export function useOfficeTaskEmployeeSelect({
  pickBy,
  targetId,
  sopGroupId,
  selected,
  toOption = defaultOption,
}: UseOfficeTaskEmployeeSelectOptions): PagedSelect {
  const id = Number(targetId)
  const enabled = targetId !== '' && Number.isFinite(id) && id > 0
  return usePagedSelect({
    queryKey: (search) =>
      queryKeys.officeTask.employees({ pickBy, targetId: id, sopGroupId: sopGroupId ?? 0 }, search),
    fetchPage: (params) => fetchOfficeTaskEmployees({ pickBy, targetId: id, sopGroupId }, params),
    toOption,
    selected,
    enabled,
  })
}
