import { useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useEmployeeSelect } from '@/features/hr/employee'
import { todayIso } from '../lib/shift-schedule-mappers'
import { useGenerateShiftSchedule } from '../api/use-shift-schedule-mutations'
import type { ScheduleFilters, ScheduleGenerateResult } from '../types'

/**
 * Generate — fill the window on screen from each employee's week-off policy.
 *
 * It runs on the grid's own filters (branch, department, window), so what it
 * fills is what the manager is looking at. The API refuses a `from` in the past,
 * so the window is started no earlier than today; a window wholly in the past
 * can't be generated at all, only edited a date at a time.
 */
export function useShiftScheduleGenerate(filters: ScheduleFilters) {
  const generate = useGenerateShiftSchedule()

  const [isOpen, setIsOpen] = useState(false)
  const [employeeIds, setEmployeeIds] = useState<number[]>([])
  /** The last run's answer — the skipped employees need more than a toast. */
  const [result, setResult] = useState<ScheduleGenerateResult | null>(null)

  const employees = useEmployeeSelect({
    selected: employeeIds.map(String),
    enabled: isOpen,
  })

  const today = todayIso()
  const from = filters.from < today ? today : filters.from
  const to = filters.to
  const canRun = to >= from

  const open = () => {
    setEmployeeIds([])
    setIsOpen(true)
  }

  const close = () => {
    if (!generate.isPending) setIsOpen(false)
  }

  const run = () => {
    if (!canRun) return
    generate.mutate(
      { ...filters, from, to, employeeIds },
      {
        onSuccess: (answer) => {
          toast.success(
            `Schedule generated for ${answer.employees} employees (${answer.written} dates).`,
          )
          if (answer.keptManual > 0) {
            toast.info(`${answer.keptManual} manually set dates were kept.`)
          }
          setResult(
            answer.skippedNoShift.length || answer.skippedFlexible.length ? answer : null,
          )
          setIsOpen(false)
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't generate the schedule.")),
      },
    )
  }

  return {
    isOpen,
    open,
    close,
    /** The window that will actually be sent — `from` pulled up to today. */
    from,
    to,
    canRun,
    /** Whether the window on screen starts in the past (and was trimmed). */
    isTrimmed: filters.from < today,
    employeeIds,
    setEmployeeIds,
    employees,
    run,
    isRunning: generate.isPending,
    result,
    dismissResult: () => setResult(null),
  }
}

export type ShiftScheduleGenerateState = ReturnType<typeof useShiftScheduleGenerate>
