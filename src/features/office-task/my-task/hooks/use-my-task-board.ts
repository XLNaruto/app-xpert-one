import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS, useCan } from '@/features/permissions'
import {
  shiftIso,
  todayIso,
  useNow,
} from '@/features/office-task/common'
import {
  useMyProjectTasks,
  useMySopTasks,
  usePauseSopTask,
  useStartProjectWork,
  useStartSopTask,
} from '../api/use-my-tasks'
import { countByFilter, isOpen, matchesFilter } from '../lib/my-task-filters'
import type {
  CompleteTarget,
  MyProjectRow,
  MySopRow,
  MyTaskFilter,
  MyTaskTab,
} from '../types'

const secondsSince = (iso: string, now: number) =>
  Math.max(0, Math.floor((now - Date.parse(iso)) / 1000))

/**
 * My Tasks: the day being viewed, the two queues, the status chips, the live
 * clock and every action taken on a task. The board is always the signed-in
 * login's own: the work given to them as a panel user (role picks), plus the
 * work given to the employee their login is linked to, if any.
 */
export function useMyTaskBoard() {
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)
  const { can } = useCan()
  const canAct = can(`${PERMISSIONS.myTasks}:update`)
  const [date, setDate] = useState(todayIso())
  const [tab, setTab] = useState<MyTaskTab>('sop')
  const [filter, setFilter] = useState<MyTaskFilter>('all')

  const sop = useMySopTasks(date, companyId !== null)
  const project = useMyProjectTasks(date, companyId !== null)

  const start = useStartSopTask()
  const pause = usePauseSopTask()
  const startProject = useStartProjectWork()

  const [completing, setCompleting] = useState<CompleteTarget | null>(null)
  const [recording, setRecording] = useState<MyProjectRow | null>(null)
  const [viewing, setViewing] = useState<CompleteTarget | null>(null)

  const sopRows = useMemo(() => sop.data ?? [], [sop.data])
  const projectRows = useMemo(() => project.data ?? [], [project.data])

  // One clock at a time, across both queues.
  const anyRunning = sopRows.some((r) => r.runningSince) || projectRows.some((r) => r.runningSince)
  const now = useNow(anyRunning)

  /**
   * Seconds from stretches already over. The two queues count differently: an
   * SOP run's `workedSeconds` INCLUDES its live stretch up to when it was read,
   * a project share's counts finished sessions only.
   */
  const bankedSeconds = (row: MySopRow | MyProjectRow) => {
    if (!row.runningSince || !('slot' in row)) return row.workedSeconds
    return Math.max(0, row.workedSeconds - secondsSince(row.runningSince, sop.dataUpdatedAt))
  }
  /** Banked plus the live stretch, ticking while the clock runs. */
  const workedSeconds = (row: MySopRow | MyProjectRow) =>
    bankedSeconds(row) + (row.runningSince ? secondsSince(row.runningSince, now) : 0)

  const counts = countByFilter(
    (tab === 'sop' ? sopRows : projectRows).map((r) => r.status),
  )

  const run = (promise: (opts: { onError: (e: Error) => void; onSuccess: () => void }) => void, ok: string) =>
    promise({ onError: (e) => toast.error(e.message), onSuccess: () => toast.success(ok) })

  const isToday = date === todayIso()
  const active = tab === 'sop' ? sop : project

  return {
    companyId,
    canAct,
    isError: active.isError,
    error: active.error,
    date,
    isToday,
    isFuture: date > todayIso(),
    setDate: (next: string) => setDate(next || todayIso()),
    prevDay: () => setDate((d) => shiftIso(d, -1)),
    nextDay: () => setDate((d) => shiftIso(d, 1)),
    goToday: () => setDate(todayIso()),
    refresh: () => {
      void sop.refetch()
      void project.refetch()
    },
    tab,
    // Both queues stay mounted, so a tab switch re-reads the one being opened.
    setTab: (next: MyTaskTab) => {
      setTab(next)
      setFilter('all')
      void (next === 'sop' ? sop : project).refetch()
    },
    filter,
    setFilter,
    counts,
    openSop: sopRows.filter((r) => isOpen(r.status)).length,
    openProject: projectRows.filter((r) => isOpen(r.status)).length,
    sopRows: sopRows.filter((r) => matchesFilter(r.status, filter)),
    projectRows: projectRows.filter((r) => matchesFilter(r.status, filter)),
    isLoading: active.isLoading,
    bankedSeconds,
    workedSeconds,
    /** One clock at a time — while a run is going, every other Start/Resume waits. */
    anyRunning,
    busyId: start.isPending ? start.variables : pause.isPending ? pause.variables : undefined,
    busyProjectId: startProject.isPending ? startProject.variables : undefined,
    startSop: (row: MySopRow) =>
      run((o) => start.mutate(row.id, o), row.workedSeconds > 0 ? 'Resumed' : 'Started'),
    pauseSop: (row: MySopRow) => run((o) => pause.mutate(row.id, o), 'Paused'),
    startProject: (row: MyProjectRow) =>
      run((o) => startProject.mutate(row.id, o), row.status === 'pending' ? 'Started' : 'Resumed'),
    completing,
    openComplete: setCompleting,
    closeComplete: () => setCompleting(null),
    recording,
    openProgress: setRecording,
    closeProgress: () => setRecording(null),
    viewing,
    openView: setViewing,
    closeView: () => setViewing(null),
  }
}

export type MyTaskBoard = ReturnType<typeof useMyTaskBoard>
