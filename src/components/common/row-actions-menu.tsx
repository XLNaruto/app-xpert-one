import * as React from 'react'
import { createPortal } from 'react-dom'
import { SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** One entry in the row's Actions menu. */
export type RowAction = {
  label: string
  icon: LucideIcon
  onSelect: () => void
  /** Tints the item red — use for delete / take-off-strength style actions. */
  destructive?: boolean
  disabled?: boolean
  /** Draws a divider above this item. */
  separated?: boolean
}

const MENU_WIDTH = 224
const GAP = 6

/**
 * The row's actions collapsed behind one "Actions" button.
 *
 * The menu renders in a portal at fixed coordinates rather than absolutely inside
 * the cell: the table body scrolls (`overflow-auto`), so an in-flow menu would be
 * clipped by the last rows. It flips above the button when the viewport runs out
 * below, and closes on outside click, Escape, scroll or resize — the anchor rect
 * is measured once at open, so it must not linger while the page moves under it.
 */
export function RowActionsMenu({
  actions,
  label = 'Actions',
}: {
  actions: RowAction[]
  label?: string
}) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const open = pos !== null

  const place = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Rough height guess is enough to decide the flip; the menu is short.
    const height = actions.length * 40 + 8
    const below = window.innerHeight - rect.bottom
    const top = below < height + GAP && rect.top > height ? rect.top - height - GAP : rect.bottom + GAP
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8))
    setPos({ top, left })
  }, [actions.length])

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setPos(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null)
    }
    const close = () => setPos(null)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    // Capture phase so a scroll on any ancestor (the table body included) counts.
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  if (actions.length === 0) return null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setPos(null) : place())}
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
          'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10',
          open && 'bg-primary/15',
        )}
      >
        <SlidersHorizontal className="size-4" />
        {label}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            className="fixed z-50 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {actions.map((action) => (
              <React.Fragment key={action.label}>
                {action.separated && <div className="my-1 h-px bg-border" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  onClick={() => {
                    setPos(null)
                    action.onSelect()
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    action.disabled
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                    action.destructive && 'text-destructive hover:bg-destructive/10',
                  )}
                >
                  <action.icon
                    className={cn(
                      'size-4 shrink-0',
                      action.destructive ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  />
                  {action.label}
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
