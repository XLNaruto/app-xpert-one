import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
}
const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>')
  return ctx
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? '')
  const value = controlled ?? internal
  const setValue = (v: string) => {
    setInternal(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  value,
  className,
  disabled = false,
  onDisabledClick,
  children,
}: {
  value: string
  className?: string
  /**
   * The tab exists but can't be opened yet — a step that depends on something not
   * saved. It stays a real button rather than an `HTMLButton` `disabled`, because a
   * locked tab has to be able to SAY WHY it's locked, and a disabled button fires
   * no click and swallows the tooltip.
   */
  disabled?: boolean
  /** What a click on a locked tab does instead of switching — say why. */
  onDisabledClick?: () => void
  children: React.ReactNode
}) {
  const ctx = useTabs()
  const active = ctx.value === value
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      onClick={() => (disabled ? onDisabledClick?.() : ctx.setValue(value))}
      data-state={active ? 'active' : 'inactive'}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
        disabled
          ? 'cursor-not-allowed text-muted-foreground/60'
          : 'cursor-pointer',
        active
          ? 'bg-background text-foreground shadow-sm'
          : !disabled && 'hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = useTabs()
  if (ctx.value !== value) return null
  return <div className={cn('mt-4', className)}>{children}</div>
}
