import type { ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * A table cell that reads as text until double-clicked, then edits in place —
 * Enter or leaving the field keeps the change, Esc undoes it. A cell with an
 * error stays visibly red so it's found again.
 */
export function EditableCell({
  editing,
  text,
  emptyText,
  error,
  registration,
  inputClassName,
  inputMode,
  onStartEdit,
  onFinish,
  onCancel,
  onTab,
}: {
  editing: boolean
  text: ReactNode
  emptyText: string
  error?: string
  registration: UseFormRegisterReturn
  inputClassName?: string
  inputMode?: 'numeric'
  onStartEdit: () => void
  onFinish: () => void
  onCancel: () => void
  /** Tab / Shift+Tab while editing — keep the edit and open the next / previous cell. */
  onTab?: (back: boolean) => void
}) {
  if (editing) {
    return (
      <>
        <Input
          autoFocus
          className={cn('h-8', inputClassName)}
          inputMode={inputMode}
          placeholder={emptyText}
          {...registration}
          onBlur={(e) => {
            void registration.onBlur(e)
            onFinish()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onFinish()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
            if (e.key === 'Tab' && onTab) {
              e.preventDefault()
              onTab(e.shiftKey)
            }
          }}
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </>
    )
  }

  const empty = text === '' || text === null || text === undefined
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onDoubleClick={onStartEdit}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === 'F2') && onStartEdit()}
            className={cn(
              'min-h-8 cursor-cell truncate rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted',
              // Our ring, not the browser's black outline, when tabbed onto.
              'outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-primary/50',
              empty && 'text-muted-foreground',
              error && 'bg-destructive/5 text-destructive ring-1 ring-destructive/40',
            )}
          >
            {empty ? emptyText : text}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 whitespace-pre-wrap break-words">
          {!empty && <p>{text}</p>}
          <p className={cn(!empty && 'mt-1 text-[11px] opacity-70')}>Double-click to edit</p>
        </TooltipContent>
      </Tooltip>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </>
  )
}

/**
 * Read-only cell text on one line, cut with "…"; the tooltip shows it in full.
 * No tooltip when there's nothing to reveal.
 */
export function TruncatedText({ text, emptyText = '—' }: { text: string; emptyText?: string }) {
  if (!text.trim()) return <span className="text-muted-foreground">{emptyText}</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className="truncate">{text}</p>
      </TooltipTrigger>
      <TooltipContent className="max-w-80 whitespace-pre-wrap break-words">{text}</TooltipContent>
    </Tooltip>
  )
}
