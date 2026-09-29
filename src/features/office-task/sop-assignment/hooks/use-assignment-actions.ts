import { useState } from 'react'
import { toast } from 'sonner'
import { isStaleRowError } from '@/features/office-task/common'
import {
  useDeleteSopAssignment,
  useStartSopAssignment,
  useStopSopAssignment,
} from '../api/use-sop-assignments'
import type { SopAssignmentRow } from '../types'

export type AssignmentAction = { kind: 'start' | 'stop' | 'delete'; row: SopAssignmentRow }

const DONE: Record<AssignmentAction['kind'], string> = {
  start: 'Assignment started',
  stop: 'Assignment stopped',
  delete: 'Assignment deleted',
}

/**
 * The Start / Stop / Delete confirm flow, shared by the list and the detail
 * screen. `onStarted` gets the id now running — a restart after a gap is a new
 * assignment, so a screen showing the old one can follow it.
 */
export function useAssignmentActions(onDeleted?: () => void, onStarted?: (id: number) => void) {
  const start = useStartSopAssignment()
  const stop = useStopSopAssignment()
  const remove = useDeleteSopAssignment()
  const [pending, setPending] = useState<AssignmentAction | null>(null)

  const confirm = () => {
    if (!pending) return
    const { kind, row } = pending
    const done = () => {
      toast.success(DONE[kind])
      setPending(null)
    }
    const onError = (err: Error) => {
      toast.error(err.message)
      // A 409 means the row moved (already stopped, started work…): its flags
      // are being re-read, so the confirm for the old state is closed.
      if (isStaleRowError(err)) setPending(null)
    }
    if (kind === 'start') {
      start.mutate(row.id, {
        onSuccess: (id) => {
          done()
          onStarted?.(id)
        },
        onError,
      })
      return
    }
    ;(kind === 'stop' ? stop : remove).mutate(row.id, {
      onSuccess: () => {
        done()
        if (kind === 'delete') onDeleted?.()
      },
      onError,
    })
  }

  return {
    pending,
    askStart: (row: SopAssignmentRow) => setPending({ kind: 'start', row }),
    askStop: (row: SopAssignmentRow) => setPending({ kind: 'stop', row }),
    askDelete: (row: SopAssignmentRow) => setPending({ kind: 'delete', row }),
    cancel: () => setPending(null),
    confirm,
    isWorking: start.isPending || stop.isPending || remove.isPending,
  }
}
