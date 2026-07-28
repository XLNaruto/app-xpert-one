import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  required?: boolean
  /** Help text shown behind an info icon beside the label. */
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

/**
 * A labelled form field with an optional required-marker, an optional help
 * tooltip, a control slot and inline error text. Shared by every feature form
 * so field markup stays identical across screens.
 */
export function Field({
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-foreground/90">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Not tab-focusable: the copy is a hint, not a step in the form. */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={`${label} — more information`}
                className="ml-1 inline-flex cursor-help text-muted-foreground/70 transition-colors hover:text-primary"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty font-normal">
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
