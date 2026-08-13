import { useCallback, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { ALL_ROWS } from '@/lib/pagination'
import { departmentOptions, useDepartments } from '@/features/master/department'
import {
  bonusMonthBounds,
  fromIsoMonth,
  isoMonthToDate,
  toIsoMonth,
  type BonusView,
  type CalculationField,
} from '../constants'
import type { BonusEstimateFilters } from '../schemas'

/** The range and scope a read is made for — what the pickers stage toward. */
export interface BonusScope {
  from: string
  to: string
  departmentId: number | null
}

/**
 * What both sides of the screen are read for: the department, the range, and
 * which view is open.
 *
 * **The pickers stage; Load reads.** An estimate is an aggregation over every
 * processed month of every employee in scope, so a half-changed range — the
 * `from` moved but not yet the `to` — would fire a read nobody asked for, and
 * `from` after `to` is a 400 rather than an empty table. Nothing loads until Load
 * is pressed, and the two views then share what it applied: switching to Saved
 * Bonus reads back the same range that was just estimated.
 *
 * The CALCULATION BASE is the deliberate exception — it is **not** staged. Every
 * estimate line carries all four bases, so changing it re-fills the base column
 * from the answer already on screen instead of asking again. It still travels
 * with the save, because it is what each committed month is recorded as having
 * been figured on.
 *
 * The company isn't asked for: the read is the active company's, and switching
 * company is the switcher's job.
 */
export function useBonusScope() {
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  const today = useMemo(() => new Date(), [])
  const thisMonth = useMemo(
    () => toIsoMonth(today.getMonth() + 1, today.getFullYear()),
    [today],
  )

  const [view, setView] = useState<BonusView>('estimate')

  /** What the pickers hold. */
  const [draft, setDraft] = useState<BonusScope>(() => ({
    from: thisMonth,
    to: thisMonth,
    departmentId: null,
  }))

  /** What the rows on screen were actually read for — `null` until the first Load. */
  const [scope, setScope] = useState<BonusScope | null>(null)

  /**
   * Live, not staged: all four bases are on every line already. Changing it
   * re-fills the base column, and the estimate hook re-derives any amount that
   * was auto-filled from a percentage so the two columns stay consistent.
   */
  const [calculationField, setCalculationField] =
    useState<CalculationField>('basic_pay')

  const departments = useDepartments(ALL_ROWS)
  const departmentChoices = useMemo(
    () => departmentOptions(departments.data?.items ?? []),
    [departments.data],
  )
  const monthBounds = useMemo(() => bonusMonthBounds(today), [today])

  /**
   * Moving the start past the end carries the end with it, rather than leaving a
   * range the screen would have to refuse. The To picker can't be opened earlier
   * than `from` in the first place (it takes it as its `minDate`), so this covers
   * the one way round that: raising `from` above a `to` already picked.
   */
  const changeFrom = useCallback((value: string) => {
    if (!fromIsoMonth(value)) return
    setDraft((prev) => ({
      ...prev,
      from: value,
      to: prev.to && prev.to < value ? value : prev.to,
    }))
  }, [])

  const changeTo = useCallback((value: string) => {
    if (!fromIsoMonth(value)) return
    setDraft((prev) => ({ ...prev, to: value }))
  }, [])

  const changeDepartment = useCallback((value: number | null) => {
    setDraft((prev) => ({ ...prev, departmentId: value }))
  }, [])

  /**
   * The earliest month To may hold — the From month itself.
   *
   * `from` after `to` is a 400, and this is what makes it unreachable: the range
   * is kept valid by the picker's own bounds rather than by a message under a
   * field the user has already filled in.
   */
  const toMinDate = useMemo(
    () => isoMonthToDate(draft.from) ?? monthBounds.minDate,
    [draft.from, monthBounds.minDate],
  )

  /** The pickers hold something the rows on screen weren't read for. */
  const hasPendingScope =
    !scope ||
    draft.from !== scope.from ||
    draft.to !== scope.to ||
    draft.departmentId !== scope.departmentId

  const canLoad = companyId !== null && Boolean(draft.from && draft.to)

  /**
   * Read for what the pickers hold. Returns the scope it applied so the callers
   * can start their own page over on it — a new range is a different result set.
   */
  const load = useCallback((): BonusScope | null => {
    if (!canLoad) return null
    setScope(draft)
    return draft
  }, [canLoad, draft])

  /** What the query hooks take — `null` until something has been asked for. */
  const filters = useMemo<BonusEstimateFilters | null>(
    () =>
      scope && companyId !== null
        ? {
            companyId,
            from: scope.from,
            to: scope.to,
            departmentId: scope.departmentId,
            /* The endpoints take a designation too; this screen doesn't offer one
               — a bonus is declared per department, and narrowing further would
               produce a saved range nobody could read back the same way. */
            designationId: null,
          }
        : null,
    [scope, companyId],
  )

  const departmentName =
    departmentChoices.find((option) => option.value === String(scope?.departmentId))
      ?.label ?? null

  return {
    companyId,

    view,
    setView,

    /* The draft */
    draft,
    changeFrom,
    changeTo,
    changeDepartment,
    monthBounds,
    /** The To picker's floor — the From month, so an inverted range can't be picked. */
    toMinDate,
    departmentChoices,
    departmentsLoading: departments.isLoading,
    hasPendingScope,
    canLoad,
    load,

    /* What is on screen */
    scope,
    filters,
    hasLoaded: scope !== null,
    departmentName,

    calculationField,
    setCalculationField,
  }
}
