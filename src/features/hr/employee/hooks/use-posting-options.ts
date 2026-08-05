import { useMemo } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { branchOptions, useBranches } from '@/features/master/branch'
import { departmentOptions, useDepartments } from '@/features/master/department'
import { useDesignations } from '@/features/master/designation'

/** The dropdowns a posting is assembled from, ready for `<Combobox>`. */
export interface PostingOptions {
  branches: ComboboxOption[]
  departments: ComboboxOption[]
  designations: ComboboxOption[]
  isLoading: boolean
}

/**
 * The three masters a posting points at — branch, department, designation.
 *
 * **Why the department list is narrowed here rather than by the API.**
 * `GET /user/departments` takes only `company_id`; there is no `branch_id`
 * filter. But a department carries the branch it's pinned to, and each of these
 * reads pulls the whole master anyway (they feed dropdowns, not paged lists), so
 * narrowing to the chosen branch is a filter over data already in hand — not
 * client-side paging of a list.
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
export function usePostingOptions(branchId: string, companyId?: number): PostingOptions {
  const branches = useBranches(undefined, companyId)
  const departments = useDepartments(undefined, companyId)
  const designations = useDesignations(undefined, companyId)

  // The query results themselves are the dependencies — `?? []` inside the memo,
  // never outside it, or the fallback is a fresh array every render and nothing is
  // ever memoized.
  const options = useMemo(() => {
    const branchList = branches.data?.items ?? []
    const departmentList = departments.data?.items ?? []
    const designationList = designations.data?.items ?? []

    const chosenBranch = branchId.trim() ? Number(branchId) : undefined

    const scoped =
      chosenBranch === undefined
        ? departmentList
        : departmentList.filter(
            (department) =>
              department.branchId === null || department.branchId === chosenBranch,
          )

    return {
      branches: branchOptions(branchList),
      departments: departmentOptions(scoped),
      designations: designationList.map((designation) => ({
        label: designation.designationName,
        value: String(designation.id),
      })),
    }
  }, [branches.data, departments.data, designations.data, branchId])

  return {
    ...options,
    isLoading: branches.isLoading || departments.isLoading || designations.isLoading,
  }
}
