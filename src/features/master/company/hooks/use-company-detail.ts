import { useNavigate } from '@tanstack/react-router'
import { encryptId } from '@/lib/crypto'
import { useCompany } from '../api/use-company'

/**
 * Orchestrates the company detail screen: the record query plus navigation back
 * to the list and on to the edit screen. `id` is `undefined` when the `?data=`
 * token is missing or malformed — the query stays disabled in that case.
 */
export function useCompanyDetail(id: number | undefined) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useCompany(id ?? NaN)

  const goToList = () => navigate({ to: '/master/company' })
  const goToEdit = () => {
    if (id === undefined) return
    navigate({ to: '/master/company/create', search: { data: encryptId(id) } })
  }

  return { company: data, isLoading, isError, error, goToList, goToEdit }
}
