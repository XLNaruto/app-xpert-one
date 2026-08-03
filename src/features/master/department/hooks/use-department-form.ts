import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { branchOptions, useBranches } from '@/features/master/branch'
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
 * loads the record, seeds the form and saves via PATCH; create mode POSTs a
 * fresh record. The page consumes this and only lays out fields.
 */
export function useDepartmentForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useDepartment(id ?? Number.NaN)
  // The Branch dropdown is driven by the branch master.
  const branches = useBranches()
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

  const branchList = useMemo(
    () => branchOptions(branches.data?.items ?? []),
    [branches.data],
  )

  const goToList = () => navigate({ to: '/master/department' })

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

  // Reading this record was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

  return {
    register,
    control,
    errors,
    branchOptions: branchList,
    isBranchesLoading: branches.isLoading,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateDepartment.isPending : createDepartment.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    goToList,
  }
}
