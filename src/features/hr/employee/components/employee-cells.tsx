import { Eye, Pencil, UserRoundX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { EMPLOYEE_PROGRESS_STEPS } from '../constants'
import { stepProgress } from '../lib/employee-mappers'
import type { Employee } from '../types'

/** The list's presentational cells, kept out of the page's column definitions. */

/**
 * Photo, name and employee code in one cell — the column a reader scans by. The
 * code sits under the name because it's what tells two people with the same name
 * apart, and it's how the API's search matches too.
 */
export function EmployeeIdentityCell({ employee }: { employee: Employee }) {
  const label = [employee.prefix, employee.name].filter(Boolean).join(' ')
  const photoUrl = useMediaUrl(employee.photo)

  return (
    <div className="flex items-center gap-3">
      <ImageWithFallback
        src={photoUrl}
        alt={employee.name || 'Employee photo'}
        wrapperClassName="size-9 shrink-0 rounded-full ring-1 ring-border"
        className="object-cover"
      />
      <div className="leading-tight">
        <span className="block font-medium text-foreground">{label || '—'}</span>
        <span className="block text-xs text-muted-foreground">
          {employee.code || 'No code yet'}
        </span>
      </div>
    </div>
  )
}

/**
 * How far through the wizard this employee is — `n/7`, tinted by how complete the
 * record is. Only the seven counted steps are in the total: transfer history and
 * leave management are ongoing registers, not steps you finish.
 */
export function EmployeeProgressCell({ employee }: { employee: Employee }) {
  const { completed, total, percent } = stepProgress(
    employee.completedSteps,
    EMPLOYEE_PROGRESS_STEPS.map((step) => step.flag),
  )

  const variant = completed === total ? 'success' : completed > 0 ? 'warning' : 'secondary'
  const missing = EMPLOYEE_PROGRESS_STEPS.filter(
    (step) => !employee.completedSteps[step.flag],
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">
          <Badge variant={variant}>
            {completed}/{total} · {percent}%
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 font-normal">
        {missing.length === 0
          ? 'Every step is complete.'
          : `Still to do: ${missing.map((step) => step.tab).join(', ')}`}
      </TooltipContent>
    </Tooltip>
  )
}

/** A soft-tinted square icon button, matching the shared `TableRowActions` look. */
function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
}: {
  label: string
  icon: typeof Eye
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'grid size-8 place-items-center rounded-lg transition-colors',
            disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
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
 * The list's row actions.
 *
 * View and Edit are the two ways into the record; Deactivate closes the open
 * posting, which is what takes an employee off strength.
 *
 * There is no Delete: the API exposes no `DELETE /user/employees/:id`, and
 * deliberately so — payroll, attendance and leave history all reference the row,
 * so removing it would orphan them. Deactivate is the endpoint that models the
 * intent.
 *
 * Deactivate is always offered here, because a list row can't tell whether a
 * posting is open — `GET /user/employees` doesn't send `service`. The dialog reads
 * the one record and refuses there if the employee has already left, which is
 * better than greying out an action on data the row doesn't have.
 */
export function EmployeeRowActions({
  onView,
  onEdit,
  onDeactivate,
}: {
  onView: () => void
  onEdit: () => void
  onDeactivate: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <ActionButton
        label="View"
        icon={Eye}
        onClick={onView}
        className="bg-muted text-muted-foreground hover:bg-muted-foreground/20"
      />
      <ActionButton
        label="Edit"
        icon={Pencil}
        onClick={onEdit}
        className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
      />
      <ActionButton
        label="Deactivate"
        icon={UserRoundX}
        onClick={onDeactivate}
        className="bg-destructive/10 text-destructive hover:bg-destructive/20"
      />
    </div>
  )
}
