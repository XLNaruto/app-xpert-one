import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarRange, Eye, IndianRupee, Trash2, Wallet } from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useCan } from '@/features/permissions'
import { formatAmount } from '@/lib/currency'
import { cn, formatDate } from '@/lib/utils'
import {
  SALARY_VIEW_PAGE_SIZE,
  SALARY_VIEW_PAGE_SIZE_OPTIONS,
  salaryMonthName,
} from '../constants'
import { useSalaryViewList } from '../hooks/use-salary-view-list'
import { SalaryViewEmployeeCell } from '../components/salary-view-employee-cell'
import { SalaryViewLongGrid } from '../components/salary-view-long-grid'
import { SalaryViewModeTabs } from '../components/salary-view-mode-tabs'
import { SalaryViewPager } from '../components/salary-view-pager'
import { SalaryViewToolbar } from '../components/salary-view-toolbar'
import type { SalaryViewRow } from '../types'

/**
 * View Salary — the month already processed.
 *
 * The other end of Calculate Salary: that screen prices a month and commits it,
 * this one reads back what was committed. Nothing here computes pay — every
 * figure is the one stored against the salary, which is the point, because
 * payroll may have overridden any of it at salary time and no override is
 * recoverable from the designation's wage structure afterwards.
 *
 * Two densities over the same rows. **Short view** is the list: who, the days,
 * and the four figures that answer most questions. **Long view** is the matrix —
 * every allowance and deduction head as its own column, pivoted on the report's
 * own head union so the columns hold still from row to row.
 *
 * The one write on the screen is the discard, which soft-deletes so the month can
 * be run again. A paid salary is frozen — the API refuses it — so paid rows have
 * no checkbox rather than being offered and then rejected.
 */
export function SalaryViewListPage() {
  const view = useSalaryViewList()

  // Reading the month back is this screen's own permission; discarding a salary
  // undoes what Calculate Salary committed, so the selection column, the row's
  // Delete and the toolbar's bulk Delete all hang off that screen's delete code.
  const { can } = useCan()
  const canDiscard = can(`${PERMISSIONS.calculateSalary}:delete`)

  const columns = useMemo<ColumnDef<SalaryViewRow>[]>(
    () => [
      // Selection exists only to discard, so it goes with the permission.
      ...(canDiscard
        ? [
            {
              id: 'select',
              enableSorting: false,
              meta: { className: 'w-px whitespace-nowrap' },
              header: () => (
                <Checkbox
                  checked={view.allSelected}
                  onChange={view.toggleAll}
                  disabled={view.selectableCount === 0}
                  aria-label="Select every discardable salary on this page"
                />
              ),
              cell: ({ row }) =>
                /* A paid salary can't be discarded, so it isn't selectable. */
                row.original.isPaid ? null : (
                  <Checkbox
                    checked={view.selected.has(row.original.salaryId)}
                    onChange={() => view.toggleRow(row.original.salaryId)}
                    aria-label={`Select ${row.original.employeeName}`}
                  />
                ),
            } satisfies ColumnDef<SalaryViewRow>,
          ]
        : []),
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {view.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <RowActionsMenu
            actions={[
              { label: 'View', icon: Eye, onSelect: () => view.goToDetail(row.original) },
              ...(canDiscard
                ? [
                    {
                      label: 'Delete',
                      icon: Trash2,
                      destructive: true,
                      /* Runs the toolbar's discard against this row alone — one
                         confirmation and one request, not a second delete flow. */
                      onSelect: () => view.askDiscardRow(row.original),
                      /* A paid salary is frozen: the API refuses to discard it. */
                      disabled: row.original.isPaid,
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
      {
        id: 'employee',
        header: 'Employee Name',
        enableSorting: false,
        meta: { className: 'min-w-64' },
        cell: ({ row }) => <SalaryViewEmployeeCell row={row.original} />,
      },
      {
        id: 'employeeCode',
        header: 'Emp Code',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.employeeCode || '—'}</span>
        ),
      },
      {
        id: 'paymentStatus',
        header: 'Payment Status',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge variant={row.original.isPaid ? 'success' : 'warning'}>
            {row.original.isPaid ? 'Paid' : 'Unpaid'}
          </Badge>
        ),
      },
      {
        id: 'period',
        header: 'Month / Year',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => `${salaryMonthName(row.original.month)} ${row.original.year}`,
      },
      {
        id: 'workingDays',
        header: 'Working Days',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-center' },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.workingDays}</span>
        ),
      },
      {
        id: 'presentDays',
        header: 'Present Days',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-center' },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.presentDays}</span>
        ),
      },
      {
        id: 'basicPay',
        header: 'Basic Pay',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => formatAmount(row.original.basicPay),
      },
      {
        id: 'grossPay',
        header: 'Gross Pay',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => formatAmount(row.original.grossPay),
      },
      {
        id: 'totalDeduction',
        header: 'Deduction',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => (
          <span className="text-destructive">
            {formatAmount(row.original.totalDeduction)}
          </span>
        ),
      },
      {
        id: 'netPay',
        header: 'Net Pay',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => (
          <span className="font-semibold text-success">
            {formatAmount(row.original.netPay)}
          </span>
        ),
      },
      {
        id: 'paymentDate',
        header: 'Payment Date',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.paymentDate ? (
            formatDate(row.original.paymentDate)
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.offset, view.selected, view.allSelected, view.selectableCount, canDiscard],
  )

  if (view.isForbidden) return <Forbidden description={view.forbiddenMessage} />

  const toolbar = (
    <SalaryViewToolbar
      search={view.search}
      onSearchChange={view.setSearch}
      month={view.monthValue}
      monthBounds={view.monthBounds}
      onMonthChange={view.changePeriod}
      departmentId={view.departmentId}
      departmentOptions={view.departmentChoices}
      departmentsLoading={view.departmentsLoading}
      onDepartmentChange={view.changeDepartment}
      // Without the delete permission there is no selection to act on.
      selectedCount={canDiscard ? view.selectedCount : 0}
      onDiscard={() => view.setDiscardOpen(true)}
      isDiscarding={view.isDiscarding}
    />
  )

  const emptyState = (
    <EmptyState
      icon={Wallet}
      title={view.search ? 'No matching salaries' : 'Nothing processed for this month'}
      description={
        view.search
          ? 'Try a different name or employee code.'
          : `No salary has been processed for ${salaryMonthName(view.month)} ${view.year}${
              view.departmentId ? ' in this department' : ''
            }. Run the month from Calculate Salary first.`
      }
    />
  )

  return (
    <div>
      <PageHeader
        title="View Salary"
        description="The month already processed — the pay as it was committed, per employee."
        actions={<SalaryViewModeTabs mode={view.mode} onChange={view.setMode} />}
      />

      {/* The cycle the report was read for. Printed rather than derived from the
          month: with a cycle start day set, the period is not the calendar
          month, and that difference is what decides which attendance was paid. */}
      {view.period && (
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarRange className="size-3.5" />
          Cycle {formatDate(view.period.from)} — {formatDate(view.period.to)}
          {view.totals && (
            <>
              <span className="mx-1 text-border">|</span>
              <IndianRupee className="size-3.5" />
              Net on this page{' '}
              <span className="font-semibold text-success">
                {formatAmount(view.totals.netPay)}
              </span>
            </>
          )}
        </p>
      )}

      {view.companyId === null ? (
        <EmptyState
          title="No company selected"
          description="Select a company for this session to read its payroll."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {view.error instanceof Error
            ? view.error.message
            : "Couldn't load the processed salaries."}
        </p>
      ) : view.mode === 'short' ? (
        <DataTable
          columns={columns}
          data={view.rows}
          isLoading={view.isLoading}
          toolbar={toolbar}
          itemName="salaries"
          pageSize={SALARY_VIEW_PAGE_SIZE}
          pageSizeOptions={SALARY_VIEW_PAGE_SIZE_OPTIONS}
          serverPagination
          limit={view.limit}
          offset={view.offset}
          total={view.total}
          onPaginationChange={view.onPaginationChange}
          emptyState={emptyState}
        />
      ) : (
        /* The matrix brings its own gridlines, spanning header and total row, so
           it sits flush against the card — padding here would read as a second
           frame around it. */
        <div className="w-full space-y-4">
          {toolbar}
          <div className="rounded-xl border border-border/50 bg-card shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px]">
            <div
              className={cn(
                'overflow-hidden',
                view.rows.length ? 'rounded-t-xl' : 'rounded-xl',
              )}
            >
              {view.isLoading ? (
                <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                  Loading the processed salaries…
                </p>
              ) : view.rows.length === 0 ? (
                emptyState
              ) : (
                <SalaryViewLongGrid
                  rows={view.rows}
                  allowanceHeads={view.allowanceHeads}
                  deductionHeads={view.deductionHeads}
                  onRowClick={view.goToDetail}
                />
              )}
            </div>
            {view.rows.length > 0 && (
              <div className="border-t border-border px-4 py-3">
                <SalaryViewPager
                  limit={view.limit}
                  offset={view.offset}
                  total={view.total}
                  onPaginationChange={view.onPaginationChange}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={view.discardOpen}
        onOpenChange={view.setDiscardOpen}
        variant="destructive"
        icon={Trash2}
        title="Discard the processed salary?"
        description={`${view.selectedCount} processed ${
          view.selectedCount === 1 ? 'salary' : 'salaries'
        } for ${salaryMonthName(view.month)} ${
          view.year
        } will be discarded so the month can be processed again. A salary already paid is refused and kept.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={view.isDiscarding}
        keepOpenOnConfirm
        onConfirm={view.confirmDiscard}
      />
    </div>
  )
}
