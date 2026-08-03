import { useNavigate } from '@tanstack/react-router'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
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

  // A 403 isn't a broken screen, it's a missing permission — the page shows the
  // 403 screen with the server's reason instead of an inline error line.
  const isForbidden = isForbiddenError(error)

  return {
    company: data,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    goToList,
    goToEdit,
  }
}
