import type { ReactElement, ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Explanatory text on hover — our tooltip, never the browser's `title=`.
 *
 * A native `title` renders as the OS's own black box: it ignores the theme,
 * lands a full second late, is invisible to touch and cannot be styled. So
 * anything that wants a hint wraps its trigger in this instead.
 *
 * The child must forward a ref and its props (`asChild` hands both to it), so
 * pass a DOM element or a component that spreads — not a bare fragment.
 * `text: undefined` renders the child alone, which is what makes the
 * conditional case (`hint only when unmeasured`) a one-liner at the call site.
 */
export function Hint({
  text,
  children,
  side = 'top',
  className,
}: {
  text?: ReactNode
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}) {
  if (!text) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
