import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * The search box both attendance screens use.
 *
 * Undebounced on purpose: `usePagination` already holds the term for 300ms
 * before it reaches the query, so debouncing here as `<FilterBar>` does would
 * stack two delays and make the input feel a beat behind the typing.
 */
export function AttendanceSearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={cn('relative sm:w-72', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 truncate border-border/50 pl-9 pr-9"
      />
      {value.trim() ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
