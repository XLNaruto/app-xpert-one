import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { ANNUAL_PAID_LEAVE_MAX, ANNUAL_PAID_LEAVE_MIN } from '../schemas'
import type { LeaveQuotaRow, LeaveQuotaSaveRow } from '../types'

/**
 * The editing state behind either allowance grid.
 *
 * ## Why the cells are held as STRINGS
 *
 * Because `0` and empty are two different instructions to the API, and a number
 * can't tell them apart:
 *
 * - a typed **`0`** is stored — "no paid days of this type at this tier";
 * - an **empty** box sends nothing, and the type falls through to the tier below
 *   (the designation's policy, or `NONE`).
 *
 * Holding cells as `number | null` would collapse the two the moment a box was
 * cleared, and a blank cell would silently override the designation with a zero.
 *
 * ## Why the save is built from the SERVER's rows
 *
 * A `PUT` is a whole-list replace, and the API rejects three things: an id from
 * another company, a duplicate row, and a row for an UNPAID type. Building the
 * payload by walking the `items` the GET returned — one row each, unlimited ones
 * dropped — makes all three impossible rather than something to report.
 */
export function useLeaveQuotaGrid({
  items,
  /** A key that changes when the grid being edited changes — the year, or the id. */
  scope,
  save,
  isSaving,
  canUpdate,
}: {
  items: LeaveQuotaRow[] | undefined
  scope: string | number
  save: (
    rows: LeaveQuotaSaveRow[],
    handlers: { onSuccess: () => void; onError: (error: unknown) => void },
  ) => void
  isSaving: boolean
  canUpdate: boolean
}) {
  /** `leaveTypeId` → what's in the box. `''` is an empty cell, not a zero. */
  const [draft, setDraft] = useState<Record<number, string>>({})

  const serverDraft = useMemo(() => {
    const next: Record<number, string> = {}
    for (const row of items ?? []) {
      next[row.leaveTypeId] = row.annualPaidLeave === null ? '' : String(row.annualPaidLeave)
    }
    return next
  }, [items])

  /*
   * Re-seed when the ANSWER changes — a fresh read, a saved grid re-bound from the
   * response, or a switch to another year (the draft belonged to the other year,
   * so discarding it is the honest behaviour).
   *
   * Keyed on the answer's CONTENT, not on the query object: a background refetch
   * hands back an equal-but-new array, and re-seeding on that would wipe out
   * whatever the user had half-typed the moment the window regained focus.
   */
  const seeded = useRef<string>('')
  const signature = `${scope}|${JSON.stringify(serverDraft)}`

  useEffect(() => {
    if (seeded.current === signature) return
    seeded.current = signature
    setDraft(serverDraft)
  }, [signature, serverDraft])

  const setCell = (leaveTypeId: number, value: string) => {
    // Digits only: the API takes a whole number of days, and a `.5` is a 400.
    const cleaned = value.replace(/[^\d]/g, '')
    setDraft((prev) => ({ ...prev, [leaveTypeId]: cleaned }))
  }

  const clearCell = (leaveTypeId: number) =>
    setDraft((prev) => ({ ...prev, [leaveTypeId]: '' }))

  /** Per-cell bounds message, or `undefined` when the cell is fine. */
  const errorFor = (leaveTypeId: number): string | undefined => {
    const raw = draft[leaveTypeId]
    if (!raw) return undefined
    const value = Number(raw)
    if (!Number.isInteger(value)) return 'Whole days only'
    if (value < ANNUAL_PAID_LEAVE_MIN || value > ANNUAL_PAID_LEAVE_MAX) {
      return `Between ${ANNUAL_PAID_LEAVE_MIN} and ${ANNUAL_PAID_LEAVE_MAX}`
    }
    return undefined
  }

  const editableRows = useMemo(
    // An unpaid type is unpaid from day one — there is no allowance to set, and a
    // row for one is a 400.
    () => (items ?? []).filter((row) => !row.unlimited),
    [items],
  )

  const hasErrors = editableRows.some((row) => errorFor(row.leaveTypeId) !== undefined)

  const isDirty = useMemo(
    () =>
      editableRows.some(
        (row) => (draft[row.leaveTypeId] ?? '') !== (serverDraft[row.leaveTypeId] ?? ''),
      ),
    [draft, serverDraft, editableRows],
  )

  /** The payload the grid sends: one row per FILLED cell of a paid type. */
  const buildRows = (): LeaveQuotaSaveRow[] => {
    const rows: LeaveQuotaSaveRow[] = []
    for (const row of editableRows) {
      const raw = draft[row.leaveTypeId] ?? ''
      // An empty cell sends NOTHING — that's what makes it fall through to the
      // tier below instead of pinning a zero here.
      if (raw === '') continue
      rows.push({ leaveTypeId: row.leaveTypeId, annualPaidLeave: Number(raw) })
    }
    return rows
  }

  const onSave = () => {
    if (hasErrors) return

    save(buildRows(), {
      onSuccess: () => toast.success('Leave allowances saved'),
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't save the leave allowances.")),
    })
  }

  return {
    draft,
    setCell,
    clearCell,
    errorFor,
    isDirty,
    hasErrors,
    /** Nothing to save and nothing to change — the grid renders read-only. */
    isReadOnly: !canUpdate,
    onSave,
    isSaving,
    reset: () => setDraft(serverDraft),
  }
}
