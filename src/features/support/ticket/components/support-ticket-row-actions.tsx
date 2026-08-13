import { CheckCheck, RotateCcw } from 'lucide-react'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * A row's actions on the support list — view and edit, plus the two transitions
 * this side of the desk owns.
 *
 * Deliberately NOT a delete: the API has none, because the platform's SLA and
 * severity reports are counted over these rows. "Close" files a resolved ticket
 * away and reads as an acceptance, which is why it's a tick rather than a bin.
 */
export function SupportTicketRowActions({
  onView,
  onEdit,
  onReopen,
  onClose,
}: {
  onView: () => void
  onEdit?: () => void
  onReopen?: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <TableRowActions onView={onView} onEdit={onEdit} />
      {onReopen && (
        <IconAction
          label="Reopen"
          icon={RotateCcw}
          onClick={onReopen}
          className="bg-warning/12 text-warning hover:bg-warning/20"
        />
      )}
      {onClose && (
        <IconAction
          label="Close ticket"
          icon={CheckCheck}
          onClick={onClose}
          className="bg-success/12 text-success hover:bg-success/20"
        />
      )}
    </div>
  )
}

/** Matches the soft-tinted square buttons `<TableRowActions>` renders. */
function IconAction({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string
  icon: typeof RotateCcw
  onClick: () => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'grid size-8 cursor-pointer place-items-center rounded-lg transition-colors',
            className,
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
