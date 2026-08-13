import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { formatAmount } from '@/lib/currency'
import {
  BONUS_MAX_LIMIT,
  BONUS_PAGE_SIZE,
  MAX_BONUS_EMPLOYEES,
  type CalculationField,
} from '../constants'
import {
  baseAmountFor,
  bonusAmountFrom,
  bonusPercentFrom,
  clampAmountText,
  clampPercentText,
  parseAmount,
  parsePercent,
} from '../lib/bonus-mappers'
import { useBonusEstimate } from '../api/use-bonus-estimation'
import { useSaveBonuses } from '../api/use-bonus-mutations'
import type { BonusEstimateFilters } from '../schemas'
import type { BonusDraft, BonusEstimateRow } from '../types'

interface UseBonusEstimateListOptions {
  /** `null` until Load has been pressed — the query stays idle. */
  filters: BonusEstimateFilters | null
  /** Which base the amounts are figured on. Applies live, without a re-read. */
  calculationField: CalculationField
  /** Whether this view is the one on screen — the other must not read. */
  active: boolean
}

/** An empty draft — both halves unkeyed. */
const EMPTY_DRAFT: BonusDraft = { percentage: '', amount: '' }

/**
 * The Estimate & Save side: one page of what a bonus would cost, the amounts
 * being keyed against it, and the save that commits them.
 *
 * **The drafts and the selection are keyed by employee id, and both span pages.**
 * The endpoint serves up to 500 rows and applying one percentage across a whole
 * department is the normal use, so an amount keyed on page 1 has to survive a trip
 * to page 3 and back — and the save has to name people who are no longer on
 * screen, which a set of row indexes couldn't.
 *
 * The two columns are kept consistent in both directions. Keying a **percentage**
 * fills the amount from the row's base; keying an **amount** derives the
 * percentage back from that base, so what is stored describes how the figure was
 * actually reached. Where a row has no base — no processed month priced that
 * figure — the amount stands alone and no percentage is sent, which is exactly the
 * case manual entry exists for.
 *
 * A new range clears both. The rows are different people over different months,
 * and an amount left over from the previous range would be committed against this
 * one.
 */
export function useBonusEstimateList({
  filters,
  calculationField,
  active,
}: UseBonusEstimateListOptions) {
  /* No `sort`: the endpoint fixes the order, so no default is passed and the
     columns aren't sortable. */
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange: setPagination,
  } = usePagination(BONUS_PAGE_SIZE)

  /**
   * `<DataTable>`'s size selector always offers "All", reported back as a
   * negative limit. This endpoint caps `limit` at 500 and can't answer
   * "everything", so All is taken as the largest page it will serve.
   */
  const onPaginationChange = useCallback(
    (next: { limit: number; offset: number }) =>
      setPagination(next.limit < 0 ? { limit: BONUS_MAX_LIMIT, offset: 0 } : next),
    [setPagination],
  )

  const list = useBonusEstimate(active ? filters : null, params)
  const save = useSaveBonuses()

  const rows = useMemo(() => list.data?.items ?? [], [list.data])

  const [drafts, setDrafts] = useState<Map<number, BonusDraft>>(new Map())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)

  /* A different range is a different result set: back to its first page, with
     nothing ticked and nothing keyed. Keyed on the filters object, which only
     changes when Load applies a new scope. `limit` is read through a ref so a
     page-size change doesn't come through here as well. */
  const limitRef = useRef(limit)
  limitRef.current = limit
  useEffect(() => {
    setDrafts(new Map())
    setSelected(new Set())
    setPagination({ limit: limitRef.current, offset: 0 })
  }, [filters, setPagination])

  /* ── The two columns ── */

  const baseOf = useCallback(
    (row: BonusEstimateRow) => baseAmountFor(row, calculationField),
    [calculationField],
  )

  const draftOf = useCallback(
    (employeeId: number) => drafts.get(employeeId) ?? EMPTY_DRAFT,
    [drafts],
  )

  /**
   * Keying a percentage fills the amount from the row's base. The figure is held
   * to the API's 0–100 as it is typed, so a slipped keystroke lands on 100 rather
   * than being refused after a table full of work.
   */
  const setPercentage = useCallback(
    (row: BonusEstimateRow, typed: string) => {
      const value = clampPercentText(typed)
      const percent = parsePercent(value)
      const base = baseOf(row)
      setDrafts((prev) => {
        const next = new Map(prev)
        const current = next.get(row.employeeId) ?? EMPTY_DRAFT
        next.set(row.employeeId, {
          percentage: value,
          /* Nothing to compute from: a row with no base keeps whatever was keyed
             by hand rather than having it wiped by an unusable percentage. */
          amount:
            percent !== null && base > 0
              ? String(bonusAmountFrom(base, percent))
              : current.amount,
        })
        return next
      })
    },
    [baseOf],
  )

  /**
   * Keying an amount derives the percentage back, so the figure and the
   * percentage stored beside it agree. With no base there is no percentage to
   * claim, and the field is cleared rather than left describing the last one.
   */
  const setAmount = useCallback(
    (row: BonusEstimateRow, typed: string) => {
      const value = clampAmountText(typed)
      const amount = parseAmount(value)
      const base = baseOf(row)
      const percent = amount === null ? null : bonusPercentFrom(base, amount)
      setDrafts((prev) => {
        const next = new Map(prev)
        const current = next.get(row.employeeId) ?? EMPTY_DRAFT
        next.set(row.employeeId, {
          percentage:
            amount === null
              ? current.percentage
              : percent === null
                ? ''
                : String(percent),
          amount: value,
        })
        return next
      })
    },
    [baseOf],
  )

  /**
   * A percentage across many rows at once — the whole point of the screen. The
   * amount each row lands on is its own base × the percentage, so one figure
   * spreads correctly over people on different wages.
   */
  const applyPercentTo = useCallback(
    (targets: BonusEstimateRow[], value: string) => {
      const percent = parsePercent(value)
      if (percent === null) {
        toast.info('Enter a bonus percentage between 0 and 100 first.')
        return
      }
      if (targets.length === 0) {
        toast.info('There are no rows to apply it to.')
        return
      }
      setDrafts((prev) => {
        const next = new Map(prev)
        for (const row of targets) {
          const base = baseAmountFor(row, calculationField)
          const current = next.get(row.employeeId) ?? EMPTY_DRAFT
          next.set(row.employeeId, {
            percentage: value,
            amount: base > 0 ? String(bonusAmountFrom(base, percent)) : current.amount,
          })
        }
        return next
      })
    },
    [calculationField],
  )

  /**
   * Switching the base re-derives every amount that was filled FROM a percentage,
   * and leaves hand-keyed amounts alone.
   *
   * Without this the column would say one thing and the amount beside it another:
   * 8.33% of the basic is not 8.33% of the gross. A hand-keyed amount was never a
   * percentage of anything, so it is the one figure the switch mustn't touch —
   * though its stored percentage is re-derived against the new base, since that is
   * what the save would now record it as.
   */
  useEffect(() => {
    setDrafts((prev) => {
      if (prev.size === 0) return prev
      const byId = new Map(rows.map((row) => [row.employeeId, row]))
      const next = new Map(prev)
      let changed = false
      for (const [employeeId, draft] of prev) {
        const row = byId.get(employeeId)
        /* Off-page rows keep their draft untouched — there is no base to re-derive
           against until the page holding them is read again. */
        if (!row) continue
        const base = baseAmountFor(row, calculationField)
        const percent = parsePercent(draft.percentage)
        if (percent !== null && base > 0) {
          const amount = String(bonusAmountFrom(base, percent))
          if (amount !== draft.amount) {
            next.set(employeeId, { percentage: draft.percentage, amount })
            changed = true
          }
          continue
        }
        const amount = parseAmount(draft.amount)
        if (amount === null) continue
        const derived = bonusPercentFrom(base, amount)
        const percentage = derived === null ? '' : String(derived)
        if (percentage !== draft.percentage) {
          next.set(employeeId, { percentage, amount: draft.amount })
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [calculationField, rows])

  const clearDrafts = useCallback(() => {
    setDrafts(new Map())
    setSelected(new Set())
  }, [])

  /* ── Selection ── */

  const toggleRow = useCallback((employeeId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(employeeId)) next.add(employeeId)
      return next
    })
  }, [])

  /** Ticks or clears **this page**, leaving any off-page selection alone. */
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const pageSelected =
        rows.length > 0 && rows.every((row) => prev.has(row.employeeId))
      const next = new Set(prev)
      for (const row of rows) {
        if (pageSelected) next.delete(row.employeeId)
        else next.add(row.employeeId)
      }
      return next
    })
  }, [rows])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.employeeId))

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.employeeId)),
    [rows, selected],
  )

  /**
   * What the save would commit: every ticked employee carrying a positive amount.
   *
   * Built from the DRAFTS rather than from the rows on screen, because the
   * selection spans pages — a row ticked on page 1 is still being paid when page 3
   * is showing, and the total in the toolbar has to say so.
   */
  const payableEmployees = useMemo(() => {
    const lines: { employeeId: number; amount: number; percentage?: number }[] = []
    for (const employeeId of selected) {
      const draft = drafts.get(employeeId)
      if (!draft) continue
      const amount = parseAmount(draft.amount)
      if (amount === null || amount <= 0) continue
      const percentage = parsePercent(draft.percentage)
      lines.push({
        employeeId,
        amount,
        ...(percentage === null ? {} : { percentage }),
      })
    }
    return lines
  }, [selected, drafts])

  const payableTotal = useMemo(
    () => payableEmployees.reduce((sum, line) => sum + line.amount, 0),
    [payableEmployees],
  )

  /** Ticked but with nothing keyed — worth saying, since they won't be saved. */
  const unkeyedCount = selected.size - payableEmployees.length

  const tooMany = payableEmployees.length > MAX_BONUS_EMPLOYEES

  /* ── Saving ── */

  const askSave = useCallback(() => {
    if (selected.size === 0) {
      toast.info('Tick the employees whose bonus you want to save first.')
      return
    }
    if (payableEmployees.length === 0) {
      toast.info('Enter a bonus percentage or amount for the ticked employees first.')
      return
    }
    if (tooMany) {
      toast.warning(
        `One save commits at most ${MAX_BONUS_EMPLOYEES} employees. Untick some and save the rest after.`,
      )
      return
    }
    setConfirmOpen(true)
  }, [selected.size, payableEmployees.length, tooMany])

  /**
   * Commit. A 201 is not "everything ticked was saved": a month already carrying a
   * bonus is skipped rather than overwritten, so both halves are reported — what
   * landed, and what didn't and why.
   */
  const confirmSave = useCallback(() => {
    if (!filters || payableEmployees.length === 0) return

    save.mutate(
      {
        companyId: filters.companyId,
        from: filters.from,
        to: filters.to,
        departmentId: filters.departmentId,
        designationId: filters.designationId,
        calculationField,
        employees: payableEmployees,
      },
      {
        onSuccess: (result) => {
          const committed = result.employees.filter((line) => line.months > 0)
          const savedAmount = committed.reduce((sum, line) => sum + line.savedAmount, 0)

          if (committed.length > 0) {
            toast.success(
              `Bonus saved for ${committed.length} ${
                committed.length === 1 ? 'employee' : 'employees'
              } — ${formatAmount(savedAmount)} across ${result.saved} ${
                result.saved === 1 ? 'month' : 'months'
              }.`,
            )
          }

          /* Every refusal is individual and the request still succeeded, so this
             has to be said here or it goes unsaid. `reason` is only set when an
             employee got nothing at all; a short save is the skipped-months case. */
          const refused = result.employees.filter((line) => line.months === 0)
          const short = result.employees.filter(
            (line) => line.months > 0 && line.savedAmount < line.requestedAmount,
          )
          if (refused.length > 0) {
            toast.warning(
              `${refused.length} not saved — ${
                refused[0].reason || 'no processed month in this range to write to'
              }.`,
            )
          } else if (short.length > 0) {
            toast.warning(
              `${short.length} saved short — ${result.skippedMonths} ${
                result.skippedMonths === 1 ? 'month' : 'months'
              } already carried a bonus and were left as they are.`,
            )
          }

          setConfirmOpen(false)
          clearDrafts()
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Couldn't save the bonus."))
          setConfirmOpen(false)
        },
      },
    )
  }, [filters, payableEmployees, calculationField, save, clearDrafts])

  const isForbidden = isForbiddenError(list.error)

  return {
    rows,
    range: list.data?.range ?? null,
    total: list.data?.total ?? 0,

    isLoading: list.isLoading,
    isFetching: list.isFetching,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    search,
    setSearch,
    limit,
    offset,
    onPaginationChange,

    baseOf,
    draftOf,
    setPercentage,
    setAmount,
    applyPercentTo,
    clearDrafts,
    hasDrafts: drafts.size > 0,

    selected,
    selectedCount: selected.size,
    selectedRows,
    allSelected,
    toggleRow,
    toggleAll,
    clearSelection,

    payableCount: payableEmployees.length,
    payableTotal,
    unkeyedCount,
    tooMany,

    confirmOpen,
    setConfirmOpen,
    askSave,
    confirmSave,
    isSaving: save.isPending,
  }
}
