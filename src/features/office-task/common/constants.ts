import type { ComboboxOption } from '@/components/ui/combobox'
import type { Priority, TaskStatus, Verdict } from './types'

/** How each status reads and which badge tone carries it. */
export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; tone: 'warning' | 'default' | 'amber' | 'success' | 'destructive' }
> = {
  pending: { label: 'Pending', tone: 'warning' },
  in_progress: { label: 'In Progress', tone: 'default' },
  pending_approval: { label: 'Awaiting Approval', tone: 'amber' },
  completed: { label: 'Completed', tone: 'success' },
  missed: { label: 'Missed', tone: 'destructive' },
}

export const TASK_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'All statuses', value: 'all' },
  ...(Object.keys(TASK_STATUS_META) as TaskStatus[]).map((s) => ({
    label: TASK_STATUS_META[s].label,
    value: s,
  })),
]

export const VERDICT_META: Record<Verdict, { label: string; tone: 'success' | 'destructive' }> = {
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'destructive' },
}

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-destructive/12 text-destructive' },
  medium: { label: 'Medium', className: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
}

export const PRIORITY_OPTIONS: ComboboxOption[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

export const PICK_BY_OPTIONS: ComboboxOption[] = [
  { label: 'Designation', value: 'designation' },
  { label: 'Role', value: 'role' },
]

/** Times-per-day bounds for an SOP item and a project task's slots. */
export const FREQUENCY_MIN = 1
export const FREQUENCY_MAX = 24

/**
 * Proof files a hand-in may carry. More is a SHAPE failure (400) on the API —
 * the picker is capped here, the 400 is only a backstop.
 */
export const MAX_PROOF_FILES = 5

/** The content types `POST /user/uploads/office-task-proof` signs for. */
export const PROOF_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

