import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      /*
       * A read-only field holds a derived value — there's nothing to type, so it
       * shouldn't advertise itself as editable. Browsers still focus a read-only
       * input on click (it accepts keyboard input, so it matches `:focus-visible`),
       * which is where the stray ring comes from.
       */
      'read-only:cursor-default read-only:focus-visible:ring-0',
      /*
       * Invalid state, driven by `aria-invalid` so the styling and the semantics
       * can't disagree. The focus ring is dropped while invalid: a red border and
       * a blue ring at once reads as two competing outlines, and the error is the
       * more important of the two things to say.
       */
      'aria-invalid:border-destructive aria-invalid:focus-visible:ring-0',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'
