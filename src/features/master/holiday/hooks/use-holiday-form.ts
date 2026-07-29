import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { holidaySchema, type HolidayFormValues } from '../schemas'
import { EMPTY_HOLIDAY_FORM } from '../constants'
import { useHoliday } from '../api/use-holiday'
import { useCreateHoliday, useUpdateHoliday } from '../api/use-holiday-mutations'
import { holidayToFormValues } from '../lib/holiday-mappers'

/**
 * Owns the holiday form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PUT; create mode POSTs a fresh
 * record. The page consumes this and only lays out fields.
 */
export function useHolidayForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useHoliday(id ?? Number.NaN)
  const createHoliday = useCreateHoliday()
  const updateHoliday = useUpdateHoliday(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: EMPTY_HOLIDAY_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(holidayToFormValues(detail.data))
  }, [detail.data, reset])

  const goToList = () => navigate({ to: '/master/holiday' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateHoliday : createHoliday
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Holiday updated' : 'Holiday created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} holiday`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateHoliday.isPending : createHoliday.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
