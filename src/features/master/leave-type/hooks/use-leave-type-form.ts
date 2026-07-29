import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { leaveTypeSchema, type LeaveTypeFormValues } from '../schemas'
import { EMPTY_LEAVE_TYPE_FORM } from '../constants'
import { useLeaveType } from '../api/use-leave-type'
import {
  useCreateLeaveType,
  useUpdateLeaveType,
} from '../api/use-leave-type-mutations'
import { leaveTypeToFormValues } from '../lib/leave-type-mappers'

/**
 * Owns the leave type form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PUT; create mode POSTs a fresh
 * record. The page consumes this and only lays out fields.
 */
export function useLeaveTypeForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useLeaveType(id ?? Number.NaN)
  const createLeaveType = useCreateLeaveType()
  const updateLeaveType = useUpdateLeaveType(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaveTypeFormValues>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: EMPTY_LEAVE_TYPE_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(leaveTypeToFormValues(detail.data))
  }, [detail.data, reset])

  const goToList = () => navigate({ to: '/master/leave-type' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateLeaveType : createLeaveType
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Leave type updated' : 'Leave type created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} leave type`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateLeaveType.isPending : createLeaveType.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
