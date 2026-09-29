import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * Minimal modal dialog (no external dependency). Renders an overlay + centered
 * panel when `open`; closes on Escape and backdrop click. Locks body scroll
 * while open.
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
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
    <div
      className="app-modal fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="dialog-overlay absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>,
    document.body,
  )
}

export function DialogContent({
  className,
  children,
  showClose = true,
  onClose,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showClose?: boolean
  onClose?: () => void
}) {
  return (
    <div
      className={cn(
        // Never taller than the screen: a `DialogBody` inside scrolls while the
        // header and footer stay put.
        'dialog-pop relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl dark:bg-[#0E1726]',
        className,
      )}
      {...props}
    >
      {showClose && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
      {children}
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 flex-col gap-2', className)} {...props} />
}

/**
 * The part of a dialog that scrolls when it's long — sits between
 * `DialogHeader` and `DialogFooter`, which stay fixed. Bleeds to the dialog's
 * edges so the scrollbar sits at the side, not inside the padding.
 */
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('-mx-6 min-h-0 flex-1 overflow-y-auto px-6', className)} {...props} />
}

/**
 * A `<form>` that fills a dialog the same way — so its `DialogBody` scrolls and
 * its header and footer stay put.
 */
export function DialogForm({ className, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn('flex min-h-0 flex-1 flex-col', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('font-heading text-lg font-semibold leading-none', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}
