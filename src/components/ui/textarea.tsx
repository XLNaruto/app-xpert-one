import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Multi-line text control, styled to match `<Input>` — same border, ring and
 * invalid state, so a textarea sat beside an input in a form grid reads as the
 * same family of control.
 */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      'read-only:cursor-default read-only:focus-visible:ring-0',
      'aria-invalid:border-destructive aria-invalid:focus-visible:ring-0',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
