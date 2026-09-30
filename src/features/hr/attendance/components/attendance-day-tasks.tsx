import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { TaskStatusBadge, formatDuration, useNow } from '@/features/office-task/common'
import {
  isTaskRunning,
  taskSubtitle,
  taskTimeline,
} from '../lib/attendance-mappers'
import type { AttendanceDayTask } from '../types'

const clock = (iso: string) => format(parseISO(iso), 'hh:mm a')

/**
 * "Tasks worked" under the day's punches — the day's Office Task work as one
 * timesheet: a row per Start → Stop stretch, in the order it was done.
 *
 * Every instant is rendered as the server sent it: stretches arrive already
 * clipped to the day in the business zone, so nothing here clips, shifts or
 * re-buckets. The header total ticks forward from the server's `task_seconds`,
 * counted from when the response arrived (`servedAt`).
 */
export function AttendanceDayTasks({
  tasks,
  taskSeconds,
  servedAt,
  canOpenTask,
  onOpenTask,
}: {
  tasks: AttendanceDayTask[]
  /** The server's day total — ticked forward, never re-summed. */
  taskSeconds: number
  servedAt: number
  canOpenTask: (task: AttendanceDayTask) => boolean
  onOpenTask: (task: AttendanceDayTask) => void
}) {
  const running = tasks.filter(isTaskRunning).length
  // Only tick while something on screen is actually running.
  const now = useNow(running > 0)
  const elapsed = running > 0 ? Math.max(0, Math.floor((now - servedAt) / 1000)) : 0
  const total = taskSeconds + running * elapsed

  const rows = useMemo(() => taskTimeline(tasks), [tasks])

  return (
    <section className="space-y-2">
      <h3 className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold">
        <ListChecks className="size-4 text-primary" />
        Tasks worked
        <span className="font-normal text-muted-foreground">
          · {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
        {total > 0 && (
          <span className="font-normal tabular-nums text-muted-foreground">
            · {formatDuration(total)}
          </span>
        )}
      </h3>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No tracked work on this day.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          {/* Fixed height: the header stays put and the rows scroll under it. */}
          <Table maxHeight="20rem">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40%] min-w-56 px-3">Task</TableHead>
                <TableHead className="px-3">Type</TableHead>
                <TableHead className="px-3">From Time</TableHead>
                <TableHead className="px-3">To Time</TableHead>
                <TableHead className="px-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const live = row.start !== '' && row.end === null
                return (
                  <TableRow key={row.key} className={cn(live && 'bg-primary/5')}>
                    <TableCell className="px-3 py-2">
                      <TaskName
                        task={row.task}
                        canOpen={canOpenTask(row.task)}
                        onOpen={() => onOpenTask(row.task)}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {row.task.kind === 'sop' ? 'SOP' : 'Project'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {row.start ? clock(row.start) : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {!row.start ? (
                        '—'
                      ) : row.end ? (
                        clock(row.end)
                      ) : (
                        <Badge variant="secondary">Running</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <TaskStatusBadge status={row.task.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

/** The task's name (a link where its screen is reachable) and its subtitle. */
function TaskName({
  task,
  canOpen,
  onOpen,
}: {
  task: AttendanceDayTask
  canOpen: boolean
  onOpen: () => void
}) {
  const subtitle = taskSubtitle(task)
  const where = task.kind === 'sop' ? 'Open the SOP assignment' : 'Open the project task'

  return (
    <div className="min-w-0">
      <div className="break-words">
        {canOpen ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpen}
                className="cursor-pointer text-left font-medium break-words whitespace-normal text-primary hover:underline"
              >
                {task.task}
              </button>
            </TooltipTrigger>
            <TooltipContent>{where}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="font-medium break-words">{task.task}</span>
        )}
      </div>
      {subtitle && <p className="mt-0.5 text-xs break-words text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
