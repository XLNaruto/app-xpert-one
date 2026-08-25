import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * The rounded search box each pane is topped with.
 *
 * Not `<FilterBar>`: that one is built for a data table's toolbar — a facet
 * panel, a reset button, a portal — and none of the three panes here has a facet
 * to open. This is the search half alone, sized for a sidebar.
 */
export function MonitoringSearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  autoFocus?: boolean
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-full bg-muted/50 pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
