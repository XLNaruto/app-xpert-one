import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CircleCheck,
  Hourglass,
  Play,
  RotateCw,
  Send,
  ShieldCheck,
  Square,
  TrendingUp,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useElementWidth } from '@/hooks/use-element-width'
import { cn } from '@/lib/utils'
import { spanLabel, type WorkEvent } from '../lib/project-work-analysis'

/** A step's look — each kind of event, plus `pending` for the still-open end. */
type Tone = WorkEvent['kind'] | 'pending'

const STEP: Record<
  Tone,
  { icon: LucideIcon; node: string; text: string; from: string; to: string; arrow: string }
> = {
  started: {
    icon: Play,
    node: 'bg-primary/15 text-primary ring-primary/30',
    text: 'text-primary',
    from: 'from-primary',
    to: 'to-primary',
    arrow: 'text-primary',
  },
  stopped: {
    icon: Square,
    node: 'bg-destructive/10 text-destructive ring-destructive/25',
    text: 'text-destructive',
    from: 'from-destructive',
    to: 'to-destructive',
    arrow: 'text-destructive',
  },
  resumed: {
    icon: RotateCw,
    node: 'bg-primary/15 text-primary ring-primary/30',
    text: 'text-primary',
    from: 'from-primary',
    to: 'to-primary',
    arrow: 'text-primary',
  },
  progress: {
    icon: TrendingUp,
    node: 'bg-sky-500/15 text-sky-600 ring-sky-500/30 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
    from: 'from-sky-500',
    to: 'to-sky-500',
    arrow: 'text-sky-500',
  },
  submitted: {
    icon: Send,
    node: 'bg-violet-500/15 text-violet-600 ring-violet-500/30 dark:text-violet-400',
    text: 'text-violet-600 dark:text-violet-400',
    from: 'from-violet-500',
    to: 'to-violet-500',
    arrow: 'text-violet-500',
  },
  approved: {
    icon: ShieldCheck,
    node: 'bg-success/15 text-success ring-success/30',
    text: 'text-success',
    from: 'from-success',
    to: 'to-success',
    arrow: 'text-success',
  },
  rejected: {
    icon: Undo2,
    node: 'bg-destructive/15 text-destructive ring-destructive/30',
    text: 'text-destructive',
    from: 'from-destructive',
    to: 'to-destructive',
    arrow: 'text-destructive',
  },
  completed: {
    icon: CircleCheck,
    node: 'bg-success/15 text-success ring-success/30',
    text: 'text-success',
    from: 'from-success',
    to: 'to-success',
    arrow: 'text-success',
  },  pending: {
    icon: Hourglass,
    node: 'bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    from: 'from-amber-500',
    to: 'to-amber-500',
    arrow: 'text-amber-500',
  },
}

type Dir = 'right' | 'left' | 'down'

/**
 * Each direction drawn in its own box (no rotation, which leaves the box the
 * wrong shape), pulled back 1px so the tip sits flush on the line's end.
 */
const HEAD: Record<Dir, { viewBox: string; path: string; box: string }> = {
  right: { viewBox: '0 0 8 10', path: 'M0 0 L8 5 L0 10 Z', box: '-ml-px h-2.5 w-2' },
  left: { viewBox: '0 0 8 10', path: 'M8 0 L0 5 L8 10 Z', box: '-mr-px h-2.5 w-2' },
  down: { viewBox: '0 0 10 8', path: 'M0 0 L10 0 L5 8 Z', box: '-mt-px h-2 w-2.5' },
}

/** A solid arrowhead — `currentColor`, so it takes the colour of the step it points at. */
function ArrowHead({ dir, className }: { dir: Dir; className?: string }) {
  const head = HEAD[dir]
  return (
    <svg viewBox={head.viewBox} className={cn('shrink-0', head.box, className)} aria-hidden>
      <path d={head.path} fill="currentColor" />
    </svg>
  )
}

/**
 * The arrow from one step to the next — its line fading from the colour of the
 * step it leaves into the one it reaches — with the time between on a chip.
 */
function Connector({ ms, dir, from, to }: { ms: number; dir: Dir; from: Tone; to: Tone }) {
  const vertical = dir === 'down'
  const gradient = vertical ? 'bg-linear-to-b' : dir === 'left' ? 'bg-linear-to-l' : 'bg-linear-to-r'

  return (
    <div
      className={cn(
        'relative flex items-center',
        vertical ? 'mt-2 mb-3.5 min-h-16 flex-1 flex-col' : 'mt-5 -translate-y-1/2 px-2',
        dir === 'left' && 'flex-row-reverse',
      )}
    >
      {/* Line and head are opaque and faded together as one layer, so where the
          head overlaps the line's end the two don't stack into a darker band. */}
      <div className={cn('flex flex-1 items-center opacity-70', vertical && 'flex-col', dir === 'left' && 'flex-row-reverse')}>
        <span
          className={cn(
            'flex-1',
            // Round only the tail — the head end stays square so the arrowhead meets it flush.
            vertical ? 'w-[3px] rounded-t-full' : dir === 'left' ? 'h-[3px] rounded-r-full' : 'h-[3px] rounded-l-full',
            gradient,
            STEP[from].from,
            STEP[to].to,
          )}
        />
        <ArrowHead dir={dir} className={STEP[to].arrow} />
      </div>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-sm">
        {spanLabel(ms)}
      </span>
    </div>
  )
}

function Step({ event }: { event: WorkEvent }) {
  const meta = STEP[event.kind]
  const Icon = meta.icon
  const at = parseISO(event.at)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex cursor-default flex-col items-center text-center">
          <span className={cn('grid size-10 place-items-center rounded-full ring-4', meta.node)}>
            <Icon className="size-4.5" />
          </span>
          <p className={cn('mt-2.5 text-sm font-semibold', meta.text)}>{event.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{format(at, 'dd MMM yyyy')}</p>
          <p className="text-xs text-muted-foreground">{format(at, 'hh:mm a')}</p>
          {event.detail && (
            <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground/90">“{event.detail}”</p>
          )}
        </div>
      </TooltipTrigger>
      {event.detail && <TooltipContent className="max-w-64">{event.detail}</TooltipContent>}
    </Tooltip>
  )
}

function PendingStep({ since }: { since: string }) {
  const meta = STEP.pending
  return (
    <div className="flex flex-col items-center text-center">
      <span className={cn('grid size-10 place-items-center rounded-full ring-4', meta.node)}>
        <meta.icon className="size-4.5" />
      </span>
      <p className={cn('mt-2.5 text-sm font-semibold', meta.text)}>Yet to complete</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Open since</p>
      <p className="text-xs text-muted-foreground">{format(parseISO(since), 'dd MMM, hh:mm a')}</p>
    </div>
  )
}

/** Width of one step's column and the least a line between two may shrink to (px). */
const STEP_WIDTH = 128
const MIN_GAP = 96
/** A row holds at most this many steps, however wide the screen. */
const MAX_PER_ROW = 5

/**
 * One assignee's work as a snake: steps run left to right, drop down at the
 * edge, come back right to left, and so on — so a long history wraps to the
 * card instead of scrolling. The time between steps sits on each arrow, and
 * while the work is still open it ends on a hollow "Yet to complete".
 */
export function WorkActivityFlow({
  events,
  open,
  now = Date.now(),
}: {
  events: WorkEvent[]
  open: boolean
  now?: number
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()

  // Each item: a step (or the pending tail), with the arrow that leads into it.
  const last = events.at(-1)
  const items = [
    ...events.map((e, i) => ({
      node: <Step event={e} />,
      kind: e.kind as Tone,
      ms: i > 0 ? Date.parse(e.at) - Date.parse(events[i - 1].at) : 0,
    })),
    // The open tail hangs off the last event — a share nobody has started has none.
    ...(open && last
      ? [
          {
            node: <PendingStep since={last.at} />,
            kind: 'pending' as Tone,
            ms: now - Date.parse(last.at),
          },
        ]
      : []),
  ]

  // As many as fit, never more than MAX_PER_ROW — so a wide screen spreads five across its width.
  const perRow = Math.min(MAX_PER_ROW, Math.max(2, Math.floor((width + MIN_GAP) / (STEP_WIDTH + MIN_GAP))))
  const cols = perRow * 2 - 1
  const rows: (typeof items)[] = []
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow))

  // Visual column (1-based) of the step at position `j` in row `r`; odd rows run right to left.
  const stepCol = (r: number, j: number) => 2 * (r % 2 === 0 ? j : perRow - 1 - j) + 1
  const cells: ReactNode[] = []
  let gridRow = 1
  rows.forEach((row, r) => {
    const reversed = r % 2 === 1
    row.forEach((item, j) => {
      const index = r * perRow + j
      if (j > 0) {
        const col = reversed ? stepCol(r, j) + 1 : stepCol(r, j) - 1
        cells.push(
          <div key={`c${index}`} style={{ gridRow, gridColumn: col }}>
            <Connector ms={item.ms} dir={reversed ? 'left' : 'right'} from={items[index - 1].kind} to={item.kind} />
          </div>,
        )
      }
      // The row's last step, when another row follows, carries the arrow down:
      // it stretches to the row's full height, so the line starts right under
      // the step however much taller its neighbours are.
      const next = j === row.length - 1 ? rows[r + 1] : undefined
      cells.push(
        next ? (
          <div
            key={`s${index}`}
            className="flex flex-col items-center self-stretch"
            style={{ gridRow, gridColumn: stepCol(r, j) }}
          >
            {item.node}
            <Connector ms={next[0].ms} dir="down" from={item.kind} to={next[0].kind} />
          </div>
        ) : (
          <div key={`s${index}`} style={{ gridRow, gridColumn: stepCol(r, j) }}>
            {item.node}
          </div>
        ),
      )
    })
    gridRow += 1
  })

  return (
    // Always mounted, so the width is measured whatever there is to show.
    <div ref={ref} className="w-full pt-3">
      {events.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Not started yet.</p>
      ) : width > 0 && (
        <div
          className="grid items-start"
          style={{
            gridTemplateColumns: Array.from({ length: cols }, (_, c) =>
              c % 2 === 0 ? `${STEP_WIDTH}px` : `minmax(${MIN_GAP - 16}px, 1fr)`,
            ).join(' '),
          }}
        >
          {cells}
        </div>
      )}
    </div>
  )
}
