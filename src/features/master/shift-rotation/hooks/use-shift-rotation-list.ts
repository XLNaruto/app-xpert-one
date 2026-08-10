import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { useAuthStore } from '@/stores/auth-store'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useShifts } from '@/features/master/shift'
import { SHIFT_ROTATION_DEFAULT_SORT } from '../constants'
import { useShiftRotations } from '../api/use-shift-rotations'
import { useDeleteShiftRotation } from '../api/use-shift-rotation-mutations'
import type { ShiftRotation } from '../types'

/**
 * Orchestrates the rotation master: the paged list, navigation to the create/edit
 * screen and the delete flow. The page consumes this and only renders.
 *
 * The shift master is read alongside it, whole rather than paged, because a
 * rotation's rows carry `shift_id` and nothing else — the cycle only becomes
 * readable ("W1 Morning → W2 Night") once those ids have names.
 */
export function useShiftRotationList() {
  const navigate = useNavigate()
  const companyId = useAuthStore((state) => state.user?.companyId ?? undefined)
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, SHIFT_ROTATION_DEFAULT_SORT)

  const { data, isLoading, isError, error } = useShiftRotations(params)
  const shifts = useShifts(undefined, companyId)
  const deleteRotation = useDeleteShiftRotation()

  const [pendingDelete, setPendingDelete] = useState<ShiftRotation | null>(null)

  /** `shift_id` → its name, for the cycle summary on each row. */
  const shiftList = useMemo(() => shifts.data?.items ?? [], [shifts.data])

  const goToCreate = () => navigate({ to: '/master/shift-rotation/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/master/shift-rotation/create', search: { data: encryptId(id) } })

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteRotation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Shift rotation deleted')
        setPendingDelete(null)
      },
      // A rotation with employees on it answers 409 with the reason.
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't delete the shift rotation.")),
    })
  }

  const isForbidden = isForbiddenError(error)

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,
    isLoading,
    isError: isError && !isForbidden,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,
    /** The company's shifts, for naming the ids each cycle carries. */
    shifts: shiftList,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteRotation.isPending,
  }
}
