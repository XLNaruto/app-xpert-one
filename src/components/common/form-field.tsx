import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}

/**
 * A labelled form field with an optional required-marker, a control slot and
 * inline error text. Shared by every feature form so field markup stays
 * identical across screens.
 */
export function Field({ label, required = false, error, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-foreground/90">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
