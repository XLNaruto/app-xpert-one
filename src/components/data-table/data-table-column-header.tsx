import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

/**
 * Sortable header cell. Use inside a column def's `header`:
 *   header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        // A <button> resets text-transform and weight, so carry the <th>'s look over —
        // otherwise sortable headers read differently from plain ones.
        '-ml-3 h-8 cursor-pointer font-semibold uppercase tracking-wider text-inherit hover:bg-transparent hover:text-inherit',
        className,
      )}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      <span>{title}</span>
      {sorted === 'desc' ? (
        <ArrowDown className="ml-2 size-4" />
      ) : sorted === 'asc' ? (
        <ArrowUp className="ml-2 size-4" />
      ) : (
        <ChevronsUpDown className="ml-2 size-4 opacity-50" />
      )}
    </Button>
  )
}
