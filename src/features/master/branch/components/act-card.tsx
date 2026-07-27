import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActCardProps {
  icon: LucideIcon
  title: string
  /**
   * Tint classes for the card surface, e.g. "bg-primary/5 border-primary/20".
   * The fill is light-mode only — dark mode keeps just the tinted border.
   */
  tone: string
  /** Icon colour class, e.g. "text-primary". */
  iconTone: string
  children: ReactNode
}

/**
 * One statutory act on the branch "Applicable Acts" tab — a softly tinted card
 * with an icon heading and its own field grid, so each act reads as a block.
 */
export function ActCard({
  icon: Icon,
  title,
  tone,
  iconTone,
  children,
}: ActCardProps) {
  return (
    <section
      className={cn('rounded-xl border p-4 sm:p-5', tone, 'dark:bg-transparent')}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn('size-4', iconTone)} />
        {title}
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </section>
  )
}
