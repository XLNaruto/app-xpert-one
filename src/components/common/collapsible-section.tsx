import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface CollapsibleSectionProps {
  /** Icon shown in the tinted badge to the left of the title. */
  icon: LucideIcon
  title: string
  /** Optional one-line helper text under the title. */
  description?: string
  /**
   * Rendered beside the title — a count, a "No data" pill. It stays visible
   * while the section is closed, which is the point: the header alone should
   * tell you whether opening it is worth it.
   */
  badge?: ReactNode
  /** Whether the section starts open. Uncontrolled from then on. */
  defaultOpen?: boolean
  /** Swaps the body for placeholder bars while the section's query runs. */
  isLoading?: boolean
  children: ReactNode
  className?: string
}

/**
 * One collapsible block of a detail screen — a header that toggles, and a body
 * that animates open and shut.
 *
 * The animation is a `grid-template-rows` transition rather than a height one so
 * the body can be any size without a measured pixel value, and the content is
 * left mounted while closed so opening a section is instant and its images are
 * already loaded.
 */
export function CollapsibleSection({
  icon: Icon,
  title,
  description,
  badge,
  defaultOpen = true,
  isLoading = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm transition-colors',
        open && 'border-primary/25',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'bg-muted/40',
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-300',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        id={bodyId}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t px-4 py-5">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
