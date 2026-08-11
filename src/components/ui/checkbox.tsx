import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  /**
   * Tri-state: the box is neither on nor off, because some of what it stands for
   * is selected and some isn't — a parent row over a partly-ticked group.
   *
   * `indeterminate` is a DOM property, not an attribute, so it can only be set
   * through the element. Keep `checked` false alongside it: a box can't be both,
   * and the dash below is what the user reads instead of a tick.
   */
  indeterminate?: boolean
}

function Checkbox({ className, indeterminate = false, ...props }: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'peer size-4 cursor-pointer appearance-none rounded-[4px] border border-input bg-background shadow-sm transition-colors',
          'checked:border-primary checked:bg-primary',
          'indeterminate:border-primary indeterminate:bg-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <Check className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0" />
      <Minus className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-indeterminate:opacity-100" />
    </span>
  )
}

export { Checkbox }
