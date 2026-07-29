import { IndianRupee, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDesignationWageForm } from '../hooks/use-designation-wage-form'
import { WageStructureGrid } from './wage-structure-grid'

interface WageStructureTabProps {
  designationId: number
}

/**
 * The wage structure tab — an effective-dated history for the designation. Rows
 * are append-only: each one applies from its month onward until a later row
 * supersedes it, so the saved rows read as an audit trail and a change means
 * drafting a new row rather than editing an old one.
 *
 * The tab owns its own form and save, separate from the designation's basic
 * info, because the two are saved independently.
 */
export function WageStructureTab({ designationId }: WageStructureTabProps) {
  const form = useDesignationWageForm(designationId)
  const draftCount = form.fields.length
  const savedCount = form.existing.length
  const total = savedCount + draftCount

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
                month onward
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={form.addRow}>
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
            <span className="font-medium text-primary">{draftCount} new</span>
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={form.addRow}>
              <Plus className="size-4" />
              Add Row
            </Button>
            <Button type="submit" size="sm" disabled={form.isPending}>
              {form.isPending ? 'Saving…' : 'Save Wage Structure'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
