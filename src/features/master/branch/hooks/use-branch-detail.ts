import { useNavigate } from '@tanstack/react-router'
import { useBranch } from '../api/use-branch'

/**
 * Orchestrates the branch detail screen: the record query plus navigation back
 * to the list and on to the edit screen.
 */
export function useBranchDetail(id: number) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useBranch(id)

  const goToList = () => navigate({ to: '/branch' })
  const goToEdit = () =>
    navigate({ to: '/branch/$branchId/edit', params: { branchId: String(id) } })

  return { branch: data, isLoading, isError, error, goToList, goToEdit }
}
