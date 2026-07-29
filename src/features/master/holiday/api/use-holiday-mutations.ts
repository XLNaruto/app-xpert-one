import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { HolidayFormValues } from '../schemas'
import { createHoliday, deleteHoliday, updateHoliday } from './holiday-api'

/** POST /holidays — create a holiday, then refresh the list. */
export function useCreateHoliday() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: HolidayFormValues) => createHoliday(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holiday.all })
    },
  })
}

/** PUT /holidays/:id — update a holiday, then refresh the list + detail. */
export function useUpdateHoliday(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: HolidayFormValues) => updateHoliday(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holiday.all })
    },
  })
}

/** DELETE /holidays/:id — remove a holiday, then refresh the list. */
export function useDeleteHoliday() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holiday.all })
    },
  })
}
