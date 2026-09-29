import { useEffect, useMemo, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDesignationSelect } from '@/features/master/designation'
import { useRoleSelect } from '@/features/administration/role'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useOfficeTaskEmployeeSelect, type PickBy } from '@/features/office-task/common'
import { emptyProjectTaskForm } from '../constants'
import { projectTaskSchema, type ProjectTaskFormValues } from '../schemas'
import { useCreateProjectTask, useProjectTask, useUpdateProjectTask } from '../api/use-project-tasks'
import { projectTaskToFormValues } from '../lib/project-task-mappers'

/**
 * The API field each drawer input writes — what `locked_fields` names (the
 * people are `employee_ids` or `user_ids`, per the target; `people` asks for
 * either). Once
 * anyone has started, the R10 set comes back locked; once the task is
 * completed, all of it does.
 */
export type ProjectTaskField =
  | 'task'
  | 'description'
  | 'priority'
  | 'pick_by'
  | 'designation_id'
  | 'role_id'
  | 'people'
  | 'updates_per_day'
  | 'start_date'
  | 'deadline'
  | 'photo_required'
  | 'needs_verification'

/**
 * The add / edit drawer's form. Pick by → Designation or Role → Assign To:
 * each pick narrows the people list, which comes from the shared picker.
 */
export function useProjectTaskForm(id: number | undefined, onSaved: () => void) {
  const isEdit = id !== undefined
  const access = useResourceAccess(PERMISSIONS.projectTasks)
  const detail = useProjectTask(id)
  const create = useCreateProjectTask()
  const update = useUpdateProjectTask()
  const task = detail.data

  const form = useForm<ProjectTaskFormValues>({
    resolver: zodResolver(projectTaskSchema),
    defaultValues: emptyProjectTaskForm(),
  })
  const { control, reset, setValue, getValues, handleSubmit } = form

  // Seed once — a background refetch must not overwrite what's being typed.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !task) return
    seeded.current = true
    reset(projectTaskToFormValues(task))
  }, [task, reset])

  const pickBy = useWatch({ control, name: 'pickBy' })
  const designationId = useWatch({ control, name: 'designationId' })
  const roleId = useWatch({ control, name: 'roleId' })
  const employeeIds = useWatch({ control, name: 'employeeIds' })
  const startDate = useWatch({ control, name: 'startDate' })
  const updatesPerDay = Number(useWatch({ control, name: 'updatesPerDay' })) || 0

  const lockedFields = useMemo(() => new Set(task?.lockedFields ?? []), [task])
  const isCompleted = task?.isCompleted ?? false
  /** Disabled in the drawer — the server refuses a changed locked field anyway. */
  const isLocked = (field: ProjectTaskField) =>
    isCompleted ||
    (field === 'people'
      ? lockedFields.has('employee_ids') || lockedFields.has('user_ids')
      : lockedFields.has(field))

  /** People who have pressed Start stay on the task (R12). */
  const startedIds = useMemo(
    () => new Set((task?.assignees ?? []).filter((a) => a.hasStarted).map((a) => String(a.personId))),
    [task],
  )

  const designationSelect = useDesignationSelect({
    selected: designationId,
    selectedLabel: task?.designationName || undefined,
    enabled: pickBy === 'designation',
  })
  const roleSelect = useRoleSelect({
    selected: roleId,
    selectedLabel: task?.roleName || undefined,
    enabled: pickBy === 'role',
  })

  /** A new "Pick by" empties the designation/role it no longer asks for, and the people. */
  const changePickBy = (value: PickBy) => {
    setValue('pickBy', value)
    setValue('designationId', '')
    setValue('roleId', '')
    setValue('employeeIds', [])
  }
  /** A new target means new people — whoever was picked for the old one goes. */
  const changeTarget = (field: 'designationId' | 'roleId', value: string) => {
    setValue(field, value, { shouldValidate: form.formState.isSubmitted })
    setValue('employeeIds', getValues('employeeIds').filter((e) => startedIds.has(e)))
  }

  const targetId = pickBy === 'designation' ? designationId : roleId
  const picked = !!targetId
  const employeeSelect = useOfficeTaskEmployeeSelect({ pickBy, targetId, selected: employeeIds })

  /**
   * The saved people first — named from the task itself, and the ones who have
   * started are listed but can't be unticked — then the rest of the pick.
   */
  // Only while the saved target is still the one picked — a switch of kind
  // (designation ↔ role) means a whole new set of people.
  const sameTarget = !!task && task.pickBy === pickBy
  const savedOptions: ComboboxOption[] = (sameTarget ? task.assignees : []).map((a) => ({
    label: a.name,
    value: String(a.personId),
    ...(a.hasStarted ? { disabled: true, hint: 'Started' } : {}),
  }))
  const savedIds = new Set(savedOptions.map((o) => o.value))
  const employeeOptions = [
    ...savedOptions,
    ...employeeSelect.options.filter((o) => !savedIds.has(o.value)),
  ]
  const selectable = picked ? employeeOptions.filter((o) => !o.disabled) : []

  const allSelected = selectable.length > 0 && selectable.every((o) => employeeIds.includes(o.value))
  const toggleSelectAll = () =>
    setValue(
      'employeeIds',
      allSelected
        ? employeeIds.filter((v) => startedIds.has(v) || !selectable.some((o) => o.value === v))
        : Array.from(new Set([...employeeIds, ...selectable.map((o) => o.value)])),
      { shouldValidate: true },
    )

  /** The multi-select's answer — a started person can't be dropped, whatever was clicked. */
  const setEmployees = (ids: string[]) =>
    setValue('employeeIds', Array.from(new Set([...ids, ...startedIds])), {
      shouldValidate: form.formState.isSubmitted,
    })

  const onSubmit = handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        toast.success(isEdit ? 'Project task updated' : 'Project task created')
        onSaved()
      },
      onError: (err: Error) => toast.error(err.message),
    }
    if (id === undefined) create.mutate(values, options)
    else update.mutate({ id, values }, options)
  })

  return {
    form,
    pickBy,
    picked,
    startDate,
    updatesPerDay,
    changePickBy,
    changeTarget,
    designationSelect,
    roleSelect,
    employeeSelect,
    employeeOptions,
    setEmployees,
    matchingCount: selectable.length,
    allSelected,
    toggleSelectAll,
    isLocked,
    isCompleted,
    hasStartedWork: task?.hasStartedWork ?? false,
    onSubmit,
    isEdit,
    canSave: !isCompleted && (isEdit ? access.canUpdate : access.canCreate),
    isPending: create.isPending || update.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && detail.isError,
    error: detail.error,
  }
}
