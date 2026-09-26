import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  withoutScheduleDecision,
  withScheduleDay,
} from '../lib/shift-schedule-mappers'
import {
  generateShiftSchedule,
  resetScheduleDay,
  setScheduleDay,
} from './shift-schedule-api'
import type { ScheduleDayInput, ScheduleGenerateInput, ScheduleGrid } from '../types'

/**
 * The schedule outranks the week-off policy everywhere it has an entry, so a
 * change here is a change to what the employee screens resolve for a date and to
 * the attendance they show. (Processed salaries are not recalculated — the
 * register is read fresh, so it follows on its own.)
 */
function invalidateDependents(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.employee.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.salary.all })
}

/** Every cached grid page — each is patched in place rather than refetched. */
const GRID_PAGES = { queryKey: [...queryKeys.shiftSchedule.all, 'list'] }

/** POST /user/shift-schedules/generate — then re-read every grid. */
export function useGenerateShiftSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduleGenerateInput) => generateShiftSchedule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftSchedule.all })
      invalidateDependents(queryClient)
    },
  })
}

/**
 * PUT …/employees/:id/days/:date — the answer replaces that cell in every cached
 * grid page, so the grid doesn't refetch for one date.
 */
export function useSetScheduleDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduleDayInput) => setScheduleDay(input),
    onSuccess: (day, input) => {
      queryClient.setQueriesData<ScheduleGrid>(GRID_PAGES, (grid) =>
        grid ? withScheduleDay(grid, input.employeeId, day) : grid,
      )
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.shiftSchedule.all, 'employee', input.employeeId],
      })
      invalidateDependents(queryClient)
    },
  })
}

/** DELETE …/employees/:id/days/:date — clear the cell's decision locally. */
export function useResetScheduleDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, date }: { employeeId: number; date: string }) =>
      resetScheduleDay(employeeId, date),
    onSuccess: (_, { employeeId, date }) => {
      queryClient.setQueriesData<ScheduleGrid>(GRID_PAGES, (grid) =>
        grid ? withoutScheduleDecision(grid, employeeId, date) : grid,
      )
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.shiftSchedule.all, 'employee', employeeId],
      })
      invalidateDependents(queryClient)
    },
  })
}
