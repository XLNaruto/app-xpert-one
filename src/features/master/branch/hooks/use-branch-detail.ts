import { useNavigate } from '@tanstack/react-router'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useBranch } from '../api/use-branch'
import { useBranchActs } from '../api/use-branch-acts'
import { useActLookups } from './use-act-lookups'

/**
 * Orchestrates the branch detail screen: the record, its applicable acts, and
 * navigation back to the list or on to the edit screen. `id` is `undefined`
 * when the `?data=` token is missing or malformed — both queries stay disabled
 * in that case.
 *
 * The acts row references states, districts and offices by id, so the lookups
 * come along to turn those into the names the screen actually shows.
 */
export function useBranchDetail(id: number | undefined) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useBranch(id ?? NaN)
  const acts = useBranchActs(id ?? NaN)

  // The names are only wanted once there's an acts row to name anything in, and
  // the district read is narrowed to the state Professional Tax points at.
  const lookups = useActLookups({
    enabled: acts.data != null,
    ptStateId: acts.data?.ptStateId ?? undefined,
  })

  const goToList = () => navigate({ to: '/master/branch' })
  const goToEdit = () => {
    if (id === undefined) return
    navigate({ to: '/master/branch/create', search: { data: encryptId(id) } })
  }

  // A 403 isn't a broken screen, it's a missing permission — the page shows the
  // 403 screen with the server's reason instead of an inline error line.
  const isForbidden = isForbiddenError(error)

  return {
    branch: data,
    /** `null` once loaded means the branch is registered under no act. */
    acts: acts.data ?? null,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    stateName: lookups.stateName,
    districtName: lookups.districtName,
    officeName: lookups.officeName,
    goToList,
    goToEdit,
  }
}
