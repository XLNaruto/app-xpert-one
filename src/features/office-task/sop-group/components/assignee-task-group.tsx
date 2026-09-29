import type { ReactNode } from 'react'
import { Controller } from 'react-hook-form'
import { ChevronDown, ChevronRight, Lock, Plus, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatDate } from '@/lib/utils'
import { frequencyLabel } from '@/features/office-task/common'
import { useAssigneeTasks } from '../hooks/use-assignee-tasks'
import { EditableCell, TruncatedText } from './editable-cell'
import type { SopGroupForm } from '../hooks/use-sop-group-form'

const cell = 'border-b border-border px-3 py-2 align-middle'
const head = 'bg-muted/20 border-b border-border px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground'

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * One employee on the Assign tab, as a card: a header (who, how many tasks,
 * + Custom task, remove), then their own task table — the group's checklist
 * (locked; it comes from Tab 1) and their custom tasks (editable, removable),
 * ending in an inline "+ Add custom task" row.
 */
export function AssigneeTaskGroup({
  f,
  index,
  expanded,
  onToggle,
}: {
  f: SopGroupForm
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const a = f.watchedAssignees[index]
  const t = useAssigneeTasks(f.form, index)
  const { custom, draft, setDraft, adding, startAdding, stopAdding, commit } = t
  const errors = f.form.formState.errors.assignees?.[index]?.customTasks
  const { register, control } = f.form

  // Someone already assigned runs the checklist copy they were given, which may
  // be older than the group's current one — show theirs, and say if it moved on.
  const checklist = a.locked ? a.heldChecklist : f.watchedItems
  const sig = (rows: typeof checklist) =>
    rows.map((t) => `${t.task.trim()}|${t.frequency}|${t.photoRequired}|${t.needsApproval}`).join('\n')
  const checklistMoved = a.locked && sig(a.heldChecklist) !== sig(f.watchedItems)
  const perDay = (rows: typeof checklist) => rows.reduce((sum, t) => sum + (Number(t?.frequency) || 0), 0)
  const taskCount = checklist.length + custom.fields.length

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-sm', a.locked && 'opacity-90')}>
      {/* The whole header toggles the card; its own buttons stop the click. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className={cn(
          'flex cursor-pointer select-none items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
          expanded && 'border-b border-border',
          a.locked ? 'bg-muted/30' : 'bg-muted/50',
        )}
      >
            <span className="grid size-6 place-items-center rounded text-muted-foreground">
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </span>
            <Avatar name={a.employeeName || '?'} className="size-7 text-[10px]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {a.employeeName || 'Employee'}
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{a.employeeCode}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {taskCount} task{taskCount === 1 ? '' : 's'} · {perDay(checklist) + perDay(a.customTasks ?? [])} / day
              </p>
            </div>
            {a.locked && <Badge variant="secondary">Already assigned</Badge>}
            {a.locked && a.effectiveFrom && (
              <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
                {formatDate(a.effectiveFrom)} → {a.effectiveTo ? formatDate(a.effectiveTo) : 'Ongoing'}
              </span>
            )}
            {checklistMoved && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Older checklist
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  The group checklist changed after this employee was assigned. They keep the checklist shown here; stop and reassign them to give them the new one.
                </TooltipContent>
              </Tooltip>
            )}
            <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {f.canSave && (
                <button
                  type="button"
                  onClick={() => {
                    if (!expanded) onToggle()
                    startAdding()
                  }}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-primary/30 bg-card px-3 text-xs font-medium text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
                >
                  <span className="grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Plus className="size-3" />
                  </span>
                  Custom Task
                </button>
              )}
              {a.locked && !a.canRemove ? (
                // Started work can't be deleted (R6) — Stop keeps the history instead.
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground">
                      <Lock className="size-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    Has already started work on this group, so they can't be removed. Stop the assignment from SOP Assignments instead.
                  </TooltipContent>
                </Tooltip>
              ) : (
                (!a.locked || f.canDelete) && (
                  <IconButton
                    label={a.locked ? 'Remove employee from this group' : 'Remove employee'}
                    onClick={() => f.removeEmployee(index)}
                    className="size-8 rounded-lg border border-destructive/60 bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/20"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                )
              )}
            </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          {/*
            Fixed layout + set widths: a cell turning into an input on double-click
            must not reflow the columns.
          */}
          <table className="w-full min-w-[1008px] table-fixed [&_tbody_tr:last-child_td]:border-b-0">
            <colgroup>
              {/* Every column has a set width (they sum to the table's min width). */}
              <col className="w-12" />
              <col className="w-64" />
              <col className="w-72" />
              <col className="w-32" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr>
                <th className={head} />
                <th className={head}>Task Name</th>
                <th className={head}>Description</th>
                <th className={head}>Times / Day</th>
                <th className={head}>Photo</th>
                <th className={head}>Approval</th>
                <th className={head}>Type</th>
              </tr>
            </thead>
            <tbody>
          {checklist.map((item, i) => (
            <tr key={`c-${i}`} className="text-sm">
              <td className={cn(cell, 'w-12 text-muted-foreground')}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="grid size-7 place-items-center">
                      <Lock className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>From the group checklist — edit it in Group Details</TooltipContent>
                </Tooltip>
              </td>
              <td className={cell}>
                <TruncatedText text={item.task} emptyText="Untitled" />
              </td>
              <td className={cn(cell, 'text-muted-foreground')}>
                <TruncatedText text={item.description} />
              </td>
              <td className={cn(cell, 'whitespace-nowrap')}>{frequencyLabel(Number(item.frequency) || 1)}</td>
              <td className={cell}>
                <Switch checked={item.photoRequired} presentational disabled />
              </td>
              <td className={cell}>
                <Switch checked={item.needsApproval} presentational disabled />
              </td>
              <td className={cell}>
                <Badge variant="outline">Checklist</Badge>
              </td>
            </tr>
          ))}

          {custom.fields.map((field, ti) => {
            const task = a.customTasks?.[ti]
            // Somebody has worked it (R4/R5): read-only for good, and never removed.
            if (task?.hasStartedWork) {
              return (
                <tr key={field.id} className="bg-violet-500/[0.04] text-sm">
                  <td className={cn(cell, 'w-12 text-muted-foreground')}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="grid size-7 place-items-center">
                          <Lock className="size-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Already started — it can't be edited or removed</TooltipContent>
                    </Tooltip>
                  </td>
                  <td className={cell}>
                    <TruncatedText text={task.task} emptyText="Untitled" />
                  </td>
                  <td className={cn(cell, 'text-muted-foreground')}>
                    <TruncatedText text={task.description} />
                  </td>
                  <td className={cn(cell, 'whitespace-nowrap')}>{frequencyLabel(Number(task.frequency) || 1)}</td>
                  <td className={cell}>
                    <Switch checked={task.photoRequired} presentational disabled />
                  </td>
                  <td className={cell}>
                    <Switch checked={task.needsApproval} presentational disabled />
                  </td>
                  <td className={cell}>
                    <Badge className="border-transparent bg-violet-500/15 text-violet-600 dark:text-violet-400">
                      Custom
                    </Badge>
                  </td>
                </tr>
              )
            }
            // A saved custom task is deleted on the server, so it needs the delete grant.
            const removable = !task?.id || f.canDelete
            return (
            <tr key={field.id} className="bg-violet-500/[0.04] text-sm">
              <td className={cn(cell, 'w-12')}>
                {removable && (
                  <IconButton
                    label="Remove custom task"
                    onClick={() => {
                      if (!f.askRemoveCustomTask(index, ti)) t.removeTask(ti)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                )}
              </td>
              <td className={cell}>
                <EditableCell
                  editing={t.isEditing(ti, 'task')}
                  text={a.customTasks?.[ti]?.task}
                  emptyText="Task name"
                  error={errors?.[ti]?.task?.message}
                  registration={register(`assignees.${index}.customTasks.${ti}.task`)}
                  onStartEdit={() => t.startEdit(ti, 'task')}
                  onFinish={() => t.finishEdit(ti, 'task')}
                  onCancel={t.cancelEdit}
                  onTab={t.tabEdit}
                />
              </td>
              <td className={cell}>
                <EditableCell
                  editing={t.isEditing(ti, 'description')}
                  text={a.customTasks?.[ti]?.description}
                  emptyText="Description"
                  error={errors?.[ti]?.description?.message}
                  registration={register(`assignees.${index}.customTasks.${ti}.description`)}
                  onStartEdit={() => t.startEdit(ti, 'description')}
                  onFinish={() => t.finishEdit(ti, 'description')}
                  onCancel={t.cancelEdit}
                  onTab={t.tabEdit}
                />
              </td>
              <td className={cell}>
                <EditableCell
                  editing={t.isEditing(ti, 'frequency')}
                  text={
                    Number(a.customTasks?.[ti]?.frequency) > 0
                      ? frequencyLabel(Number(a.customTasks[ti].frequency))
                      : a.customTasks?.[ti]?.frequency
                  }
                  emptyText="1"
                  error={errors?.[ti]?.frequency?.message}
                  registration={register(`assignees.${index}.customTasks.${ti}.frequency`)}
                  inputClassName="w-16"
                  inputMode="numeric"
                  onStartEdit={() => t.startEdit(ti, 'frequency')}
                  onFinish={() => t.finishEdit(ti, 'frequency')}
                  onCancel={t.cancelEdit}
                  onTab={t.tabEdit}
                />
              </td>
              <td className={cell}>
                <Controller
                  control={control}
                  name={`assignees.${index}.customTasks.${ti}.photoRequired`}
                  render={({ field: sw }) => (
                    <Switch checked={sw.value} onCheckedChange={sw.onChange} />
                  )}
                />
              </td>
              <td className={cell}>
                <Controller
                  control={control}
                  name={`assignees.${index}.customTasks.${ti}.needsApproval`}
                  render={({ field: sw }) => (
                    <Switch checked={sw.value} onCheckedChange={sw.onChange} />
                  )}
                />
              </td>
              <td className={cell}>
                <Badge className="border-transparent bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  Custom
                </Badge>
              </td>
            </tr>
            )
          })}

          {f.canSave && (
            <tr>
              <td className={cell} />
              {/* Sits in the Task Name column, at that column's width. */}
              <td className={cell}>
                {adding ? (
                  <Input
                    autoFocus
                    className="h-8"
                    placeholder="Task name — Enter to add"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commit()
                      }
                      if (e.key === 'Escape') stopAdding()
                    }}
                    onBlur={() => {
                      commit()
                      stopAdding()
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={startAdding}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
                  >
                    <span className="grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Plus className="size-3" />
                    </span>
                    Add custom task
                  </button>
                )}
              </td>
              <td colSpan={5} className={cell}>
                {adding && <span className="text-xs text-muted-foreground">Esc to finish</span>}
              </td>
            </tr>
          )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
