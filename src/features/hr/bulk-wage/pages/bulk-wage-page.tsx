import { useNavigate } from '@tanstack/react-router'
import { History, IndianRupee, RotateCcw, Save } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { formatMonth } from '@/features/master/designation'
import { useBulkWageForm } from '../hooks/use-bulk-wage-form'
import { BulkWageGrid } from '../components/bulk-wage-grid'
import { BulkWageToolbar } from '../components/bulk-wage-toolbar'

/**
 * Bulk Update Wage — every designation of one company on one grid, saved against
 * one effective month.
 *
 * The designation master configures a wage structure one designation at a time,
 * down its own effective-dated history. That's right for a change to one role
 * and wrong for the thing this screen exists for: a revision that lands across
 * the payroll at once — a minimum-wage notification, a statutory rate change, an
 * annual increment. So the same forty columns are turned on their side. A row is
 * a designation, the effective month is the screen's, and the save is one
 * transaction: either every row lands or none does.
 *
 * Save All sends the changed rows, not the whole grid: every designation the
 * company has is on screen, and stamping a version onto ones nobody touched
 * would read in their history as a pay revision that never happened.
 *
 * With nothing changed it sends every configured row instead — the click can
 * only mean "apply this grid at the month I picked", which is the other half of
 * what the screen is for and used to leave the button dead.
 */

/** What Save All is about to do, on the button itself. */
function saveAllHint(changedCount: number): string {
  return changedCount > 0
    ? `Save the ${changedCount} changed ${changedCount === 1 ? 'row' : 'rows'} at the month above`
    : 'Nothing edited — saves every configured row at the month above, re-dating it'
}

/**
 * The same thing again, spelled out for the confirmation — which rows are about
 * to be written, and against which month. The month is the part worth reading
 * twice: it's chosen once at the top of the screen and applies to every row.
 */
function saveAllConfirmation(
  changedCount: number,
  saveCount: number,
  effectiveFrom: string,
): string {
  const month = effectiveFrom ? formatMonth(effectiveFrom) : 'the month selected above'
  const rows = `${saveCount} ${saveCount === 1 ? 'designation' : 'designations'}`

  return changedCount > 0
    ? `A new wage version will be written for the ${rows} you changed, effective from ${month}.`
    : `Nothing has been edited, so all ${rows} that already have a wage structure will be re-dated to ${month} — a new version each.`
}

export function BulkWagePage() {
  const navigate = useNavigate()
  const form = useBulkWageForm()

  // Saving the grid writes the wage structures; History is the read-only screen.
  const { canView, canManage } = useResourceAccess(PERMISSIONS.bulkWage)

  const changedCount = form.dirtyRows.size

  return (
    <>
      <PageHeader
        title="Bulk Update Wage"
        description="Set the wage structure for every designation of a company against one effective month."
        actions={
          <>
            {/*
              The read-only way to ask the same question this screen answers by
              overwriting: what has each designation actually been paid, month by
              month. It sits before Discard Changes because it takes nothing back
              — it only opens the history in its own screen.
            */}
            {canView && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/hr/bulk-wage/history' })}
              >
                <History className="size-4" />
                History
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={form.reload}
              disabled={form.isLoading || form.isSaving || changedCount === 0}
            >
              <RotateCcw className="size-4" />
              Discard Changes
            </Button>
            {canManage && (
              <Button
                type="button"
                size="sm"
                onClick={form.askSaveAll}
                disabled={form.isSaving || !form.canSaveAll}
                title={saveAllHint(changedCount)}
              >
                <Save className="size-4" />
                {form.isSaving
                  ? 'Saving…'
                  : `Save All${changedCount ? ` (${changedCount})` : ''}`}
              </Button>
            )}
          </>
        }
      />

      <BulkWageToolbar control={form.control} monthBounds={form.monthBounds} />

      <div className="rounded-xl border border-border">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Designation Wage Structure
              </h3>
              <p className="text-xs text-muted-foreground">
                One row per designation, opened on what it is paid today. Edit the cells
                you need, then save every changed row at the month above.
              </p>
            </div>
          </div>
        </div>

        <GridBody form={form} />

        {/* ── Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {form.designations.length}{' '}
            {form.designations.length === 1 ? 'designation' : 'designations'} —{' '}
            <span className="font-medium text-primary">{changedCount} changed</span>
            {changedCount === 0 && form.canSaveAll && (
              <span className="text-muted-foreground">
                {' '}
                · Save All re-dates every configured row to the month above
              </span>
            )}
          </p>
          {canManage && (
            <Button
              type="button"
              size="sm"
              onClick={form.askSaveAll}
              disabled={form.isSaving || !form.canSaveAll}
              title={saveAllHint(changedCount)}
            >
              <Save className="size-4" />
              {form.isSaving ? 'Saving…' : 'Save All'}
            </Button>
          )}
        </div>
      </div>

      {/*
        Save All asks first — it writes a wage version across the payroll in one
        transaction, against a month picked once at the top of the screen, and
        there's nothing on here that takes it back.
      */}
      <ConfirmDialog
        open={form.saveConfirmOpen}
        onOpenChange={form.setSaveConfirmOpen}
        onConfirm={form.confirmSaveAll}
        icon={Save}
        title="Save the wage grid?"
        description={saveAllConfirmation(
          changedCount,
          form.saveCount,
          form.effectiveFrom,
        )}
        confirmLabel="Save All"
        cancelLabel="Cancel"
        loading={form.isSaving}
      />
    </>
  )
}

/** The grid, or what stands in for it while there's nothing to show. */
function GridBody({ form }: { form: ReturnType<typeof useBulkWageForm> }) {
  /* An owner signs in with no company until one is picked for the session. */
  if (form.companyId === null) {
    return (
      <EmptyState
        title="No company selected"
        description="Select a company for this session to load its designations and their wage structures."
      />
    )
  }
  if (form.isLoading) {
    return (
      <p className="px-4 py-10 text-center text-xs text-muted-foreground">
        Loading the wage grid…
      </p>
    )
  }
  if (form.isError) {
    return (
      <p className="px-4 py-10 text-center text-xs text-destructive">
        {form.error instanceof Error
          ? form.error.message
          : "Couldn't load the wage grid."}
      </p>
    )
  }
  if (form.designations.length === 0) {
    return (
      <EmptyState
        title="No designations yet"
        description="This company has no designations to configure. Add them under Master → Designation first."
      />
    )
  }

  /*
    Flush against the card — the grid brings its own gridlines and a pinned
    header, so padding here would only float it off the edges and read as a
    second frame inside the first.
  */
  return (
    <BulkWageGrid
      designations={form.designations}
      heads={form.heads}
      control={form.control}
      register={form.register}
      dirtyRows={form.dirtyRows}
      changeSalaryType={form.changeSalaryType}
      changeWorkingDayCalculationType={form.changeWorkingDayCalculationType}
    />
  )
}
