import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** Panel width utility — defaults to a 700px drawer that fills small screens. */
  className?: string
}

/**
 * Right-side drawer (no external dependency) — the add/edit/view panel a list
 * page opens over itself. Same contract as `Dialog`: overlay click and Escape
 * close it, and body scroll is locked while open.
 */
export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      // Escape belongs to an image viewer opened from inside, not to us.
      if (e.key === 'Escape' && !document.querySelector('.xl-lightbox')) onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div className="app-modal fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="dialog-overlay absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 flex h-full w-full max-w-[700px] flex-col border-l border-border bg-card text-card-foreground shadow-2xl dark:bg-[#0E1726]',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** Title bar with the close button. */
export function SheetHeader({
  title,
  description,
  onClose,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  onClose: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

/** The scrolling middle of the drawer. */
export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)} {...props} />
}

/** Sticky action row at the bottom. */
export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 border-t border-border px-6 py-4', className)}
      {...props}
    />
  )
}
