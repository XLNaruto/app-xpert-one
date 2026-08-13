import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  BanknoteArrowUp,
  CalendarRange,
  CircleAlert,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatAmount } from '@/lib/currency'
import { formatDate } from '@/lib/utils'
import {
  PAY_SALARY_PAGE_SIZE,
  PAY_SALARY_PAGE_SIZE_OPTIONS,
  payMonthName,
} from '../constants'
import { useDownloadBankTransferSheet } from '../api/use-pay-salary-mutations'
import { usePaySalaryList } from '../hooks/use-pay-salary-list'
import { BankTransferDialog } from '../components/bank-transfer-dialog'
import { PaySalaryControls } from '../components/pay-salary-controls'
import { PaySalaryDialog } from '../components/pay-salary-dialog'
import { PaySalarySummary } from '../components/pay-salary-summary'
import { PaySalaryToolbar } from '../components/pay-salary-toolbar'
import type { PaySalaryRow } from '../types'

/**
 * Pay Salary — what is outstanding for the period, and what already went out.
 *
 * The last step of payroll. Calculate Salary prices a month, View Salary reads
 * back what was committed, and this screen settles it: ticking who is being paid
 * and recording ONE batch — a date, a mode, its proof documents and the salaries
 * it covers. A period may be paid in as many batches as payroll likes, which is
 * what the history screen counts.
 *
 * Both tabs read *salary rows*, not the roster: someone the month was never run
 * for is on neither, because there is no figure to pay them. Who is still
 * unpriced is Calculate Salary's question.
 *
 * Nothing here computes anything. Every figure is the one stored on the salary,
 * and paying only stamps `is_paid`, the date and the batch onto it — which is
 * also why a paid salary can no longer be revised or discarded, and why the paid
 * tab has no selection column.
 */
export function PaySalaryPage() {
  const view = usePaySalaryList()
  const exportSheet = useDownloadBankTransferSheet()

  // Recording a payment is a *create* on this resource — it writes a batch —
  // so the selection column, the row's Pay and the toolbar's Pay Salary all
  // hang off `create` rather than `update`.
  const { canCreate } = useResourceAccess(PERMISSIONS.paySalary)
  const canPay = canCreate && view.status === 'unpaid'

  const columns = useMemo<ColumnDef<PaySalaryRow>[]>(
    () => [
      // Selection exists only to pay, so it goes with the permission — and only
      // on the unpaid tab, since the endpoint refuses an already-paid salary.
      ...(canPay
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
                  aria-label="Select every payable salary on this page"
                />
              ),
              cell: ({ row }) =>
                row.original.isPaid ? null : (
                  <Checkbox
                    checked={view.selected.has(row.original.salaryId)}
                    onChange={() => view.toggleRow(row.original)}
                    aria-label={`Select ${row.original.employeeName}`}
                  />
                ),
            } satisfies ColumnDef<PaySalaryRow>,
          ]
        : []),
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {view.offset + row.index + 1}
          </span>
        ),
      },
      ...(canPay
        ? [
            {
              id: 'actions',
              header: 'Action',
              enableSorting: false,
              meta: { className: 'w-px whitespace-nowrap' },
              cell: ({ row }) => (
                <RowActionsMenu
                  actions={[
                    {
                      label: 'Pay',
                      icon: BanknoteArrowUp,
                      /* Opens the toolbar's own dialog on this row alone — one
                         confirmation and one batch, not a second pay flow. */
                      onSelect: () => view.askPayRow(row.original),
                      disabled: row.original.isPaid,
                    },
                  ]}
                />
              ),
            } satisfies ColumnDef<PaySalaryRow>,
          ]
        : []),
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
            {row.original.employeeCode && (
              <p className="font-mono text-[11px] text-muted-foreground">
                {row.original.employeeCode}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'mobile',
        header: 'Mobile',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.mobile || '—',
      },
      {
        id: 'grossPay',
        header: 'Gross Pay',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => formatAmount(row.original.grossPay),
      },
      {
        id: 'netPay',
        header: 'Net Pay',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right tabular-nums' },
        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            {formatAmount(row.original.netPay)}
          </span>
        ),
      },
      // The two tabs answer different questions about the same row, so the last
      // column differs: outstanding rows show their state, settled ones show
      // when the money actually left.
      view.status === 'unpaid'
        ? {
            id: 'status',
            header: 'Salary Record',
            enableSorting: false,
            meta: { className: 'whitespace-nowrap' },
            cell: () => <Badge variant="warning">Pending</Badge>,
          }
        : {
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
    [
      view.offset,
      view.selected,
      view.allSelected,
      view.selectableCount,
      view.status,
      canPay,
    ],
  )

  if (view.isForbidden) return <Forbidden description={view.forbiddenMessage} />

  const unpaid = view.status === 'unpaid'
  const periodLabel = `${payMonthName(view.scope.month)} ${view.scope.year}`

  const toolbar = (
    <PaySalaryControls
      status={view.status}
      onStatusChange={view.changeStatus}
      search={view.search}
      onSearchChange={view.setSearch}
      selectedCount={view.selectedCount}
      selectedTotal={view.selectedTotal}
      onClearSelection={view.clearSelection}
      canPay={canPay}
      onPay={view.openPayDialog}
      onExport={() => view.setExportOpen(true)}
      isExporting={exportSheet.isPending}
      onHistory={view.goToHistory}
    />
  )

  return (
    <div>
      <PageHeader
        title="Pay Salary"
        description="What the month still owes, and what has already gone out — settled one payment batch at a time."
      />

      <PaySalaryToolbar
        month={view.monthValue}
        monthBounds={view.monthBounds}
        onMonthChange={view.changePeriod}
        departmentId={view.departmentId}
        departmentOptions={view.departmentChoices}
        departmentsLoading={view.departmentsLoading}
        onDepartmentChange={view.changeDepartment}
        onLoad={view.loadList}
        hasPendingScope={view.hasPendingScope}
        isLoading={view.isFetching}
        scopeLabel={`${periodLabel}${
          view.departmentName ? ` · ${view.departmentName}` : ' · every department'
        }`}
      />

      {view.companyId === null ? (
        <EmptyState
          title="No company selected"
          description="Select a company for this session to settle its payroll."
        />
      ) : view.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {getApiErrorMessage(view.error, "Couldn't load the salary payments.")}
        </p>
      ) : (
        <>
          {/* The counters cover the whole filter, not the page — which is the
              only way they can say how much of the month is left. */}
          {view.totals && (
            <PaySalarySummary
              tiles={[
                {
                  label: 'Total Employees',
                  value: String(view.totals.totalEmployees),
                  icon: UsersRound,
                },
                {
                  label: unpaid ? 'Total Outstanding' : 'Total Net Paid',
                  value: formatAmount(view.totals.totalNetPay),
                  // No rupee icon here — formatAmount already prints the ₹.
                  icon: unpaid ? CircleAlert : Wallet,
                  tone: unpaid ? 'warning' : 'success',
                },
                {
                  label: 'Period',
                  value: periodLabel,
                  icon: CalendarRange,
                },
              ]}
            />
          )}

          <DataTable
            columns={columns}
            data={view.rows}
            isLoading={view.isLoading}
            toolbar={toolbar}
            itemName="salaries"
            pageSize={PAY_SALARY_PAGE_SIZE}
            pageSizeOptions={PAY_SALARY_PAGE_SIZE_OPTIONS}
            serverPagination
            limit={view.limit}
            offset={view.offset}
            total={view.total}
            onPaginationChange={view.onPaginationChange}
            emptyState={
              <EmptyState
                icon={unpaid ? CircleAlert : Wallet}
                title={
                  view.search
                    ? 'No matching employees'
                    : unpaid
                      ? 'Nothing outstanding'
                      : 'Nothing paid yet'
                }
                description={
                  view.search
                    ? 'Try a different name, employee code or mobile number.'
                    : unpaid
                      ? `Every processed salary for ${periodLabel} has been paid. A month that was never run shows nothing here — process it from Calculate Salary first.`
                      : `No salary has been paid for ${periodLabel} yet. Record one from the Unpaid Salary tab.`
                }
              />
            }
          />
        </>
      )}

      <PaySalaryDialog
        open={view.payOpen}
        onOpenChange={view.setPayOpen}
        companyId={view.companyId}
        month={view.scope.month}
        year={view.scope.year}
        departmentId={view.scope.departmentId}
        rows={view.selectedRows}
        onPaid={view.onPaid}
      />

      <BankTransferDialog
        open={view.exportOpen}
        onOpenChange={view.setExportOpen}
        month={view.scope.month}
        year={view.scope.year}
        departmentLabel={view.departmentName}
        isDownloading={exportSheet.isPending}
        onDownload={({ paymentMode, debitAccountNumber }) =>
          exportSheet.mutate(
            {
              companyId: view.companyId ?? 0,
              month: view.scope.month,
              year: view.scope.year,
              departmentId: view.scope.departmentId,
              paymentMode,
              debitAccountNumber,
            },
            {
              onSuccess: () => view.setExportOpen(false),
              onError: (error) =>
                toast.error(
                  getApiErrorMessage(
                    error,
                    "Couldn't download the bank transfer sheet.",
                  ),
                ),
            },
          )
        }
      />
    </div>
  )
}
