import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { decryptParams } from '@/lib/crypto'
import { useAuthStore } from '@/stores/auth-store'
import { useSalaryReport } from '../api/use-salary-report'
import type { SalaryViewFilters } from '../schemas'

/** What the list screen packs into the detail route's `?data=` token. */
interface SalaryViewToken {
  id?: number
  employeeId?: number
  month?: number
  year?: number
}

/**
 * One stored salary, read back for the detail screen.
 *
 * There is no `GET /user/salary/:id` — the report is the only endpoint that
 * answers a stored salary — so the detail screen reads the same report narrowed
 * to one employee and period (`employee_ids`), then picks the row by its salary
 * id. That also means the detail view and the list share a cache family: a
 * discard invalidates `salary.all` and both go stale together.
 *
 * The token is decrypted here at the page's edge, never inside the query hook.
 */
export function useSalaryViewDetail(data?: string) {
  const navigate = useNavigate()
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  const token = useMemo(
    () => (data ? decryptParams<SalaryViewToken>(data) : null),
    [data],
  )

  const salaryId = Number(token?.id)
  const employeeId = Number(token?.employeeId)
  const month = Number(token?.month)
  const year = Number(token?.year)

  /** A malformed or missing token is "not found" on a detail screen. */
  const isValidToken =
    Number.isFinite(salaryId) &&
    Number.isFinite(employeeId) &&
    Number.isFinite(month) &&
    Number.isFinite(year)

  const filters = useMemo<SalaryViewFilters>(
    () => ({ companyId: companyId ?? 0, month, year, departmentId: null }),
    [companyId, month, year],
  )

  const report = useSalaryReport(
    filters,
    /* One person, one period. Not `limit: 1` — an employee transferred mid-month
       has two postings and so two stored salaries, and the token names which of
       them was clicked; a page of one could answer the other. */
    { limit: 20, offset: 0 },
    { enabled: isValidToken && companyId !== null, employeeIds: [employeeId] },
  )

  /* Match on the salary id rather than taking the first row: an employee with
     two postings in the same period has two stored salaries, and the token names
     which one was clicked. */
  const row =
    report.data?.items.find((item) => item.salaryId === salaryId) ??
    report.data?.items[0] ??
    null

  return {
    isValidToken,
    salaryId,
    row,
    period: report.data?.period ?? null,
    query: report,
    goBack: () => navigate({ to: '/hr/salary-view' }),
  }
}
