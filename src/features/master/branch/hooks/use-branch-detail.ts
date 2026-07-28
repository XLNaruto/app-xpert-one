import { useNavigate } from '@tanstack/react-router'
import { encryptId } from '@/lib/crypto'
import { useBranch } from '../api/use-branch'

/**
 * Orchestrates the branch detail screen: the record query plus navigation back
 * to the list and on to the edit screen. `id` is `undefined` when the `?data=`
 * token is missing or malformed — the query stays disabled in that case.
 */
export function useBranchDetail(id: number | undefined) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useBranch(id ?? NaN)

  const goToList = () => navigate({ to: '/master/branch' })
  const goToEdit = () => {
    if (id === undefined) return
    navigate({ to: '/master/branch/create', search: { data: encryptId(id) } })
  }

  return { branch: data, isLoading, isError, error, goToList, goToEdit }
}
