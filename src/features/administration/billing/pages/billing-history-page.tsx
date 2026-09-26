import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Download, Loader2, ReceiptText } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Forbidden } from '@/features/error'
import { BILLING_LABELS } from '../constants'
import {
  isCurrentPurchase,
  subscriptionStatusLabel,
  subscriptionStatusVariant,
} from '../lib/billing-mappers'
import { usePurchaseHistory } from '../hooks/use-purchase-history'
import type { PurchasedPlan } from '../types'

/**
 * Purchase History — every plan the account has bought, newest first, at the
 * price it was charged, with the invoice PDF for each paid term.
 *
 * Read-only. Reached from the billing screen's header, and gated by the same
 * `billing` permission as that screen (the parent route's `beforeLoad`).
 */
export function BillingHistoryPage() {
  const history = usePurchaseHistory()
  const { downloadInvoice, downloadingId } = history

  
  /**
   * The purchase history. The endpoint neither searches nor sorts (it is always
   * newest first), so no column is sortable.
   */
  const columns = useMemo<ColumnDef<PurchasedPlan>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {history.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'plan',
        header: BILLING_LABELS.plan,
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {row.original.planName ?? `Plan #${row.original.planId}`}
            </span>
            {isCurrentPurchase(row.original.status) && (
              <Badge variant="outline">Current</Badge>
            )}
          </div>
        ),
      },
      {
        id: 'term',
        header: 'Term',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (row.original.isYearly ? 'Yearly' : 'Monthly'),
      },
      {
        id: 'period',
        header: 'Period',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { currentPeriodStart: start, currentPeriodEnd: end } = row.original
          if (!start && !end) return <span className="text-muted-foreground">—</span>
          return (
            <span className="text-sm">
              {start ? formatDate(start) : '—'} – {end ? formatDate(end) : '—'}
            </span>
          )
        },
      },
      {
        // What was actually CHARGED — the payment's amount, never the plan's
        // price fields, which a trial or an admin-granted plan still carries.
        id: 'amountPaid',
        header: 'Amount Paid',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap text-right' },
        cell: ({ row }) =>
          row.original.payment ? (
            <span className="font-semibold text-foreground">
              {formatCurrency(row.original.payment.amount)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'purchasedAt',
        header: 'Purchased On',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => formatDate(row.original.purchasedAt),
      },
      {
        id: 'status',
        header: BILLING_LABELS.status,
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge variant={subscriptionStatusVariant(row.original.status)}>
            {subscriptionStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        // Only a paid term has an invoice (`invoiceNumber` is null exactly when
        // `payment` is) — anything else says so instead of offering a 404.
        id: 'invoice',
        header: 'Invoice',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => {
          const { invoiceNumber } = row.original
          if (!invoiceNumber) {
            return <span className="text-sm text-muted-foreground">No invoice</span>
          }
          const downloading = downloadingId === row.original.id
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={() => downloadInvoice(row.original)}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {invoiceNumber}
            </Button>
          )
        },
      },
    ],
    [history.offset, downloadInvoice, downloadingId],
  )

  if (history.isForbidden) {
    return <Forbidden description={history.forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="Purchase History"
        description="Every plan this account has bought, at the price it was charged."
        actions={
          <Button type="button" variant="outline" onClick={history.goBack}>
            <ArrowLeft className="size-4" />
            Back to Billing
          </Button>
        }
      />

      {history.isError ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-destructive">
              {getApiErrorMessage(
                history.error,
                "Couldn't load your purchase history.",
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={history.rows}
          isLoading={history.isLoading}
          itemName="purchases"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={history.limit}
          offset={history.offset}
          total={history.total}
          onPaginationChange={history.onPaginationChange}
          emptyState={
            <EmptyState
              icon={ReceiptText}
              title="No purchases yet"
              description="Plans you buy will appear here, with an invoice for each paid term."
            />
          }
        />
      )}
    </div>
  )
}
