import { useState } from 'react'
import { toast } from 'sonner'
import { useDeleteEmployeeFace } from '../api/use-employee-mutations'
import type { Employee } from '../types'

/**
 * The list's face actions: the "View Faces" dialog and the clear behind it.
 *
 * Two subjects, not one — the row whose faces are on screen and the row whose
 * faces are about to be cleared — because "Delete Faces" is reachable straight
 * from the row menu as well as from inside the dialog. Both are held as **ids**
 * and looked up in the current page: clearing invalidates the employee queries,
 * so the dialog then shows the new (empty) set rather than its opening snapshot.
 *
 * The delete is always confirmed: `DELETE …/face` de-registers the face and
 * purges every image at once, and the API offers no way back.
 */
export function useEmployeeFaces(rows: Employee[]) {
  const [facesEmployeeId, setFacesEmployeeId] = useState<number | null>(null)
  const [clearEmployeeId, setClearEmployeeId] = useState<number | null>(null)
  const deleteFaces = useDeleteEmployeeFace()

  const find = (id: number | null) => rows.find((row) => row.id === id) ?? null
  const facesEmployee = find(facesEmployeeId)
  const clearEmployee = find(clearEmployeeId)

  const openFaces = (employee: Employee) => setFacesEmployeeId(employee.id)
  const closeFaces = () => setFacesEmployeeId(null)

  /** Ask before clearing — from the row menu or from the open dialog. */
  const askClearFaces = (employee: Employee) => setClearEmployeeId(employee.id)
  const cancelClearFaces = () => setClearEmployeeId(null)

  const confirmDeleteFaces = () => {
    if (clearEmployeeId === null) return
    const id = clearEmployeeId
    deleteFaces.mutate(id, {
      onSuccess: (deleted) => {
        toast.success(
          deleted === 1
            ? 'Face de-registered — 1 image deleted'
            : `Face de-registered — ${deleted} images deleted`,
        )
        setClearEmployeeId(null)
        // Nothing is left to look at, so the dialog goes with them.
        if (facesEmployeeId === id) setFacesEmployeeId(null)
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete the registered face',
        ),
    })
  }

  return {
    facesEmployee,
    openFaces,
    closeFaces,
    /** The row awaiting the confirm — `null` keeps the confirm dialog closed. */
    clearEmployee,
    askClearFaces,
    cancelClearFaces,
    confirmDeleteFaces,
    isDeletingFaces: deleteFaces.isPending,
  }
}
