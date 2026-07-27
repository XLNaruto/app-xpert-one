import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { departmentSchema, type DepartmentFormValues } from '../schemas'
import { EMPTY_DEPARTMENT_FORM } from '../constants'
import { useDepartment } from '../api/use-department'
import {
  useCreateDepartment,
  useUpdateDepartment,
} from '../api/use-department-mutations'
import { departmentToFormValues } from '../lib/department-mappers'

/**
 * Owns the department form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PUT; create mode POSTs a fresh
 * record. The page consumes this and only lays out fields.
 */
export function useDepartmentForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useDepartment(id ?? Number.NaN)
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(departmentToFormValues(detail.data))
  }, [detail.data, reset])

  const goToList = () => navigate({ to: '/department' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateDepartment : createDepartment
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Department updated' : 'Department created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} department`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateDepartment.isPending : createDepartment.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
