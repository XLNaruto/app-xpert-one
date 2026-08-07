import { IndianRupee, RotateCcw, Save, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { formatMonth } from '@/features/master/designation'
import { useSalaryForm } from '../hooks/use-salary-form'
import { SalaryToolbar } from '../components/salary-toolbar'
import { SalaryRegisterGrid } from '../components/salary-register-grid'
import { SalaryPager } from '../components/salary-pager'

/**
 * Calculate Salary — the payroll screen.
 *
 * One designation's people against one month: the attendance the month would be
 * paid on, the wage structure in force for the title, its allowance and deduction
 * heads, and the pay that would be saved if the row were committed as it stands.
 * Save Salary commits the run.
 *
 * Two things shape the screen, both from the API:
 *
 * - **The server computes the pay.** A row sends the days it is paid for and
 *   nothing else — no gross, no net, no per-head amount — so the figures always
 *   come from the wage structure in force at the cycle's close. A screen left open
 *   through a wage revision cannot write pay from the structure it was opened
 *   with, which is why every money column here is read-only.
 * - **It is read one designation at a time.** The allowance and deduction columns
 *   are the designation's own heads; payroll is set up per designation, so the
 *   register is too, and nothing loads until a title is picked.
 *
 * The processed side of the register is not a receipt: a month already run can be
 * revised by saving it again, or discarded so it can be run afresh. Only a *paid*
 * month is frozen — the money has left, and rewriting the figures behind a payment
 * would leave that payment describing amounts that no longer exist.
 */
export function SalaryPage() {
  const form = useSalaryForm()

  const selectedCount = form.selected.size

  return (
    <>
      <PageHeader
        title="Calculate Salary"
        description="Process the month for a designation — days in, pay computed and saved by the server."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={form.reload}
              disabled={!form.ready || form.isLoading || form.isSaving}
            >
              <RotateCcw className="size-4" />
              Reload
            </Button>
            {/*
              Discarding is what makes a month re-runnable, so it belongs beside
              Save rather than in a row menu — it is done to a selection, like the
              save is.
            */}
            {form.status === 'complete' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={form.askDiscard}
                disabled={form.isDiscarding || form.discardCount === 0}
                title="Discard the selected processed salaries so the month can be run again"
              >
                <Trash2 className="size-4" />
                {form.isDiscarding
                  ? 'Discarding…'
                  : `Discard${form.discardCount ? ` (${form.discardCount})` : ''}`}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={form.askSave}
              disabled={!form.ready || form.isSaving || form.saveCount === 0}
              title={
                selectedCount > 0
                  ? `Process the ${selectedCount} selected ${selectedCount === 1 ? 'row' : 'rows'}`
                  : 'Process every row on this page'
              }
            >
              <Save className="size-4" />
              {form.isSaving
                ? 'Saving…'
                : `Save Salary${form.saveCount ? ` (${form.saveCount})` : ''}`}
            </Button>
          </>
        }
      />

      <SalaryToolbar
        designationId={form.designationId}
        designationOptions={form.designationOptions}
        designationsLoading={form.designationsLoading}
        onDesignationChange={form.changeDesignation}
        month={form.month}
        monthBounds={form.monthBounds}
        onMonthChange={form.changeMonth}
        status={form.status}
        onStatusChange={form.changeStatus}
        search={form.search}
        onSearchChange={form.setSearch}
        period={form.period}
        companyTotals={form.companyTotals}
      />

      <div className="rounded-xl border border-border">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Salary Register — {formatMonth(form.month)}
              </h3>
              <p className="text-xs text-muted-foreground">
                Days are yours to set; every amount is computed by the server from the
                wage structure in force. Edit a row and its figures are recomputed when
                you save.
              </p>
            </div>
          </div>
          {selectedCount > 0 && (
            <p className="text-xs font-medium text-primary">
              {selectedCount} {selectedCount === 1 ? 'row' : 'rows'} selected
            </p>
          )}
        </div>

        <RegisterBody form={form} />

        {/* ── Footer ── */}
        <div className="border-t border-border px-4 py-3">
          <SalaryPager
            limit={form.limit}
            offset={form.offset}
            total={form.total}
            onPaginationChange={form.onPaginationChange}
          />
        </div>
      </div>

      {/*
        Both writes ask first. A save processes a month across a page of people in
        one transaction, and a discard removes salaries that were already
        processed — neither is taken back from this screen.
      */}
      <ConfirmDialog
        open={form.saveConfirmOpen}
        onOpenChange={form.setSaveConfirmOpen}
        onConfirm={form.confirmSave}
        icon={Save}
        title="Process the salary?"
        description={`${form.saveCount} ${
          form.saveCount === 1 ? 'employee' : 'employees'
        } will be processed for ${formatMonth(form.month)}. The server computes the pay from the wage structure in force; a row already processed is revised, and a paid month is left alone.`}
        confirmLabel="Save Salary"
        cancelLabel="Cancel"
        loading={form.isSaving}
      />

      <ConfirmDialog
        open={form.discardConfirmOpen}
        onOpenChange={form.setDiscardConfirmOpen}
        onConfirm={form.confirmDiscard}
        icon={Trash2}
        variant="destructive"
        title="Discard the processed salary?"
        description={`${form.discardCount} processed ${
          form.discardCount === 1 ? 'salary' : 'salaries'
        } for ${formatMonth(
          form.month,
        )} will be discarded so the month can be processed again. A salary already paid is refused and kept.`}
        confirmLabel="Discard"
        cancelLabel="Cancel"
        loading={form.isDiscarding}
      />
    </>
  )
}

/** The register, or what stands in for it while there's nothing to show. */
function RegisterBody({ form }: { form: ReturnType<typeof useSalaryForm> }) {
  /* An owner signs in with no company until one is picked for the session. */
  if (form.companyId === null) {
    return (
      <EmptyState
        title="No company selected"
        description="Select a company for this session to run its payroll."
      />
    )
  }
  if (form.designationId === null) {
    return (
      <EmptyState
        title="Pick a designation"
        description="The register is read one designation at a time — its wage structure and its allowance / deduction heads are what the columns are built from."
      />
    )
  }
  if (form.isLoading) {
    return (
      <p className="px-4 py-10 text-center text-xs text-muted-foreground">
        Loading the salary register…
      </p>
    )
  }
  if (form.isError) {
    return (
      <p className="px-4 py-10 text-center text-xs text-destructive">
        {form.error instanceof Error
          ? form.error.message
          : "Couldn't load the salary register."}
      </p>
    )
  }
  if (form.rows.length === 0) {
    return form.status === 'pending' ? (
      <EmptyState
        title="Nothing left to process"
        description="No posting of this designation is open in the period without a salary for it. The processed tab has the month that was run."
      />
    ) : (
      <EmptyState
        title="Nothing processed yet"
        description="This designation's month hasn't been run. Switch to “To Process” to run it."
      />
    )
  }

  /* Flush against the card — the grid brings its own gridlines, a pinned header
     and a pinned total row, so padding here would read as a second frame. */
  return (
    <SalaryRegisterGrid
      rows={form.rows}
      heads={form.heads}
      control={form.control}
      register={form.register}
      dirtyRows={form.dirtyRows}
      selected={form.selected}
      onToggleRow={form.toggleRow}
      onToggleAll={form.toggleAll}
      selectableCount={form.selectableCount}
      totals={form.totals}
    />
  )
}
