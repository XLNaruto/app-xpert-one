import { IndianRupee, RotateCcw, Save, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { PERMISSIONS, useCan } from '@/features/permissions'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatMonth } from '@/features/master/designation'
import { useSalaryForm } from '../hooks/use-salary-form'
import { SalaryToolbar } from '../components/salary-toolbar'
import { SalaryRegisterControls } from '../components/salary-register-controls'
import { SalaryRegisterGrid } from '../components/salary-register-grid'
import { SalaryImportDialog } from '../components/salary-import-dialog'
import { SalaryImportResultDialog } from '../components/salary-import-result-dialog'
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
 * - **The client decides the pay.** `bulk-save` takes the full snapshot a row is
 *   priced at and stores every figure as sent, because payroll may override any of
 *   it at salary time and no override survives in the designation's wage structure
 *   afterwards. So the grid computes — days in, pay out — and an allowance can be
 *   double-clicked and typed over.
 * - **It is read one designation at a time.** The allowance and deduction columns
 *   are the designation's own heads, and it is that designation's wage structure
 *   that says which of them are percentages; payroll is set up per designation, so
 *   the register is too, and nothing loads until a title is picked.
 *
 * The processed side of the register is not a receipt: a month already run can be
 * revised by saving it again, or discarded so it can be run afresh. Only a *paid*
 * month is frozen — the money has left, and rewriting the figures behind a payment
 * would leave that payment describing amounts that no longer exist.
 */
export function SalaryPage() {
  const form = useSalaryForm()

  // Processing a month is a create/update on this screen; discarding one is its
  // delete, and the sheet route has its own `import` code.
  const { can, canSome } = useCan()
  const canProcess = canSome(
    `${PERMISSIONS.calculateSalary}:create`,
    `${PERMISSIONS.calculateSalary}:update`,
  )
  const canDiscard = can(`${PERMISSIONS.calculateSalary}:delete`)
  const canImport = can(`${PERMISSIONS.calculateSalary}:import`)

  const selectedCount = form.selected.size

  return (
    <>
      <PageHeader
        title="Calculate Salary"
        description="Process the month for a designation — set the days, adjust the heads that need it, and save the month."
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
            {canDiscard && form.status === 'complete' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Disabled buttons swallow pointer events, so the span around
                      each one carries the hover. */}
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={form.askDiscard}
                      disabled={form.isDiscarding || form.discardCount === 0}
                    >
                      <Trash2 className="size-4" />
                      {form.isDiscarding
                        ? 'Discarding…'
                        : `Discard${form.discardCount ? ` (${form.discardCount})` : ''}`}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-pretty font-normal">
                  Discard the selected processed salaries so the month can be run again
                </TooltipContent>
              </Tooltip>
            )}
            {canProcess && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      size="sm"
                      onClick={form.askSave}
                      disabled={!form.ready || form.isSaving || form.saveCount === 0}
                    >
                      <Save className="size-4" />
                      {form.isSaving
                        ? 'Saving…'
                        : `Save Salary${form.saveCount ? ` (${form.saveCount})` : ''}`}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-pretty font-normal">
                  {selectedCount > 0
                    ? `Process the ${selectedCount} selected ${selectedCount === 1 ? 'row' : 'rows'}`
                    : 'Process every row on this page'}
                </TooltipContent>
              </Tooltip>
            )}
            {/*
              The other way to process a month: a filled-in sheet instead of the
              grid. It sits after Save because it does the same thing — it is the
              bulk route to it, not a different screen.
            */}
            {canImport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setImportOpen(true)}
                      disabled={form.isImporting}
                    >
                      <Upload className="size-4" />
                      Import
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-pretty font-normal">
                  Import a month from a filled-in salary sheet
                </TooltipContent>
              </Tooltip>
            )}
          </>
        }
      />

      <SalaryToolbar
        /* The pickers show the *draft* — what will be run, not what is on
           screen — and only Calculate Salary moves one to the other. */
        designationId={form.draftDesignationId}
        designationOptions={form.designationOptions}
        designationsLoading={form.designationsLoading}
        onDesignationChange={form.changeDesignation}
        month={form.draftMonth}
        monthBounds={form.monthBounds}
        onMonthChange={form.changeMonth}
        onCalculate={form.calculate}
        hasPendingFilters={form.hasPendingFilters}
        isCalculating={form.isLoading || form.isFetching}
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
                Present days and overtime hours are yours to set; the pay follows them.
                Double-click an allowance or deduction to type an amount over it — the
                head is then fixed for that row and saved exactly as typed.
              </p>
            </div>
          </div>
          {/* Which side of the register, and who on it — both re-reads of the
              register already chosen, so they sit with the rows they act on
              rather than up in the toolbar that decides which register to run. */}
          <div className="flex flex-wrap items-center gap-3">
            <SalaryRegisterControls
              status={form.status}
              onStatusChange={form.changeStatus}
              search={form.search}
              onSearchChange={form.setSearch}
            />
            {/* The count stays where it has always been — the far right of the
                header, read after the controls rather than in front of them. */}
            {selectedCount > 0 && (
              <p className="text-xs font-medium text-primary">
                {selectedCount} {selectedCount === 1 ? 'row' : 'rows'} selected
              </p>
            )}
          </div>
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
        The import is the same write from a spreadsheet: the sheet goes to storage
        on a presigned PUT, the API prices and saves every row in one transaction,
        and the report it answers with is shown as it came back — a sheet can be
        part created, part skipped and part refused, which no toast can say.
      */}
      <SalaryImportDialog
        open={form.importOpen}
        onOpenChange={form.setImportOpen}
        onImport={form.runImport}
        isImporting={form.isImporting}
        onDownloadTemplate={form.downloadTemplate}
        isDownloadingTemplate={form.isDownloadingTemplate}
        monthLabel={formatMonth(form.month)}
      />

      <SalaryImportResultDialog
        result={form.importResult}
        onClose={form.clearImportResult}
      />

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
        } will be processed for ${formatMonth(
          form.month,
        )} — each saved at the figures shown on its row, including any amount typed over a head. A row already processed is revised, and a paid month is left alone.`}
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
      setValue={form.setValue}
      headConfigs={form.headConfigs}
      statutoryIds={form.statutoryIds}
      rates={form.rates}
      periodMonth={form.periodMonth}
      dirtyRows={form.dirtyRows}
      selected={form.selected}
      onToggleRow={form.toggleRow}
      onToggleAll={form.toggleAll}
      selectableCount={form.selectableCount}
    />
  )
}
