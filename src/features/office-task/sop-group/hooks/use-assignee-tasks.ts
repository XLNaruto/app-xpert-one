import { useState } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { EMPTY_SOP_TASK } from '../constants'
import type { SopGroupFormValues } from '../schemas'

/** The custom-task cells that read as text and turn into an input on double-click. */
export type EditableField = 'task' | 'description' | 'frequency'

/**
 * One employee's custom tasks on the Assign tab: the inline "+ Add custom task"
 * input (type a name, Enter adds it and stays open), and Zoho-style cell
 * editing — a cell shows text until double-clicked; Enter / blur keeps the
 * edit, Esc puts the old value back.
 */
export function useAssigneeTasks(form: UseFormReturn<SopGroupFormValues>, index: number) {
  const custom = useFieldArray({ control: form.control, name: `assignees.${index}.customTasks` })
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<{ row: number; field: EditableField; before: string } | null>(null)

  const commit = () => {
    const name = draft.trim()
    if (!name) return
    custom.append({ ...EMPTY_SOP_TASK, task: name })
    setDraft('')
  }

  const path = (row: number, field: EditableField) =>
    `assignees.${index}.customTasks.${row}.${field}` as const

  const startEdit = (row: number, field: EditableField) =>
    setEditing({ row, field, before: form.getValues(path(row, field)) })

  /**
   * Keep the edit and re-check the cell, so a bad value shows its error at once.
   * Ignored unless it's the cell being edited — a late blur from the input Tab
   * just left must not close the one Tab opened.
   */
  const finishEdit = (row: number, field: EditableField) => {
    if (!editing || editing.row !== row || editing.field !== field) return
    void form.trigger(path(row, field))
    setEditing(null)
  }

  /** Excel-style: Tab keeps the edit and opens the next cell in the row; Shift+Tab the previous. */
  const ORDER: EditableField[] = ['task', 'description', 'frequency']
  const tabEdit = (back: boolean) => {
    if (!editing) return
    const { row, field } = editing
    void form.trigger(path(row, field))
    const next = ORDER[ORDER.indexOf(field) + (back ? -1 : 1)]
    if (next) startEdit(row, next)
    else setEditing(null)
  }

  const cancelEdit = () => {
    if (!editing) return
    form.setValue(path(editing.row, editing.field), editing.before, { shouldValidate: true })
    setEditing(null)
  }

  return {
    custom,
    draft,
    setDraft,
    adding,
    startAdding: () => setAdding(true),
    stopAdding: () => {
      setAdding(false)
      setDraft('')
    },
    commit,
    isEditing: (row: number, field: EditableField) => editing?.row === row && editing.field === field,
    startEdit,
    finishEdit,
    cancelEdit,
    tabEdit,
    removeTask: (row: number) => {
      setEditing(null)
      custom.remove(row)
    },
  }
}
