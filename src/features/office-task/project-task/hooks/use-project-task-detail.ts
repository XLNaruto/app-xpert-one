import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { encryptParams } from '@/lib/crypto'
import { useProjectTask, useProjectWorks } from '../api/use-project-tasks'

/**
 * One project task's screen — the header card (the task), and the Employees
 * table (its shares, paged and searched server-side, ordered by name).
 */
export function useProjectTaskDetail(id?: number) {
  const navigate = useNavigate()
  const detail = useProjectTask(id)
  const pagination = usePagination(DEFAULT_PAGE_SIZE)
  const works = useProjectWorks(id, pagination.params)

  return {
    task: detail.data,
    isLoading: id !== undefined && detail.isLoading,
    notFound: id === undefined || detail.isError,
    error: detail.error,
    works: {
      rows: works.data?.items ?? [],
      total: works.data?.total ?? 0,
      isLoading: works.isLoading,
      error: works.error,
      limit: pagination.limit,
      offset: pagination.offset,
      onPaginationChange: pagination.onPaginationChange,
      search: pagination.search,
      setSearch: pagination.setSearch,
    },
    goToList: () => navigate({ to: '/office-task/project-task' }),
    openWork: (workId: number) =>
      navigate({ to: '/office-task/project-task/employee', search: { data: encryptParams({ id, workId }) } }),
  }
}
