import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { isStaleRowError, type Priority } from '@/features/office-task/common'
import { PROJECT_TASK_DEFAULT_SORT } from '../constants'
import {
  useDeleteProjectTask,
  useProjectTasks,
  useSetProjectTaskPriority,
} from '../api/use-project-tasks'
import type { ProjectTaskDrawer, ProjectTaskFilters, ProjectTaskRow } from '../types'

const NO_FILTERS: ProjectTaskFilters = { status: 'all', priority: 'all' }

/**
 * The Project Tasks screen — the list, the add/edit drawer, inline priority,
 * row selection for the bulk bar, and delete. View opens the task's own page.
 */
export function useProjectTaskList() {
  const navigate = useNavigate()
  const pagination = usePagination(DEFAULT_PAGE_SIZE, PROJECT_TASK_DEFAULT_SORT)
  const [filters, setFilters] = useState<ProjectTaskFilters>(NO_FILTERS)
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)
  const access = useResourceAccess(PERMISSIONS.projectTasks)
  const { data, isLoading, isError, error } = useProjectTasks(filters, pagination.params)
  const setPriority = useSetProjectTaskPriority()
  const remove = useDeleteProjectTask()

  const [drawer, setDrawer] = useState<ProjectTaskDrawer | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<ProjectTaskRow | null>(null)

  const rows = data?.items ?? []
  /** A completed task is read-only (R13), so the bulk bar never takes one. */
  const selectable = rows.filter((r) => !r.isCompleted)

  const changeFilter = (patch: Partial<ProjectTaskFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    pagination.onPaginationChange({ limit: pagination.limit, offset: 0 })
    setSelected(new Set())
  }

  const toggle = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const allChecked = selectable.length > 0 && selectable.every((r) => selected.has(r.id))

  const confirmDelete = () => {
    if (!pendingDelete) return
    remove.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Project task deleted')
        setSelected((prev) => {
          const next = new Set(prev)
          next.delete(pendingDelete.id)
          return next
        })
        setPendingDelete(null)
      },
      onError: (err) => {
        toast.error(err.message)
        // Somebody started it meanwhile — its Delete is about to disappear.
        if (isStaleRowError(err)) setPendingDelete(null)
      },
    })
  }

  return {
    ...pagination,
    onPaginationChange: (next: { limit: number; offset: number }) => {
      pagination.onPaginationChange(next)
      setSelected(new Set())
    },
    rows,
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
    companyId,
    access,
    filters,
    changeFilter,
    resetFilters: () => {
      pagination.setSearch('')
      changeFilter(NO_FILTERS)
    },
    drawer,
    openCreate: () => setDrawer({ mode: 'create' }),
    openEdit: (id: number) => setDrawer({ mode: 'edit', id }),
    openView: (id: number) =>
      navigate({ to: '/office-task/project-task/detail', search: { data: encryptId(id) } }),
    closeDrawer: () => setDrawer(null),
    changePriority: (row: ProjectTaskRow, priority: Priority) => {
      if (priority === row.priority || row.isCompleted) return
      setPriority.mutate(
        { id: row.id, priority },
        { onError: (err) => toast.error(err.message) },
      )
    },
    selected,
    toggle,
    allChecked,
    someChecked: !allChecked && selectable.some((r) => selected.has(r.id)),
    toggleAll: (checked: boolean) =>
      setSelected(checked ? new Set(selectable.map((r) => r.id)) : new Set()),
    clearSelection: () => setSelected(new Set()),
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: remove.isPending,
  }
}
