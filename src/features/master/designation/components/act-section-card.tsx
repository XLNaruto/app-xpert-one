import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActSectionCardProps {
  icon: LucideIcon
  title: string
  /**
   * Tint classes for the card surface, e.g. "bg-primary/5 border-primary/20".
   * The fill is light-mode only — dark mode keeps just the tinted border.
   */
  tone: string
  /** Icon colour class, e.g. "text-primary". */
  iconTone: string
  /** Optional note under the field grid, e.g. how a slab is applied. */
  footnote?: string
  children: ReactNode
}

/**
 * One act's settings on the designation form — a softly tinted card with an
 * icon heading and its own field grid, so each act reads as a block. Rendered
 * only while that act's toggle is on.
 */
export function ActSectionCard({
  icon: Icon,
  title,
  tone,
  iconTone,
  footnote,
  children,
}: ActSectionCardProps) {
  return (
    <section className={cn('rounded-xl border p-4 sm:p-5', tone, 'dark:bg-transparent')}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn('size-4', iconTone)} />
        {title}
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
      {footnote && <p className="mt-4 text-xs text-muted-foreground">{footnote}</p>}
    </section>
  )
}
