import { useState } from 'react'
import { usePagination } from '@/hooks/use-pagination'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useDepartmentSelect } from '@/features/master/department'
import { useEmployeeSelect } from '@/features/hr/employee'
import { useAdminUserSelect } from '@/features/administration/admin-user'
import { PERMISSIONS, useCan } from '@/features/permissions'
import { APPROVAL_DEFAULT_SORT, defaultApprovalFilters } from '../constants'
import { useProjectApprovals, useSopApprovals } from '../api/use-approvals'
import type {
  ApprovalFilters,
  ApprovalKind,
  ProjectApprovalRow,
  SopApprovalRow,
  VerdictRequest,
} from '../types'

/**
 * Only work waiting on an answer can take one — the `awaiting` rule, both
 * columns: a rejected row handed in again has its verdict cleared.
 */
export const isAnswerable = (row: { status: string; verdict: string | null }) =>
  row.status === 'pending_approval' && !row.verdict

/**
 * Task Approval: which kind (SOP / project), the status tab, filters, the page,
 * row selection for bulk answers, and the verdict dialog.
 */
export function useApprovalList() {
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)
  const { can } = useCan()
  /** Approve / Reject — one account-wide grant, not a chain. */
  const canDecide = can(`${PERMISSIONS.taskApprovals}:update`)
  const [kind, setKind] = useState<ApprovalKind>('sop')
  const [filters, setFilters] = useState<ApprovalFilters>(defaultApprovalFilters)
  const pagination = usePagination(DEFAULT_PAGE_SIZE, APPROVAL_DEFAULT_SORT)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [request, setRequest] = useState<VerdictRequest | null>(null)

  const sop = useSopApprovals(filters, pagination.params, kind === 'sop')
  const project = useProjectApprovals(filters, pagination.params, kind === 'project')
  const active = kind === 'sop' ? sop : project

  const departmentSelect = useDepartmentSelect({ selected: filters.departmentId })
  const employeeSelect = useEmployeeSelect({ selected: filters.employeeId })
  const userSelect = useAdminUserSelect({ selected: filters.userId })

  const firstPage = () => {
    pagination.onPaginationChange({ limit: pagination.limit, offset: 0 })
    setSelected(new Set())
  }

  const changeFilter = (patch: Partial<ApprovalFilters>) => {
    setFilters((prev) => {
      return { ...prev, ...patch }
    })
    firstPage()
  }

  const sopRows = sop.data?.items ?? []
  const projectRows = project.data?.items ?? []
  const rows: (SopApprovalRow | ProjectApprovalRow)[] = kind === 'sop' ? sopRows : projectRows
  const answerable = canDecide ? rows.filter(isAnswerable) : []

  const toggle = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const allChecked = answerable.length > 0 && answerable.every((r) => selected.has(r.id))

  return {
    ...pagination,
    onPaginationChange: (next: { limit: number; offset: number }) => {
      pagination.onPaginationChange(next)
      setSelected(new Set())
    },
    kind,
    // The other kind's query is only paused, not gone — re-read it on the switch.
    setKind: (next: ApprovalKind) => {
      setKind(next)
      firstPage()
      void (next === 'sop' ? sop : project).refetch()
    },
    filters,
    changeFilter,
    resetFilters: () => {
      pagination.setSearch('')
      setFilters(defaultApprovalFilters())
      firstPage()
    },
    companyId,
    canDecide,
    departmentSelect,
    employeeSelect,
    userSelect,
    sopRows,
    projectRows,
    total: active.data?.total ?? 0,
    counts: active.data?.counts ?? { awaiting: 0, approved: 0, rejected: 0, all: 0 },
    isLoading: active.isLoading,
    isError: active.isError,
    error: active.error,
    selected,
    toggle,
    allChecked,
    someChecked: !allChecked && answerable.some((r) => selected.has(r.id)),
    toggleAll: (checked: boolean) =>
      setSelected(checked ? new Set(answerable.map((r) => r.id)) : new Set()),
    clearSelection: () => setSelected(new Set()),
    selectedCount: answerable.filter((r) => selected.has(r.id)).length,
    request,
    /** Answer one row, or every selected row when `row` is left out. */
    ask: (verdict: VerdictRequest['verdict'], row?: SopApprovalRow | ProjectApprovalRow) =>
      setRequest({
        verdict,
        kind,
        rows: row ? [row] : answerable.filter((r) => selected.has(r.id)),
      }),
    closeRequest: () => setRequest(null),
    onAnswered: () => {
      setRequest(null)
      setSelected(new Set())
    },
  }
}
