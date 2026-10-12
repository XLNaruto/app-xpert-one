import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { isNotFoundError } from '@/lib/api-error'
import {
  useProjectEmployeeDetail,
  useProjectEmployeeTasks,
  useSopEmployeeChecklists,
  useSopEmployeeDetail,
  useSopEmployeeRuns,
} from '../api/use-analysis'
import { defaultAnalysisFilters } from '../constants'
import type { AnalysisDetailParams, AnalysisKind, ProjectTaskTab, SopRunTab } from '../types'

/**
 * One employee's analysis: which kind and window — opened on the list's, then
 * changeable here — the detail for it, and and each task table's tab and page.
 */
export function useAnalysisDetail(params: Partial<AnalysisDetailParams> | null) {
  const navigate = useNavigate()
  const fallback = defaultAnalysisFilters()
  const [kind, setKind] = useState<AnalysisKind>(params?.kind ?? 'sop')
  const [range, setRange] = useState({ from: params?.from ?? fallback.from, to: params?.to ?? fallback.to })

  const sop = useSopEmployeeDetail(params?.id, range, kind === 'sop')
  const project = useProjectEmployeeDetail(params?.id, range, kind === 'project')
  const active = kind === 'sop' ? sop : project

  const [taskTab, setTaskTab] = useState<ProjectTaskTab>('all')
  const taskPagination = usePagination(DEFAULT_PAGE_SIZE)
  const tasks = useProjectEmployeeTasks(params?.id, range, taskTab, taskPagination.params, kind === 'project')
  const firstTaskPage = () => taskPagination.onPaginationChange({ limit: taskPagination.limit, offset: 0 })

  const checklistPagination = usePagination(DEFAULT_PAGE_SIZE)
  const checklists = useSopEmployeeChecklists(params?.id, range, checklistPagination.params, kind === 'sop')
  const firstChecklistPage = () =>
    checklistPagination.onPaginationChange({ limit: checklistPagination.limit, offset: 0 })

  const [runTab, setRunTab] = useState<SopRunTab>('all')
  const runPagination = usePagination(DEFAULT_PAGE_SIZE)
  const runs = useSopEmployeeRuns(params?.id, range, runTab, runPagination.params, kind === 'sop')
  const firstRunPage = () => runPagination.onPaginationChange({ limit: runPagination.limit, offset: 0 })

  return {
    kind,
    setKind,
    range,
    changeRange: (patch: Partial<typeof range>) => {
      setRange((prev) => ({ ...prev, ...patch }))
      firstTaskPage()
      firstRunPage()
      firstChecklistPage()
    },
    sop: sop.data,
    project: project.data,
    /** The employee, whichever kind is loaded — the header shows it either way. */
    employee: (sop.data ?? project.data)?.summary,
    isLoading: active.isLoading,
    isFetching: active.isFetching,
    /** No id in the link, or the employee isn't in the active company (404). */
    notFound: !params?.id || isNotFoundError(active.error),
    error: active.error,
    checklists: {
      ...checklistPagination,
      rows: checklists.data?.items ?? [],
      total: checklists.data?.total ?? 0,
      isLoading: checklists.isLoading,
    },
    runs: {
      ...runPagination,
      tab: runTab,
      setTab: (next: SopRunTab) => {
        setRunTab(next)
        firstRunPage()
      },
      rows: runs.data?.items ?? [],
      total: runs.data?.total ?? 0,
      counts: runs.data?.counts,
      isLoading: runs.isLoading,
    },
    tasks: {
      ...taskPagination,
      tab: taskTab,
      setTab: (next: ProjectTaskTab) => {
        setTaskTab(next)
        firstTaskPage()
      },
      rows: tasks.data?.items ?? [],
      total: tasks.data?.total ?? 0,
      counts: tasks.data?.counts,
      isLoading: tasks.isLoading,
    },
    goBack: () => navigate({ to: '/office-task/analysis' }),
  }
}
