import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** A soft-tinted square icon button for inline table row actions. */
function ActionButton({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string
  icon: typeof Eye
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

/**
 * Inline edit/view/delete row actions as soft-tinted icon buttons. Pass only
 * the handlers you need — each button renders only when its callback is given.
 */
export function TableRowActions({
  onEdit,
  onView,
  onDelete,
}: {
  onEdit?: () => void
  onView?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <ActionButton
          label="Edit"
          icon={Pencil}
          onClick={onEdit}
          className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
        />
      )}
      {onView && (
        <ActionButton
          label="View"
          icon={Eye}
          onClick={onView}
          className="bg-muted text-muted-foreground hover:bg-muted-foreground/20"
        />
      )}
      {onDelete && (
        <ActionButton
          label="Delete"
          icon={Trash2}
          onClick={onDelete}
          className="bg-destructive/10 text-destructive hover:bg-destructive/20"
        />
      )}
    </div>
  )
}
