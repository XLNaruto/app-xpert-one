import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { getApiErrorMessage } from '@/lib/api-error'
import { useDesignationSelect } from '@/features/master/designation'
import { useRoleSelect } from '@/features/administration/role'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { queryKeys } from '@/lib/query-keys'
import {
  personHint,
  todayIso,
  useOfficeTaskEmployeeSelect,
  type PickBy,
} from '@/features/office-task/common'
import { EMPTY_SOP_TASK, emptySopGroupForm, type SopGroupTab } from '../constants'
import { GROUP_TAB_FIELDS, sopGroupSchema, type SopGroupFormValues } from '../schemas'
import {
  useCreateSopGroup,
  useDeleteCustomTask,
  useDeleteSopGroupItem,
  useRemoveSopGroupAssignee,
  useSaveSopGroupAssignees,
  useSopGroup,
  useSopGroupAssignees,
  useUpdateSopGroup,
} from '../api/use-sop-groups'
import { fetchSopGroup, fetchSopGroupAssignees } from '../api/sop-group-api'
import {
  assigneesToFormValues,
  assigneesToPayload,
  groupToFormFields,
  periodFromAssignees,
} from '../lib/sop-group-mappers'
import type { SopGroupAssignee, SopGroupDetail, SopGroupRemoval } from '../types'

/**
 * Add / Edit SOP Group — both tabs in one form, each tab with its own API.
 *
 * Tab 1 is the group (name, who it applies to, checklist). Tab 2 picks the
 * employees that designation/role points at; each gets the whole checklist
 * (a copy) plus any custom tasks of their own, for one shared period.
 *
 * Each tab reads and writes through its OWN API:
 *
 * - Tab 1 loads `GET /sop-groups/:id` whenever it's opened, and its one button
 *   — Save & Next — POSTs / PATCHes the group, then moves on to tab 2.
 * - Tab 2 loads `GET /sop-groups/:id/assignees` whenever it's opened (so it
 *   needs a saved group), and its Save sends only the atomic assignees PUT.
 *
 * Deleting something that already exists on the server (a checklist line, an
 * assignee, a custom task) doesn't wait for Save: it is confirmed and sent
 * straight away.
 */
export function useSopGroupForm(id: number | undefined, initialTab: SopGroupTab) {
  const navigate = useNavigate()
  const access = useResourceAccess(PERMISSIONS.sopGroups)
  const queryClient = useQueryClient()
  /**
   * The group this screen writes to — the route's, or the one tab 1's first
   * Save & Next just created. Tab 2 needs it: its API hangs off the group.
   */
  const [savedId, setSavedId] = useState<number | undefined>(id)
  const groupId = savedId
  const isEdit = id !== undefined
  const canSave = isEdit ? access.canUpdate : access.canCreate

  // The opening load. Tab 2 also needs the group itself (who it targets, whether
  // that's locked), so an edit screen opened on tab 2 reads both.
  const detail = useSopGroup(id)
  const assigneeList = useSopGroupAssignees(initialTab === 'assign' ? id : undefined)
  const create = useCreateSopGroup()
  const update = useUpdateSopGroup()
  const saveAssignees = useSaveSopGroupAssignees()
  const deleteItem = useDeleteSopGroupItem()
  const removeAssignee = useRemoveSopGroupAssignee()
  const deleteCustom = useDeleteCustomTask()
  const [tab, setTab] = useState<SopGroupTab>(initialTab)
  const [removal, setRemoval] = useState<SopGroupRemoval | null>(null)
  const [saving, setSaving] = useState(false)
  /** A tab's own read, fired by clicking onto it. */
  const [tabLoading, setTabLoading] = useState(false)
  /** The last group the API answered with — lock flags and the target's saved label. */
  const [group, setGroup] = useState<SopGroupDetail | undefined>()

  const form = useForm<SopGroupFormValues>({
    resolver: zodResolver(sopGroupSchema),
    defaultValues: emptySopGroupForm(),
  })
  const { control, reset, setValue, getValues, trigger, handleSubmit } = form

  /** Tab 1's fields from the API — tab 2's are left alone. */
  const seedGroup = (g: SopGroupDetail) => {
    setGroup(g)
    reset({ ...getValues(), ...groupToFormFields(g) }, { keepDefaultValues: true })
  }

  /**
   * Tab 2's people from the API. Anyone picked on screen but not saved yet is
   * kept, so coming back to the tab doesn't drop them.
   */
  const seedAssignees = (list: SopGroupAssignee[]) => {
    const saved = assigneesToFormValues(list)
    const unsaved = getValues('assignees').filter(
      (a) => !a.locked && !saved.some((s) => s.employeeId === a.employeeId),
    )
    setValue('assignees', [...saved, ...unsaved])
    // Open on the period the group already runs for — unless the user has
    // already set one here.
    const period = periodFromAssignees(list, todayIso())
    const { dirtyFields } = form.formState
    if (period && !dirtyFields.effectiveFrom && !dirtyFields.effectiveTo) {
      setValue('effectiveFrom', period.effectiveFrom)
      setValue('effectiveTo', period.effectiveTo)
    }
  }

  // The opening read seeds once. After that a tab is only re-read when it's
  // clicked, so a background refetch never wipes what's being typed.
  const seededGroup = useRef(false)
  useEffect(() => {
    if (seededGroup.current || !detail.data) return
    seededGroup.current = true
    seedGroup(detail.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data])
  const seededAssignees = useRef(false)
  useEffect(() => {
    if (seededAssignees.current || !assigneeList.data) return
    seededAssignees.current = true
    seedAssignees(assigneeList.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeList.data])

  /** GET /sop-groups/:id/assignees — fresh, every time tab 2 opens. */
  const loadAssignees = async (targetGroupId: number) => {
    setTabLoading(true)
    try {
      const list = await queryClient.fetchQuery({
        queryKey: queryKeys.officeTask.sopGroupAssignees(targetGroupId),
        queryFn: () => fetchSopGroupAssignees(targetGroupId),
        staleTime: 0,
      })
      seedAssignees(list)
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error))
      return false
    } finally {
      setTabLoading(false)
    }
  }

  /**
   * Clicking Group Details re-reads the group (GET /sop-groups/:id). Unsaved
   * edits there were already saved by Save & Next, so the server copy is current.
   */
  const openGroupTab = async () => {
    setTab('group')
    if (groupId === undefined) return
    setTabLoading(true)
    try {
      const g = await queryClient.fetchQuery({
        queryKey: queryKeys.officeTask.sopGroup(groupId),
        queryFn: () => fetchSopGroup(groupId),
        staleTime: 0,
      })
      seedGroup(g)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setTabLoading(false)
    }
  }

  const items = useFieldArray({ control, name: 'items' })
  const assignees = useFieldArray({ control, name: 'assignees' })

  const pickBy = useWatch({ control, name: 'pickBy' })
  const designationId = useWatch({ control, name: 'designationId' })
  const roleId = useWatch({ control, name: 'roleId' })
  const watchedItems = useWatch({ control, name: 'items' })
  const watchedAssignees = useWatch({ control, name: 'assignees' })
  const effectiveFrom = useWatch({ control, name: 'effectiveFrom' })

  const lockedCount = watchedAssignees.filter((a) => a.locked).length
  /** Someone actively runs it — its target can't move under them (R2). */
  const targetLocked = (group?.targetLocked ?? false) || lockedCount > 0
  const targetId = pickBy === 'designation' ? designationId : roleId
  const picked = !!targetId

  const designationSelect = useDesignationSelect({
    selected: designationId,
    selectedLabel: group?.designationName || undefined,
    enabled: pickBy === 'designation',
  })
  const roleSelect = useRoleSelect({
    selected: roleId,
    selectedLabel: group?.roleName || undefined,
    enabled: pickBy === 'role',
  })
  const targetSelect = pickBy === 'designation' ? designationSelect : roleSelect
  const targetName = targetSelect.options.find((o) => o.value === targetId)?.label ?? ''

  /** A new target means new people: drop the ones picked for the old one. */
  const dropNewAssignees = () =>
    setValue(
      'assignees',
      getValues('assignees').filter((a) => a.locked),
    )

  const changePickBy = (value: PickBy) => {
    setValue('pickBy', value)
    setValue('designationId', '')
    setValue('roleId', '')
    dropNewAssignees()
  }
  const changeTarget = (field: 'designationId' | 'roleId', value: string) => {
    setValue(field, value, { shouldValidate: true })
    dropNewAssignees()
  }

  // ── Assign tab ──
  // Already-assigned people come back `already_assigned` — listed, but refused.
  const employeeSelect = useOfficeTaskEmployeeSelect({
    pickBy,
    targetId,
    sopGroupId: groupId,
    selected: watchedAssignees.filter((a) => !a.locked).map((a) => a.employeeId),
    toOption: (row): ComboboxOption => ({
      label: row.name,
      value: String(row.id),
      hint: row.alreadyAssigned ? 'Already assigned' : personHint(row),
      disabled: row.alreadyAssigned,
    }),
  })
  const lockedIds = new Set(watchedAssignees.filter((a) => a.locked).map((a) => a.employeeId))
  const employeeOptions = employeeSelect.options.map((o) =>
    lockedIds.has(o.value) ? { ...o, disabled: true, hint: 'Already assigned' } : o,
  )
  /** The picker holds only the NEW people — everyone already running it is fixed. */
  const pickedIds = watchedAssignees.filter((a) => !a.locked).map((a) => a.employeeId)
  const assignable = employeeOptions.filter((o) => !o.disabled)

  /** The multi-select's answer: add the newly ticked, drop the unticked. */
  const setEmployees = (ids: string[]) => {
    const current = getValues('assignees')
    const kept = current.filter((a) => a.locked || ids.includes(a.employeeId))
    const added = ids
      .filter((eid) => !current.some((a) => a.employeeId === eid))
      .map((eid) => {
        const option = employeeOptions.find((o) => o.value === eid)
        return {
          employeeId: eid,
          employeeName: option?.label ?? '',
          employeeCode: option?.hint ?? '',
          locked: false,
          assignmentId: '',
          canRemove: true,
          effectiveFrom: '',
          effectiveTo: '',
          heldChecklist: [],
          customTasks: [],
        }
      })
    setValue('assignees', [...kept, ...added], { shouldValidate: form.formState.isSubmitted })
  }
  const allPicked = assignable.length > 0 && assignable.every((o) => pickedIds.includes(o.value))
  const toggleAll = () =>
    setEmployees(
      allPicked
        ? pickedIds.filter((eid) => !assignable.some((o) => o.value === eid))
        : Array.from(new Set([...pickedIds, ...assignable.map((o) => o.value)])),
    )

  // ── Removals that go to the API straight away ──

  /** A saved checklist line is deleted on the server (R3 — allowed even after work started). */
  const removeItem = (index: number) => {
    const item = getValues(`items.${index}`)
    if (groupId !== undefined && item.id) {
      setRemoval({ kind: 'item', index, itemId: Number(item.id), label: item.task || 'this task' })
    } else {
      items.remove(index)
    }
  }

  /** Someone already running the group is removed on the server — only before they start (R6). */
  const removeEmployee = (index: number) => {
    const a = getValues(`assignees.${index}`)
    if (a.locked && a.assignmentId) {
      setRemoval({
        kind: 'assignee',
        index,
        assignmentId: Number(a.assignmentId),
        label: a.employeeName || 'this employee',
      })
    } else {
      assignees.remove(index)
    }
  }

  /**
   * A saved custom task is deleted on the server (R5). Answers `true` when it's
   * been handed to the confirm, so the caller leaves its own row alone.
   */
  const askRemoveCustomTask = (assigneeIndex: number, taskIndex: number): boolean => {
    const a = getValues(`assignees.${assigneeIndex}`)
    const t = a.customTasks[taskIndex]
    if (!a.assignmentId || !t?.id) return false
    setRemoval({
      kind: 'custom',
      assigneeIndex,
      taskIndex,
      assignmentId: Number(a.assignmentId),
      itemId: Number(t.id),
      label: t.task || 'this custom task',
    })
    return true
  }

  const confirmRemoval = () => {
    if (!removal || groupId === undefined) return
    const onError = (err: Error) => toast.error(err.message)
    const done = (message: string) => {
      toast.success(message)
      setRemoval(null)
    }
    if (removal.kind === 'item') {
      deleteItem.mutate(
        { groupId, itemId: removal.itemId },
        {
          onSuccess: () => {
            items.remove(removal.index)
            done('Checklist task removed')
          },
          onError,
        },
      )
    } else if (removal.kind === 'assignee') {
      removeAssignee.mutate(
        { groupId, assignmentId: removal.assignmentId },
        {
          onSuccess: () => {
            assignees.remove(removal.index)
            done(`${removal.label} removed from this group`)
          },
          onError,
        },
      )
    } else {
      deleteCustom.mutate(
        { assignmentId: removal.assignmentId, itemId: removal.itemId },
        {
          onSuccess: () => {
            const path = `assignees.${removal.assigneeIndex}.customTasks` as const
            setValue(
              path,
              getValues(path).filter((_, i) => i !== removal.taskIndex),
              { shouldDirty: true },
            )
            done('Custom task removed')
          },
          onError,
        },
      )
    }
  }

  const checklistPerDay = (watchedItems ?? []).reduce((s, i) => s + (Number(i?.frequency) || 0), 0)
  const newAssignees = watchedAssignees.filter((a) => !a.locked).length

  const goToList = () => navigate({ to: '/office-task/sop-group' })

  const onInvalid = (errors: FieldErrors<SopGroupFormValues>) => {
    const onGroupTab = GROUP_TAB_FIELDS.some((f) => errors[f])
    if (onGroupTab) setTab('group')
    else setTab('assign')
    toast.error('Please fix the highlighted fields')
  }

  /**
   * The saved group's item ids, onto the form's rows — so a second Save after a
   * partial failure updates those lines instead of creating them again.
   */
  const adoptItemIds = (saved: SopGroupDetail) => {
    const byTask = new Map(saved.items.map((i) => [i.task.trim().toLowerCase(), i.id]))
    getValues('items').forEach((row, index) => {
      const savedItemId = byTask.get(row.task.trim().toLowerCase())
      if (!row.id && savedItemId) setValue(`items.${index}.id`, String(savedItemId))
    })
  }

  /**
   * Tab 1's one button: validate the group, POST / PATCH it, then open tab 2 —
   * which reads its assignees fresh for the group just saved.
   */
  const saveGroupAndNext = async () => {
    if (!(await trigger(GROUP_TAB_FIELDS as unknown as (keyof SopGroupFormValues)[]))) {
      toast.error('Please fix the highlighted fields')
      return
    }
    const values = getValues()
    setSaving(true)
    let saved: SopGroupDetail
    try {
      saved =
        groupId === undefined
          ? await create.mutateAsync(values)
          : await update.mutateAsync({ id: groupId, values })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
      return
    } finally {
      setSaving(false)
    }
    toast.success(groupId === undefined ? 'SOP group created' : 'SOP group saved')
    setSavedId(saved.id)
    setGroup(saved)
    adoptItemIds(saved)
    setTab('assign')
    await loadAssignees(saved.id)
  }

  /** Tab 2's Save: only the assignees PUT — the group was saved by tab 1. */
  const saveAssigneesTab = handleSubmit(async (values) => {
    if (groupId === undefined) {
      setTab('group')
      toast.error('Save the group details first')
      return
    }
    const payload = assigneesToPayload(values)
    if (!payload.add.length && !payload.update.length) {
      goToList()
      return
    }
    setSaving(true)
    try {
      const { assigned } = await saveAssignees.mutateAsync({ id: groupId, values })
      toast.success(
        assigned
          ? `Assigned to ${assigned} employee${assigned === 1 ? '' : 's'}`
          : 'Assigned employees saved',
      )
      goToList()
    } catch (error) {
      // The PUT is atomic — nothing was saved, so Save can simply be retried.
      toast.error(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, onInvalid)

  /** Enter in any field does what that tab's button does. */
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSave) return
    if (tab === 'group') void saveGroupAndNext()
    else void saveAssigneesTab(e)
  }

  /** The tab strip: tab 1 re-reads the group; tab 2 goes through Save & Next. */
  const changeTab = (next: SopGroupTab) => {
    if (next === tab) return
    if (next === 'group') {
      void openGroupTab()
      return
    }
    if (canSave) {
      void saveGroupAndNext()
      return
    }
    // Look-only: no save, just the saved group's assignees.
    if (groupId === undefined) return
    setTab('assign')
    void loadAssignees(groupId)
  }

  return {
    form,
    tab,
    changeTab,
    openGroupTab,
    saveGroupAndNext,
    tabLoading,
    items,
    addItem: () => items.append({ ...EMPTY_SOP_TASK }),
    duplicateItem: (index: number) => {
      const source = getValues(`items.${index}`)
      items.insert(index + 1, { ...source, id: '', task: `${source.task} (copy)` })
    },
    removeItem,
    assignees,
    watchedAssignees,
    watchedItems: watchedItems ?? [],
    pickBy,
    picked,
    targetLocked,
    targetName,
    designationSelect,
    roleSelect,
    changePickBy,
    changeTarget,
    employeeSelect,
    employeeOptions,
    pickedIds,
    setEmployees,
    allPicked,
    assignableCount: assignable.length,
    toggleAll,
    removeEmployee,
    askRemoveCustomTask,
    removal,
    cancelRemoval: () => setRemoval(null),
    confirmRemoval,
    isRemoving: deleteItem.isPending || removeAssignee.isPending || deleteCustom.isPending,
    effectiveFrom,
    checklistPerDay,
    newAssignees,
    onSubmit,
    isEdit,
    /** Create needs `sop-groups:create`; everything on an existing group needs `:update`. */
    canSave,
    /** The immediate deletes on the edit screen. */
    canDelete: access.canDelete,
    isPending: saving,
    isLoading: isEdit && (detail.isLoading || assigneeList.isLoading),
    isError: isEdit && (detail.isError || assigneeList.isError),
    error: detail.error ?? assigneeList.error,
    goToList,
  }
}

export type SopGroupForm = ReturnType<typeof useSopGroupForm>
