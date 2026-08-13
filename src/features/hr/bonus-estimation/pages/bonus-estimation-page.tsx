import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarRange, Filter, Gift, ListTree, Save } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { GridAmountInput } from '@/components/common/wage-grid-fields'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { getApiErrorMessage } from '@/lib/api-error'
import { amountLabel, formatAmount } from '@/lib/currency'
import {
  BONUS_PAGE_SIZE,
  BONUS_PAGE_SIZE_OPTIONS,
  calculationFieldColumnLabel,
  calculationFieldLabel,
  formatIsoMonth,
} from '../constants'
import { clampPercentText } from '../lib/bonus-mappers'
import { useBonusScope } from '../hooks/use-bonus-scope'
import { useBonusEstimateList } from '../hooks/use-bonus-estimate-list'
import { useSavedBonusList } from '../hooks/use-saved-bonus-list'
import { BonusEstimateControls } from '../components/bonus-estimate-controls'
import { BonusEstimationToolbar } from '../components/bonus-estimation-toolbar'
import { SavedBonusMonthsDialog } from '../components/saved-bonus-months-dialog'
import type { BonusEstimateRow, SavedBonusRow } from '../types'

/**
 * Bonus Estimation — what a bonus over a range of months would cost, and what has
 * been committed for it.
 *
 * Two endpoints behind one range. **Estimate & Save** sums every processed month
 * per employee, multiplies the chosen base by a percentage and commits the ticked
 * lines; **Saved Bonus** reads back what was committed. Both read PROCESSED months
 * only — someone the register never priced has no figure to be a percentage of, so
 * they appear on neither, which is Calculate Salary's question and not this
 * screen's.
 *
 * Three things about the figures are worth knowing before they are declared:
 *
 * - **One percentage is a different amount per row.** Each row's base is its own,
 *   which is why this is a table of amounts rather than one figure and a headcount.
 * - **The amount is what gets saved, not the percentage.** The API trusts it and
 *   never recomputes it, so a row whose base was never priced can still be paid a
 *   bonus keyed by hand.
 * - **Advance bonus is never netted off.** It is the BONUS pay component already
 *   paid inside the range, shown beside the base because whether it offsets the
 *   declaration is the payer's decision, not this screen's arithmetic.
 *
 * The save apportions each employee's one amount across their processed months in
 * proportion to that month's base. A month already carrying a bonus is skipped
 * rather than overwritten and its share is *not* redistributed, so a save can land
 * short — which is reported rather than hidden behind the 201.
 */
export function BonusEstimationPage() {
  const scope = useBonusScope()

  const estimate = useBonusEstimateList({
    filters: scope.filters,
    calculationField: scope.calculationField,
    active: scope.view === 'estimate',
  })
  const saved = useSavedBonusList({
    filters: scope.filters,
    active: scope.view === 'saved',
  })

  /** The percentage in the toolbar box — spread across rows on demand. */
  const [percent, setPercent] = useState('')

  /*
    What may be keyed and saved. `canManage` is `create || update`, not `create`
    alone: committing a bonus is a create, but the catalog groups this resource
    with the reports, and a role carrying only `update` on it would otherwise get
    a table of figures it could look at and nothing else. The percentage and
    amount boxes, the selection column and Save Bonus are one right — there is no
    point keying an amount that can't be committed.
  */
  const { canManage } = useResourceAccess(PERMISSIONS.bonusEstimation)
  const canSave = canManage && scope.view === 'estimate'

  const estimating = scope.view === 'estimate'
  const view = estimating ? estimate : saved

  const estimateColumns = useMemo<ColumnDef<BonusEstimateRow>[]>(
    () => [
      // Selection exists only to save, so it goes with the permission.
      ...(canSave
        ? [
            {
              id: 'select',
              enableSorting: false,
              meta: { className: 'w-px whitespace-nowrap' },
              header: () => (
                <Checkbox
                  checked={estimate.allSelected}
                  onChange={estimate.toggleAll}
                  disabled={estimate.rows.length === 0}
                  aria-label="Select every employee on this page"
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={estimate.selected.has(row.original.employeeId)}
                  onChange={() => estimate.toggleRow(row.original.employeeId)}
                  aria-label={`Select ${row.original.employeeName}`}
                />
              ),
            } satisfies ColumnDef<BonusEstimateRow>,
          ]
        : []),
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {estimate.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'employee',
        header: 'Employee',
        enableSorting: false,
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.employeeName || '—'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {row.original.employeeCode && (
                <span className="font-mono">{row.original.employeeCode}</span>
              )}
              {row.original.employeeCode && row.original.designationName && ' · '}
              {row.original.designationName}
            </p>
          </div>
        ),
      },
      {
        id: 'base',
        header: calculationFieldColumnLabel(scope.calculationField),
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => {
          const base = estimate.baseOf(row.original)
          return (
            <div>
              <p className="text-sm text-foreground">{formatAmount(base)}</p>
              {/* How many months this line sums — a range of twelve where only
                  three were processed is a very different figure. */}
              <p className="text-[11px] text-muted-foreground">
                over {row.original.monthsProcessed}{' '}
                {row.original.monthsProcessed === 1 ? 'month' : 'months'}
              </p>
            </div>
          )
        },
      },
      {
        id: 'advanceBonus',
        header: amountLabel('Advance Bonus'),
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) =>
          row.original.advanceBonus > 0 ? (
            <span className="text-sm text-amber-600 dark:text-amber-500">
              {formatAmount(row.original.advanceBonus)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'percentage',
        header: 'Bonus (%)',
        enableSorting: false,
        meta: { className: 'w-28 whitespace-nowrap' },
        cell: ({ row }) => {
          const draft = estimate.draftOf(row.original.employeeId)
          if (!canSave) {
            return draft.percentage ? (
              <span className="text-sm tabular-nums">{draft.percentage}%</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          return (
            <GridAmountInput
              value={draft.percentage}
              onChange={(event) =>
                estimate.setPercentage(row.original, event.target.value)
              }
              placeholder="0"
              aria-label={`Bonus percentage for ${row.original.employeeName}`}
            />
          )
        },
      },
      {
        id: 'amount',
        header: amountLabel('Amount'),
        enableSorting: false,
        meta: { className: 'w-32 whitespace-nowrap' },
        cell: ({ row }) => {
          const draft = estimate.draftOf(row.original.employeeId)
          if (!canSave) {
            return draft.amount ? (
              <span className="text-sm font-semibold tabular-nums text-primary">
                {formatAmount(Number(draft.amount) || 0)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          return (
            <GridAmountInput
              value={draft.amount}
              onChange={(event) => estimate.setAmount(row.original, event.target.value)}
              placeholder="0"
              aria-label={`Bonus amount for ${row.original.employeeName}`}
              /* Keyable even where the base is zero — that is the case manual
                 entry exists for, and the API trusts the amount it is sent. */
            />
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      canSave,
      scope.calculationField,
      estimate.offset,
      estimate.rows,
      estimate.selected,
      estimate.allSelected,
      estimate.draftOf,
      estimate.baseOf,
    ],
  )

  const savedColumns = useMemo<ColumnDef<SavedBonusRow>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {saved.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'employee',
        header: 'Employee',
        enableSorting: false,
        meta: { className: 'min-w-56' },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.employeeName || '—'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {row.original.employeeCode && (
                <span className="font-mono">{row.original.employeeCode}</span>
              )}
              {row.original.employeeCode && row.original.departmentName && ' · '}
              {row.original.departmentName}
            </p>
          </div>
        ),
      },
      {
        id: 'totalBonus',
        header: amountLabel('Total Bonus'),
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            {formatAmount(row.original.totalBonus)}
          </span>
        ),
      },
      {
        id: 'advanceBonus',
        header: amountLabel('Advance Bonus'),
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) =>
          row.original.advanceBonus > 0 ? (
            <span className="text-sm text-amber-600 dark:text-amber-500">
              {formatAmount(row.original.advanceBonus)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'months',
        header: 'Months',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          /* The months come back whole with the employee, so this opens a panel
             rather than making a second request. */
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => saved.openMonths(row.original.employeeId)}
            className="h-7 gap-1.5 text-xs"
          >
            <ListTree className="size-3.5" />
            {row.original.months.length}{' '}
            {row.original.months.length === 1 ? 'month' : 'months'}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved.offset, saved.openMonths],
  )

  if (view.isForbidden) return <Forbidden description={view.forbiddenMessage} />

  const rangeLabel = scope.scope
    ? `${formatIsoMonth(scope.scope.from)} — ${formatIsoMonth(scope.scope.to)}`
    : ''

  return (
    <div>
      <PageHeader
        title="Bonus Estimation"
        description="What a bonus over a range of months would cost, employee by employee — and the bonuses already committed for it."
      />

      <BonusEstimationToolbar
        view={scope.view}
        onViewChange={scope.setView}
        from={scope.draft.from}
        to={scope.draft.to}
        onFromChange={scope.changeFrom}
        onToChange={scope.changeTo}
        monthBounds={scope.monthBounds}
        toMinDate={scope.toMinDate}
        departmentId={scope.draft.departmentId}
        departmentOptions={scope.departmentChoices}
        departmentsLoading={scope.departmentsLoading}
        onDepartmentChange={scope.changeDepartment}
        calculationField={scope.calculationField}
        onCalculationFieldChange={scope.setCalculationField}
        onLoad={scope.load}
        canLoad={scope.canLoad}
        hasPendingScope={scope.hasPendingScope}
        isLoading={view.isFetching}
        scopeLabel={
          rangeLabel &&
          `${rangeLabel}${
            scope.departmentName ? ` · ${scope.departmentName}` : ' · every department'
          }${estimating ? ` · ${calculationFieldLabel(scope.calculationField)}` : ''}`
        }
      />

      {scope.companyId === null ? (
        <EmptyState
          title="No company selected"
          description="Select a company for this session to estimate its bonus."
        />
      ) : !scope.hasLoaded ? (
        <EmptyState
          icon={Filter}
          title="Choose a range"
          description="Pick the months the bonus covers above, then press Load. Everything is read off months already processed, so a month the register hasn't priced shows nothing here."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {getApiErrorMessage(
            view.error,
            estimating
              ? "Couldn't load the bonus estimate."
              : "Couldn't load the saved bonuses.",
          )}
        </p>
      ) : estimating ? (
        <DataTable
          columns={estimateColumns}
          data={estimate.rows}
          isLoading={estimate.isLoading}
          itemName="employees"
          pageSize={BONUS_PAGE_SIZE}
          pageSizeOptions={BONUS_PAGE_SIZE_OPTIONS}
          serverPagination
          limit={estimate.limit}
          offset={estimate.offset}
          total={estimate.total}
          onPaginationChange={estimate.onPaginationChange}
          toolbar={
            <BonusEstimateControls
              search={estimate.search}
              onSearchChange={estimate.setSearch}
              percent={percent}
              /* Held to the API's 0–100 as it is typed — a slipped keystroke
                 lands on 100 rather than spreading `10000%` across the table. */
              onPercentChange={(value) => setPercent(clampPercentText(value))}
              onApplyAll={() => estimate.applyPercentTo(estimate.rows, percent)}
              onApplySelected={() =>
                estimate.applyPercentTo(estimate.selectedRows, percent)
              }
              selectedCount={estimate.selectedCount}
              payableCount={estimate.payableCount}
              payableTotal={estimate.payableTotal}
              unkeyedCount={estimate.unkeyedCount}
              onClearSelection={estimate.clearSelection}
              hasDrafts={estimate.hasDrafts}
              onClearDrafts={estimate.clearDrafts}
              canSave={canSave}
              onSave={estimate.askSave}
              isSaving={estimate.isSaving}
              tooMany={estimate.tooMany}
            />
          }
          emptyState={
            <EmptyState
              icon={CalendarRange}
              title={estimate.search ? 'No matching employees' : 'Nothing to estimate'}
              description={
                estimate.search
                  ? 'Try a different name, employee code or mobile number.'
                  : `No salary has been processed for ${rangeLabel} in this scope. A bonus is a percentage of what was actually paid, so there is nothing to figure one on — process the months from Calculate Salary first.`
              }
            />
          }
        />
      ) : (
        <DataTable
          columns={savedColumns}
          data={saved.rows}
          isLoading={saved.isLoading}
          itemName="employees"
          pageSize={BONUS_PAGE_SIZE}
          pageSizeOptions={BONUS_PAGE_SIZE_OPTIONS}
          serverPagination
          limit={saved.limit}
          offset={saved.offset}
          total={saved.total}
          onPaginationChange={saved.onPaginationChange}
          searchValue={saved.search}
          onSearchChange={saved.setSearch}
          searchPlaceholder="Search employee by name, code or mobile…"
          emptyState={
            <EmptyState
              icon={Gift}
              title={saved.search ? 'No matching employees' : 'No bonus saved yet'}
              description={
                saved.search
                  ? 'Try a different name, employee code or mobile number.'
                  : `Nothing has been committed for ${rangeLabel} in this scope. Estimate it on the Estimate & Save side, tick the employees and save.`
              }
            />
          }
        />
      )}

      {/* Money being declared against closed months, so it is confirmed once —
          with the figure, the headcount and the base it was figured on, which is
          what the save records against every month it writes. */}
      <ConfirmDialog
        open={estimate.confirmOpen}
        onOpenChange={estimate.setConfirmOpen}
        onConfirm={estimate.confirmSave}
        keepOpenOnConfirm
        loading={estimate.isSaving}
        icon={Save}
        title="Save this bonus?"
        confirmLabel={estimate.isSaving ? 'Saving…' : 'Save Bonus'}
        description={
          <>
            {formatAmount(estimate.payableTotal)} across {estimate.payableCount}{' '}
            {estimate.payableCount === 1 ? 'employee' : 'employees'} for {rangeLabel},
            figured on {calculationFieldLabel(scope.calculationField)}. Each employee's
            amount is split over the months they were paid in, in proportion to that
            month's base.
            <span className="mt-2 block">
              A month that already carries a bonus is left as it is rather than
              overwritten, so a line may save short — you'll be told which.
            </span>
            {estimate.unkeyedCount > 0 && (
              <span className="mt-2 block text-amber-600 dark:text-amber-500">
                {estimate.unkeyedCount} ticked{' '}
                {estimate.unkeyedCount === 1 ? 'employee has' : 'employees have'} no amount
                keyed and {estimate.unkeyedCount === 1 ? 'is' : 'are'} not included.
              </span>
            )}
          </>
        }
      />

      <SavedBonusMonthsDialog
        employee={saved.openEmployee}
        onClose={saved.closeMonths}
      />
    </div>
  )
}
