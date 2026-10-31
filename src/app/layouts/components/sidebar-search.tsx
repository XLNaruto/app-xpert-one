import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Menu search box shown below the sidebar brand. The text is lifted to the
 * sidebar, which narrows its own rows with `filterNavBySearch` — no API call.
 * ↑/↓ move the sidebar's cursor through the matches, Enter opens the selected
 * row, Escape closes the box.
 */
export function SidebarSearch({
  value,
  onChange,
  onClose,
  onMove,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  onClose: () => void
  /** Step the selection: 1 for the next match, -1 for the previous one. */
  onMove: (delta: number) => void
  onSubmit: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on open — the box only mounts when the user asked for it.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && value.trim()) {
      // preventDefault keeps the caret from jumping to the start/end of the text.
      e.preventDefault()
      onMove(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="border-b border-sidebar-border px-3 py-3">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-2.5 transition-[border-color,box-shadow] focus-within:border-sidebar-primary focus-within:ring-2 focus-within:ring-sidebar-primary/15">
        <Search className="size-4 shrink-0 text-sidebar-foreground/50" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search Menu..."
          autoComplete="off"
          aria-label="Search menu"
          className="min-w-0 flex-1 bg-transparent text-sm text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/40"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="grid size-5 shrink-0 cursor-pointer place-items-center rounded text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
            >
              <X className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Close</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

/** Wraps the part of `text` matching the search `term` so it stands out. */
export function HighlightMatch({ text, term }: { text: string; term: string }) {
  const needle = term.trim().toLowerCase()
  const start = needle ? text.toLowerCase().indexOf(needle) : -1
  if (start === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-sm bg-sidebar-primary/15 px-0.5 text-sidebar-primary">
        {text.slice(start, start + needle.length)}
      </mark>
      {text.slice(start + needle.length)}
    </>
  )
}
