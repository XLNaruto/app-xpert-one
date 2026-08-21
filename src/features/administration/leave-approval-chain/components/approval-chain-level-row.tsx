import { AlertTriangle, ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { LeaveApprovalLevel } from '../types'

/**
 * One level of the chain — its position, the role that holds it, and what that
 * role actually covers.
 *
 * The coverage is two different statements and the row keeps them apart.
 * `userCount: 0` is a WARNING: nobody holds this role anywhere, so the chain
 * silently skips the level. `companiesCovered` short of the account's company
 * count is NOT a warning — that is exactly why there is a level below it.
 *
 * Reordering works by drag AND by the two arrows: dragging is faster, but the
 * arrows are what make the order reachable from a keyboard, and the order is the
 * whole meaning of the screen.
 */
export function ApprovalChainLevelRow({
  index,
  roleName,
  level,
  companyCount,
  total,
  canUpdate,
  isDragging,
  onMove,
  onRemove,
  dragHandlers,
}: {
  index: number
  roleName: string
  /** The server's counts for this role, absent on a level just added. */
  level: LeaveApprovalLevel | undefined
  companyCount: number
  total: number
  canUpdate: boolean
  isDragging: boolean
  onMove: (from: number, to: number) => void
  onRemove: () => void
  dragHandlers: {
    draggable: boolean
    onDragStart: () => void
    onDragOver: (event: React.DragEvent) => void
    onDrop: () => void
    onDragEnd: () => void
  }
}) {
  const isDeadLink = level !== undefined && level.userCount === 0
  const isPartial =
    level !== undefined && !isDeadLink && level.companiesCovered < companyCount

  return (
    <li
      {...dragHandlers}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-opacity',
        isDragging && 'opacity-40',
      )}
    >
      {canUpdate && (
        <GripVertical
          className="size-4 shrink-0 cursor-grab text-muted-foreground"
          aria-hidden="true"
        />
      )}

      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
        {index + 1}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {roleName}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {isDeadLink ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help">
                <Badge variant="warning">
                  <AlertTriangle className="mr-1 size-3" />
                  No users
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty font-normal">
              Nobody in the account holds a role by this name, so the chain skips
              this level silently. Either give somebody the role or take the level
              out.
            </TooltipContent>
          </Tooltip>
        ) : (
          level !== undefined && (
            <Badge variant="secondary">
              {level.userCount} user{level.userCount === 1 ? '' : 's'}
            </Badge>
          )
        )}

        {level !== undefined && !isDeadLink && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help">
                <Badge variant={isPartial ? 'secondary' : 'success'}>
                  {level.companiesCovered} / {companyCount} companies
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty font-normal">
              {isPartial
                ? "Covering fewer than every company isn't a problem — the levels below answer for the rest, and the account owner answers for whatever none of them reach."
                : 'This level reaches every company in the account.'}
            </TooltipContent>
          </Tooltip>
        )}

        {level === undefined && <Badge variant="secondary">Unsaved</Badge>}
      </div>

      {canUpdate && (
        <div className="flex items-center gap-1">
          <IconButton
            label="Move up"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <ChevronUp className="size-4" />
          </IconButton>
          <IconButton
            label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <ChevronDown className="size-4" />
          </IconButton>
          <IconButton label="Remove level" onClick={onRemove} destructive>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      )}
    </li>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'grid size-8 place-items-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40',
            destructive
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'bg-accent text-muted-foreground hover:text-foreground',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
