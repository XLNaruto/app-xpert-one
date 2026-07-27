import { useState } from 'react'
import { toast } from 'sonner'
import { useStates } from '../api/use-states'
import { useDeleteState } from '../api/use-state-mutations'
import type { StateRecord } from '../types'

/**
 * Orchestrates the state master list screen: the list query, the add/edit
 * dialog and the delete flow. The page consumes this and only renders — no
 * data or handler logic lives in the component.
 */
export function useStateList() {
  const { data, isLoading, isError, error } = useStates()
  const deleteState = useDeleteState()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StateRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<StateRecord | null>(null)

  /** Open the dialog blank (create). */
  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  /** Open the dialog seeded with a record (edit). */
  const openEdit = (record: StateRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteState.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('State deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete state'),
    })
  }

  return {
    rows: data ?? [],
    isLoading,
    isError,
    error,
    formOpen,
    setFormOpen,
    editing,
    openCreate,
    openEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteState.isPending,
  }
}
