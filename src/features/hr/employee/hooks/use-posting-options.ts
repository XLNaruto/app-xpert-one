import { useMemo } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import type { PagedSelect } from '@/hooks/use-paged-select'
import { useBranchSelect } from '@/features/master/branch'
import { departmentOptions, useDepartments } from '@/features/master/department'
import { useDesignationSelect } from '@/features/master/designation'

/** The dropdowns a posting is assembled from, ready for `<Combobox>`. */
export interface PostingOptions {
  /** Scroll-lazy, server-searched — spread onto the branch `<Combobox>`. */
  branches: PagedSelect
  departments: ComboboxOption[]
  isDepartmentsLoading: boolean
  /** Scroll-lazy, server-searched — spread onto the designation `<Combobox>`. */
  designations: PagedSelect
}

/** A stored posting that already names its branch and designation. */
export interface SavedPostingNames {
  branchId: number | null
  branchName: string
  designationId: number | null
  designationName: string
}

export interface PostingOptionsParams {
  /** What the form's branch field holds right now. */
  branchId: string
  /** What the form's designation field holds right now. */
  designationId: string
  /**
   * The posting the form was seeded from, when it carries the names — labels the
   * saved values without a by-id read. Only used while a field still holds that
   * record's id, so a fresh pick is never shown under the old name.
   */
  saved?: SavedPostingNames
  /** See below — the destination company of a cross-company transfer. */
  companyId?: number
  /** Hold the branch/designation reads back until the form is on screen. */
  enabled?: boolean
}

/** The saved name, while the field still holds the saved id. */
function savedLabel(value: string, id: number | null | undefined, name: string | undefined) {
  return id !== null && id !== undefined && String(id) === value && name ? name : undefined
}

/**
 * The three masters a posting points at — branch, department, designation.
 *
 * Branch and designation page in as their lists are scrolled and search
 * server-side, so the form never pulls either master whole.
 *
 * **Why the department list is narrowed here rather than by the API.**
 * `GET /user/departments` takes only `company_id`; there is no `branch_id`
 * filter. But a department carries the branch it's pinned to, so the department
 * read still pulls the whole master and narrows it to the chosen branch — paging
 * it would show pages thinned (or emptied) by the filter.
 *
 * A department pinned to no branch stays in the list whatever is chosen: it
 * belongs to the company rather than to one branch.
 *
 * **Designations are company-wide.** This API models no department → designation
 * link, so the designation dropdown never cascades — which is also why a posting
 * can be a designation alone (the API's bypass hierarchy).
 *
 * **`companyId`** is normally left off, meaning the company the session has
 * active. A transfer to *another* company is the exception: the destination's own
 * branches, departments and designations are what the new posting must point at,
 * so that id is passed straight through to the three reads.
 */
export function usePostingOptions({
  branchId,
  designationId,
  saved,
  companyId,
  enabled = true,
}: PostingOptionsParams): PostingOptions {
  const branches = useBranchSelect({
    companyId,
    enabled,
    selected: branchId || undefined,
    selectedLabel: savedLabel(branchId, saved?.branchId, saved?.branchName),
  })
  const designations = useDesignationSelect({
    companyId,
    enabled,
    selected: designationId || undefined,
    selectedLabel: savedLabel(designationId, saved?.designationId, saved?.designationName),
  })
  const departments = useDepartments(undefined, companyId)

  // The query result itself is the dependency — `?? []` inside the memo, never
  // outside it, or the fallback is a fresh array every render and nothing is
  // ever memoized.
  const departmentList = useMemo(() => {
    const all = departments.data?.items ?? []
    const chosenBranch = branchId.trim() ? Number(branchId) : undefined

    const scoped =
      chosenBranch === undefined
        ? all
        : all.filter(
            (department) =>
              department.branchId === null || department.branchId === chosenBranch,
          )

    return departmentOptions(scoped)
  }, [departments.data, branchId])

  return {
    branches,
    departments: departmentList,
    isDepartmentsLoading: departments.isLoading,
    designations,
  }
}
