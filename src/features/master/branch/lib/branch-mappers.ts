import type { BranchFormValues } from '../schemas'
import type { Branch } from '../types'

/**
 * Hydrate the edit form from a stored branch. The record's fields are the form's
 * fields one-for-one (minus `id`/`createdAt`), so nulls just become empty
 * strings for react-hook-form.
 */
export function branchToFormValues(branch: Branch): BranchFormValues {
  const { id: _id, createdAt: _createdAt, ...fields } = branch
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value ?? '']),
  ) as BranchFormValues
}
