import { Eraser, Percent, Save, Search, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatAmount } from '@/lib/currency'
import { MAX_BONUS_EMPLOYEES, STATUTORY_BONUS_PERCENT } from '../constants'

interface BonusEstimateControlsProps {
  search: string
  onSearchChange: (value: string) => void

  /** The percentage in the box — held by the page, applied on demand. */
  percent: string
  onPercentChange: (value: string) => void
  onApplyAll: () => void
  onApplySelected: () => void

  selectedCount: number
  payableCount: number
  payableTotal: number
  /** Ticked but with nothing keyed — they wouldn't be saved. */
  unkeyedCount: number
  onClearSelection: () => void

  hasDrafts: boolean
  onClearDrafts: () => void

  /** Rendered only with the create right on the resource. */
  canSave: boolean
  onSave: () => void
  isSaving: boolean
  tooMany: boolean
}

/**
 * What to spread across the rows on screen, and what to do with what is ticked.
 *
 * These sit on the table's own header rather than in the filter card above, and
 * the split is the point: the card decides *what range is being figured* — staged
 * behind Load, because it is also what a save gets filed under — while these act
 * on the rows already loaded.
 *
 * The two Apply buttons are the screen's actual work. One percentage lands as a
 * *different amount per row*, because each row's base is its own — which is why
 * this is a table of amounts and not one figure with a headcount.
 *
 * Both act on the rows **currently loaded**, since an off-page row's base isn't on
 * hand to multiply. Ticks and keyed amounts themselves survive paging, so a wide
 * selection is built page by page and saved in one go.
 */
export function BonusEstimateControls({
  search,
  onSearchChange,
  percent,
  onPercentChange,
  onApplyAll,
  onApplySelected,
  selectedCount,
  payableCount,
  payableTotal,
  unkeyedCount,
  onClearSelection,
  hasDrafts,
  onClearDrafts,
  canSave,
  onSave,
  isSaving,
  tooMany,
}: BonusEstimateControlsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Name, code or mobile…"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* What is ticked and what it comes to. Spans pages, so it's worth
              printing — the rows it names may be scrolled off. */}
          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
              {selectedCount} selected
              {payableCount > 0 && ` · ${formatAmount(payableTotal)}`}
              <button
                type="button"
                onClick={onClearSelection}
                aria-label="Clear the selection"
                className="flex size-4 cursor-pointer items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {hasDrafts && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearDrafts}
              className="gap-1.5"
            >
              <Eraser className="size-4" />
              Reset Amounts
            </Button>
          )}

          {/* One percentage, two reaches: every loaded row, or only the ticked
              ones. The statutory 8.33% is the placeholder and nothing more — the
              Act's ceiling is 20% and anything between is the payer's decision.
              The box itself won't go past 100, which is the API's own cap. */}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bonus %
          </span>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1">
            <Percent className="size-3.5 text-muted-foreground" />
            <Input
              value={percent}
              onChange={(event) => onPercentChange(event.target.value)}
              placeholder={String(STATUTORY_BONUS_PERCENT)}
              inputMode="decimal"
              aria-label="Bonus percentage"
              className="h-6 w-16 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onApplyAll}
              className="h-6 gap-1 px-2 text-xs"
            >
              <Wand2 className="size-3.5" />
              Apply to all
            </Button>
            <span className="h-4 w-px bg-border" aria-hidden />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onApplySelected}
              disabled={selectedCount === 0}
              className="h-6 gap-1 px-2 text-xs"
            >
              <Wand2 className="size-3.5" />
              Apply to selected
            </Button>
          </div>

          {canSave && (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSaving || payableCount === 0}
              className="gap-1.5"
            >
              <Save className="size-4" />
              {isSaving ? 'Saving…' : 'Save Bonus'}
            </Button>
          )}
        </div>
      </div>

      {/* The two things a ticked row can be wrong about, said before the save
          rather than as a refusal after it. */}
      {tooMany ? (
        <p className="text-xs text-destructive">
          One save commits at most {MAX_BONUS_EMPLOYEES} employees — {payableCount} are
          ticked with an amount. Untick some and save the rest after.
        </p>
      ) : (
        unkeyedCount > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            {unkeyedCount} ticked {unkeyedCount === 1 ? 'employee has' : 'employees have'} no
            bonus keyed yet and won't be saved. Apply a percentage, or enter the amount on
            the row.
          </p>
        )
      )}
    </div>
  )
}
