import { Camera, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { PRIORITY_META, TASK_STATUS_META, VERDICT_META } from '../constants'
import type { Priority, TaskStatus, Verdict } from '../types'

/** A task's status pill. `paused` relabels a stopped in-progress SOP run. */
export function TaskStatusBadge({ status, paused }: { status: TaskStatus; paused?: boolean }) {
  const meta = TASK_STATUS_META[status]
  if (meta.tone === 'amber') {
    return (
      <Badge className="whitespace-nowrap border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400">
        {meta.label}
      </Badge>
    )
  }
  return (
    <Badge variant={meta.tone} className="whitespace-nowrap">
      {status === 'in_progress' && paused ? 'Paused' : meta.label}
    </Badge>
  )
}

/** The approver's answer — "Awaiting" while none has been given. */
export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <Badge className="whitespace-nowrap border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400">
        Awaiting
      </Badge>
    )
  }
  return <Badge variant={VERDICT_META[verdict].tone} className="whitespace-nowrap">{VERDICT_META[verdict].label}</Badge>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority]
  return <Badge className={cn('whitespace-nowrap border-transparent', meta.className)}>{meta.label}</Badge>
}

function RuleIcon({ icon: Icon, label }: { icon: typeof Camera; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Camera = proof photo required · shield = needs approval. "—" when neither. */
export function RuleIcons({ photo, approval }: { photo: boolean; approval: boolean }) {
  if (!photo && !approval) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-7 cursor-default items-center rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground">
            N/A
          </span>
        </TooltipTrigger>
        <TooltipContent>No photo proof or approval needed</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <div className="flex items-center gap-1">
      {photo && <RuleIcon icon={Camera} label="Photo proof required" />}
      {approval && <RuleIcon icon={ShieldCheck} label="Needs approval" />}
    </div>
  )
}
