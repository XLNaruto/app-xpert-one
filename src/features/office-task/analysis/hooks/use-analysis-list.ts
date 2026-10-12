import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { encryptParams } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useDepartmentSelect } from '@/features/master/department'
import { useEmployeeSelect } from '@/features/hr/employee'
import { ANALYSIS_DEFAULT_SORT, defaultAnalysisFilters } from '../constants'
import { useProjectAnalysis, useSopAnalysis } from '../api/use-analysis'
import type { AnalysisFilters, AnalysisKind } from '../types'

/** Task Analysis: which kind (SOP / project), the window and filters, and the employee page. */
export function useAnalysisList() {
  const navigate = useNavigate()
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)
  const [kind, setKind] = useState<AnalysisKind>('sop')
  const [filters, setFilters] = useState<AnalysisFilters>(defaultAnalysisFilters)
  const pagination = usePagination(DEFAULT_PAGE_SIZE, ANALYSIS_DEFAULT_SORT)

  const sop = useSopAnalysis(filters, pagination.params, kind === 'sop')
  const project = useProjectAnalysis(filters, pagination.params, kind === 'project')
  const active = kind === 'sop' ? sop : project

  const departmentSelect = useDepartmentSelect({ selected: filters.departmentId })
  const employeeSelect = useEmployeeSelect({ selected: filters.employeeId })

  const firstPage = () => pagination.onPaginationChange({ limit: pagination.limit, offset: 0 })

  return {
    ...pagination,
    companyId,
    kind,
    setKind: (next: AnalysisKind) => {
      setKind(next)
      firstPage()
    },
    filters,
    changeFilter: (patch: Partial<AnalysisFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }))
      firstPage()
    },
    resetFilters: () => {
      pagination.setSearch('')
      setFilters(defaultAnalysisFilters())
      firstPage()
    },
    departmentSelect,
    employeeSelect,
    sopRows: sop.data?.items ?? [],
    sopSummary: sop.data?.summary,
    projectRows: project.data?.items ?? [],
    projectSummary: project.data?.summary,
    total: active.data?.total ?? 0,
    isLoading: active.isLoading,
    isError: active.isError,
    error: active.error,
    /** One employee in depth — on this tab and window. */
    openDetail: (employeeId: number) =>
      navigate({
        to: '/office-task/analysis/detail',
        search: { data: encryptParams({ id: employeeId, kind, from: filters.from, to: filters.to }) },
      }),
  }
}
