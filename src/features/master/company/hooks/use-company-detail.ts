import { useNavigate } from '@tanstack/react-router'
import { useCompany } from '../api/use-company'

/**
 * Orchestrates the company detail screen: the record query plus navigation back
 * to the list and on to the edit screen.
 */
export function useCompanyDetail(id: number) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useCompany(id)

  const goToList = () => navigate({ to: '/company' })
  const goToEdit = () =>
    navigate({ to: '/company/$companyId/edit', params: { companyId: String(id) } })

  return { company: data, isLoading, isError, error, goToList, goToEdit }
}
