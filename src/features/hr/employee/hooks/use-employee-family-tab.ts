import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import {
  employeeFamilyListSchema,
  FAMILY_ROW_KEYS,
  type EmployeeFamilyFormValues,
  type EmployeeFamilyListFormValues,
} from '../schemas'
import { EMPTY_EMPLOYEE_FAMILY_FORM } from '../constants'
import { useEmployeeFamily } from '../api/use-employee-steps'
import {
  useCreateEmployeeFamilyMember,
  useDeleteEmployeeFamilyMember,
  useUpdateEmployeeFamilyMember,
} from '../api/use-employee-step-mutations'
import { familyToFormValues } from '../lib/employee-step-mappers'
import { isBlankRow, saveRows } from '../lib/save-rows'
import { useRowSeed } from './use-row-seed'

/**
 * Step 4 — family members, as one card list with one Save.
 *
 * The API writes a row at a time, so this hook is where the two shapes meet: the
 * form holds the whole list, and saving diffs it into the POSTs, PATCHes and
 * DELETEs that make the server match (`lib/save-rows.ts`). Removing a card queues
 * its id rather than deleting immediately — nothing is destroyed until Save, so
 * leaving the step without saving destroys nothing.
 *
 * The list always keeps one card on screen, which means an untouched step submits
 * one blank row. Blank rows are skipped by both the validation and the save — but a
 * step where *every* row is blank is rejected rather than skipped, so Save & Next
 * can't walk past a step that has recorded nobody.
 */
export function useEmployeeFamilyTab({
  employeeId,
  onSaved,
}: {
  employeeId: number
  onSaved: () => void
}) {
  const list = useEmployeeFamily(employeeId)
  const createMember = useCreateEmployeeFamilyMember(employeeId)
  const updateMember = useUpdateEmployeeFamilyMember(employeeId)
  const deleteMember = useDeleteEmployeeFamilyMember(employeeId)

  const form = useForm<EmployeeFamilyListFormValues>({
    resolver: zodResolver(employeeFamilyListSchema),
    defaultValues: { rows: [EMPTY_EMPLOYEE_FAMILY_FORM] },
  })
  const { control, handleSubmit, reset } = form
  const rows = useFieldArray({ control, name: 'rows' })

  /** Server ids of cards the user removed — deleted on Save, not on click. */
  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Seed from the server, and again after each save — but never mid-save.
  useRowSeed(list.data, isSaving, (members) => {
    reset({
      rows:
        members.length > 0
          ? members.map((member) => ({ id: member.id, ...familyToFormValues(member) }))
          : [EMPTY_EMPLOYEE_FAMILY_FORM],
    })
    setRemovedIds([])
  })

  const addRow = () => rows.append({ ...EMPTY_EMPLOYEE_FAMILY_FORM })

  /**
   * Drop a card. A saved row's id is queued for deletion; an unsaved one just
   * disappears. The last card is kept so the fields stay on screen.
   */
  const removeRow = (index: number) => {
    const row = form.getValues(`rows.${index}`)
    if (row?.id !== undefined) setRemovedIds((previous) => [...previous, row.id as number])

    if (rows.fields.length === 1) {
      rows.update(0, { ...EMPTY_EMPLOYEE_FAMILY_FORM })
      return
    }
    rows.remove(index)
  }

  const submit = handleSubmit(async (values) => {
    const savable = values.rows.filter(
      (row) => !isBlankRow(row as Record<string, unknown>, FAMILY_ROW_KEYS),
    )

    setIsSaving(true)
    try {
      await saveRows<EmployeeFamilyFormValues>(savable, removedIds, {
        create: (row) => createMember.mutateAsync(row),
        update: (id, row) => updateMember.mutateAsync({ memberId: id, values: row }),
        remove: (id) => deleteMember.mutateAsync(id),
      })
      setRemovedIds([])
      toast.success('Family detail saved')
      onSaved()
    } catch (error) {
      // The calls that already went through stay done; a second Save resumes.
      toast.error(getApiErrorMessage(error, "Couldn't save the family detail."))
    } finally {
      setIsSaving(false)
    }
  })

  const isForbidden = isForbiddenError(list.error)

  return {
    form,
    fields: rows.fields,
    addRow,
    removeRow,
    isLoading: list.isLoading,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,
    onSubmit: submit,
    isSaving,
  }
}
