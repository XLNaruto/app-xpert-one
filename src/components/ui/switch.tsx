import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
  /**
   * Render the track as a plain span rather than a button — for when an outer
   * control (a clickable tile, say) already owns the click and the switch role.
   */
  presentational?: boolean
}

/**
 * Zero-dependency on/off toggle — a `role="switch"` button with a sliding
 * thumb. Used wherever a boolean reads better as a switch than a checkbox
 * (applicable-act flags, per-row PF/ESI/PT markers).
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
  presentational = false,
}: SwitchProps) {
  const track = cn(
    'inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
    checked ? 'bg-primary' : 'bg-input',
    className,
  )
  const thumb = (
    <span
      className={cn(
        'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform',
        checked ? 'translate-x-[18px]' : 'translate-x-0.5',
      )}
    />
  )

  if (presentational) {
    return (
      <span aria-hidden className={cn(track, disabled && 'opacity-50')}>
        {thumb}
      </span>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        track,
        'cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      {thumb}
    </button>
  )
}
