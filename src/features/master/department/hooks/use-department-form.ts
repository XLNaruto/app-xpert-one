import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
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

/** The two tabs of the create/edit screen. */
export type DepartmentFormTab = 'detail' | 'shift'

/**
 * Owns the department form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PATCH; create mode POSTs a
 * fresh record. The page consumes this and only lays out fields.
 *
 * The Shift tab writes a different resource (`/user/shifts/:id/set-default`,
 * scoped by department id) with its own save, so this hook only owns which tab
 * is showing — never the default shift itself.
 */
export function useDepartmentForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const [tab, setTab] = useState<DepartmentFormTab>('detail')

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

  /**
   * A default shift is pinned to a department id, so the tab only opens once the
   * department exists.
   */
  const canEditShift = isEdit

  /** Switch tabs, refusing the locked one with a reason rather than silently. */
  const selectTab = (next: DepartmentFormTab) => {
    if (next === 'shift' && !canEditShift) {
      toast.error('Save the department first, then set its shift.')
      return
    }
    setTab(next)
  }

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateDepartment.mutate(values, {
        onSuccess: () => {
          toast.success('Department updated')
          goToList()
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to update department'),
      })
      return
    }

    // The response carries the new department's id, so the screen turns into
    // that department's edit screen and moves straight on to its shift — which
    // now has a department to be pinned to.
    createDepartment.mutate(values, {
      onSuccess: (department) => {
        toast.success('Department created — now choose its shift')
        setTab('shift')
        navigate({
          to: '/master/department/create',
          search: { data: encryptId(department.id) },
        })
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to create department'),
    })
  })

  // Reading this record was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

  return {
    register,
    control,
    errors,
    tab,
    selectTab,
    /** The Shift tab is locked until the department exists to pin one to. */
    canEditShift,
    /** The department the Shift tab pins a default to — undefined while creating. */
    departmentId: id,
    /** The tenant whose shift master the tab's dropdown reads. */
    companyId: detail.data?.companyId,
    /** The default already stored, when the API sends one back. */
    defaultShiftId: detail.data?.defaultShiftId ?? null,
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
