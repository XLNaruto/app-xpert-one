import { IndianRupee, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDesignationWageForm } from '../hooks/use-designation-wage-form'
import { WageStructureGrid } from './wage-structure-grid'

interface WageStructureTabProps {
  designationId: number
}

/**
 * The wage structure tab — an effective-dated history for the designation. Each
 * saved row applies from its month onward until a later row supersedes it, so a
 * revision is a new row: the months already paid on the old figures keep them.
 * A saved row can still be corrected in place, from the pencil on its own row,
 * for one entered wrong.
 *
 * The tab owns its own form and save, separate from the designation's basic
 * info, because the API saves the two through different endpoints.
 */
export function WageStructureTab({ designationId }: WageStructureTabProps) {
  const form = useDesignationWageForm(designationId)
  const savedCount = form.existing.length
  /*
   * A row opened for correction is one of the saved entries, not an extra one —
   * it's already counted in `savedCount`, so only genuinely new rows add to the
   * total.
   */
  const editingCount = form.fields.filter(
    (field) => field.wageStructureId !== undefined,
  ).length
  const newCount = form.fields.length - editingCount
  const total = savedCount + newCount

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <div className="rounded-xl border border-border">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Wage Structure History
              </h3>
              <p className="text-xs text-muted-foreground">
                Each row is an effective date — the wage structure applies from that
                month onward. Add a row to revise it; use the pencil to correct a
                saved one.
              </p>
            </div>
          </div>
          {/* `ml-auto` as well as the row's `justify-between`: once the header
              wraps, the button is alone on its line and has nothing to be spaced
              apart from, so it would otherwise drop to the left edge. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={form.addRow}
            className="ml-auto"
          >
            <Plus className="size-4" />
            Add Row
          </Button>
        </div>

        {/*
          Flush against the card — the grid brings its own gridlines and a pinned
          header, so padding here would only float it off the edges and read as a
          second frame inside the first.

          No error list under it either: with a dozen draft rows it became a wall
          of the same two sentences repeated. Invalid cells outline themselves in
          the grid instead, and a failed save says so once.
        */}
        <WageStructureGrid form={form} />

        {/* ── Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? 'entry' : 'entries'} —{' '}
            <span className="font-medium text-foreground">{savedCount} existing</span>,{' '}
            <span className="font-medium text-primary">{newCount} new</span>
            {editingCount > 0 && (
              <>
                {', '}
                <span className="font-medium text-primary">{editingCount} being edited</span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={form.addRow}>
              <Plus className="size-4" />
              Add Row
            </Button>
            {/* Nothing on the grid to save — the history alone is nothing to send. */}
            <Button
              type="submit"
              size="sm"
              disabled={form.isPending || form.fields.length === 0}
            >
              {form.isPending ? 'Saving…' : 'Save Wage Structure'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
