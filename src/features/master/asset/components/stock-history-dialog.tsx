import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { History, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { encryptParams } from '@/lib/crypto'
import { formatDateTime } from '@/lib/utils'
import { STOCK_MOVEMENT_SORT } from '../constants'
import { formatStockChange, stockReasonMeta } from '../lib/asset-variant-mappers'
import { useStockHistory } from '../hooks/use-stock-history'
import type { StockMovement, StockTarget } from '../types'

interface StockHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Whose ledger this is — an asset's (its own lines and its variants') or one variant's. */
  target: StockTarget | null
  /**
   * Which screen this ledger was opened on. It rides along on the employee link
   * so that record's Back retraces the actual way in — the list page and the
   * detail page both host this dialog, and returning from the list to a detail
   * screen the reader never opened is a jump, not a way back.
   */
  openedFrom: 'asset-list' | 'asset-detail'
}

/**
 * A stock ledger — every line that moved the balance, newest first.
 *
 * An asset's history spans both levels: its own lines and its variants', in one
 * ledger, so an asset that later grew variants keeps the story of what it did
 * before them. A variant's history is only its own.
 *
 * `balanceAfter` is what each line left behind, so the table needs no running
 * total of its own; the balance and this history can never disagree, because
 * they're written in the same transaction.
 */
export function StockHistoryDialog({
  open,
  onOpenChange,
  target,
  openedFrom,
}: StockHistoryDialogProps) {
  const navigate = useNavigate()
  const {
    rows,
    total,
    limit,
    offset,
    onPaginationChange,
    sorting,
    onSortingChange,
    isLoading,
    isError,
    error,
    showVariantColumn,
    variantNameOf,
  } = useStockHistory(target, open)

  const columns = useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        id: STOCK_MOVEMENT_SORT.createdAt,
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="When" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div>
            <p className="text-sm text-foreground">{formatDateTime(row.original.createdAt)}</p>
            {/* Null when a super-admin or an employee wrote the line. */}
            <p className="text-xs text-muted-foreground">
              {row.original.createdBy || 'System'}
            </p>
          </div>
        ),
      },
      // Only on an asset's ledger, which mixes its own lines with its variants'.
      ...(showVariantColumn
        ? [
            {
              id: 'variant',
              enableSorting: false,
              header: 'Variant',
              meta: { className: 'whitespace-nowrap' },
              cell: ({ row }) => {
                const name = variantNameOf(row.original.variantId, row.original.variantName)
                return name ? (
                  <span className="text-sm text-foreground">{name}</span>
                ) : (
                  // A line about the asset itself names no variant.
                  <span className="text-sm text-muted-foreground">—</span>
                )
              },
            } satisfies ColumnDef<StockMovement>,
          ]
        : []),
      {
        id: 'reason',
        enableSorting: false,
        header: 'Reason',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { label, variant } = stockReasonMeta(
            row.original.reason,
            row.original.change,
          )
          return <Badge variant={variant}>{label}</Badge>
        },
      },
      {
        // The column id is the API's own field name, so a sort click reaches
        // `?sort=change` untranslated.
        id: STOCK_MOVEMENT_SORT.change,
        accessorKey: 'change',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Change" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span
            className={
              row.original.change < 0
                ? 'font-medium text-destructive'
                : 'font-medium text-success'
            }
          >
            {formatStockChange(row.original.change)}
          </span>
        ),
      },
      {
        id: 'balanceAfter',
        enableSorting: false,
        // What the line left on the shelf — the endpoint calls it
        // `balance_after`, the screen calls it Stock.
        header: 'Stock',
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.balanceAfter}</span>
        ),
      },
      {
        id: 'note',
        enableSorting: false,
        header: 'Note',
        // A note runs to 500 characters. Pinned to one truncated line, it keeps
        // every row the same height and the rest of the ledger readable — the
        // full text is a hover away.
        meta: { className: 'w-64 max-w-64' },
        cell: ({ row }) => {
          // Only handout-driven lines name an employee; the other three reasons
          // always leave it null.
          const { note, employeeId, employeeName } = row.original

          // Nothing to say and nobody to name — one dash, not a dash beside a
          // link. The two stack when both are there: the note is the line's
          // story and the person is who it went to, not a second half of it.
          if (!note && employeeId === null) {
            return <span className="text-sm text-muted-foreground">—</span>
          }

          return (
            <div className="flex max-w-64 flex-col items-start gap-1">
              {note ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="max-w-full cursor-default truncate text-sm text-muted-foreground">
                      {note}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs whitespace-pre-wrap font-normal">
                    {note}
                  </TooltipContent>
                </Tooltip>
              ) : null}

              {employeeId !== null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="link"
                      className="h-auto max-w-full justify-start gap-1 p-0 text-xs font-medium"
                      onClick={() =>
                        navigate({
                          to: '/hr/employee/detail',
                          search: {
                            // `from` is what keeps the way back honest: the
                            // record is being opened FROM this ledger, so its
                            // Back returns to the screen the ledger was opened
                            // on rather than dropping into the employee list,
                            // which was never on the way.
                            data: encryptParams({
                              id: employeeId,
                              from: openedFrom,
                              assetId: row.original.assetId ?? target?.assetId,
                            }),
                          },
                        })
                      }
                    >
                      <UserRound className="size-3 shrink-0" />
                      <span className="truncate">{employeeName || 'Employee'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Open {employeeName || 'this employee'}'s record
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
      },
    ],
    [navigate, openedFrom, showVariantColumn, target?.assetId, variantNameOf],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="pr-10">
            {target ? `Stock History — ${target.name}` : 'Stock History'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error instanceof Error ? error.message : "Couldn't load the stock history."}
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              isLoading={isLoading}
              itemName="movements"
              pageSizeOptions={[5, 10, 25, 50]}
              maxHeight="60vh"
              serverPagination
              limit={limit}
              offset={offset}
              total={total}
              onPaginationChange={onPaginationChange}
              manualSorting
              sorting={sorting}
              onSortingChange={onSortingChange}
              emptyState={
                <EmptyState
                  icon={History}
                  title="No stock movements yet"
                  description="Refills, write-offs and handouts all land here."
                />
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
