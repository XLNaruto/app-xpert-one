import type { TaskStatus } from '@/features/office-task/common'
import type { MyTaskFilter } from '../types'

/** Which statuses each chip over the table stands for. */
export const FILTER_STATUSES: Record<Exclude<MyTaskFilter, 'all'>, TaskStatus[]> = {
  todo: ['pending'],
  in_hand: ['in_progress'],
  done: ['pending_approval', 'completed'],
  missed: ['missed'],
}

export const FILTER_LABELS: Record<MyTaskFilter, string> = {
  all: 'All',
  todo: 'Not Started',
  in_hand: 'In Progress',
  done: 'Done',
  missed: 'Missed',
}

export function matchesFilter(status: TaskStatus, filter: MyTaskFilter): boolean {
  return filter === 'all' || FILTER_STATUSES[filter].includes(status)
}

/** Chip counts for a day's rows. */
export function countByFilter(statuses: TaskStatus[]): Record<MyTaskFilter, number> {
  return {
    all: statuses.length,
    todo: statuses.filter((s) => matchesFilter(s, 'todo')).length,
    in_hand: statuses.filter((s) => matchesFilter(s, 'in_hand')).length,
    done: statuses.filter((s) => matchesFilter(s, 'done')).length,
    missed: statuses.filter((s) => matchesFilter(s, 'missed')).length,
  }
}

/** Open = not handed in and not missed — the tab badge. */
export const isOpen = (status: TaskStatus) => status === 'pending' || status === 'in_progress'
