import type { ReactNode } from 'react'
import Lightbox, {
  stopNavigationEventsPropagation,
  useController,
  useLoseFocus,
  useNavigationState,
  type SlideImage,
} from 'yet-another-react-lightbox'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'

/**
 * A slide plus the line of context that belongs under it.
 *
 * `badge` is the short verdict word (`Check In`, `Out`, a document type) and
 * `tone` colours it; `caption` and `meta` are the two halves of the footer line
 * — what this image is and where it came from.
 */
export type LightboxSlide = SlideImage & {
  badge?: string
  tone?: 'success' | 'destructive' | 'neutral'
  caption?: string
  meta?: string
}

const TONE: Record<string, string> = {
  success: 'bg-success/20 text-success ring-success/30',
  destructive: 'bg-destructive/20 text-destructive ring-destructive/30',
  neutral: 'bg-white/15 text-white ring-white/25',
}

/**
 * The app's one image viewer.
 *
 * Thumbnails throughout the product are too small to answer the question they
 * raise — is this the right face, is this the right document — so every one of
 * them opens here at full size and zoomable, on a dimmed backdrop with the
 * image's own context sitting under it rather than printed over it.
 *
 * `index` is the slide to open on and `-1` means closed, so a caller can drive
 * the whole thing from one piece of state.
 */
export function ImageLightbox({
  slides,
  index,
  onIndexChange,
  onClose,
}: {
  slides: LightboxSlide[]
  index: number
  onIndexChange?: (index: number) => void
  onClose: () => void
}) {
  return (
    <Lightbox
      open={index >= 0}
      close={onClose}
      index={index < 0 ? 0 : index}
      slides={slides}
      on={{ view: ({ index: next }) => onIndexChange?.(next) }}
      // "1 / 1" is not a position, it's noise — the counter only earns its
      // place once there is something to count through.
      plugins={slides.length > 1 ? [Zoom, Counter] : [Zoom]}
      className="xl-lightbox"
      // A set has ends; wrapping around from the last image to the first only
      // makes it unclear which one you were on.
      carousel={{ finite: true, padding: '72px', imageFit: 'contain' }}
      controller={{ closeOnBackdropClick: true }}
      counter={{ container: { className: 'xl-lightbox__counter' } }}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      animation={{ fade: 200, swipe: 350 }}
      // Every control is ours rather than the library's: its buttons carry a
      // `title`, and the browser's grey tooltip has no business appearing in a
      // screen the rest of the app renders with `<Tooltip>`.
      render={{
        buttonPrev: slides.length > 1 ? () => <NavButton action="prev" /> : () => null,
        buttonNext: slides.length > 1 ? () => <NavButton action="next" /> : () => null,
        buttonClose: () => <CloseButton />,
        buttonZoom: (zoom) => <ZoomButtons zoom={zoom} />,
        slideFooter: ({ slide }) => <SlideFooter slide={slide as LightboxSlide} />,
      }}
    />
  )
}

/**
 * One control of the viewer — our tooltip, never the browser's.
 *
 * Pointer and key events stop here: the backdrop closes on click and the
 * carousel swipes on drag, and neither should happen because someone reached
 * for a button.
 */
function LightboxButton({
  label,
  side = 'bottom',
  onClick,
  disabled,
  className,
  children,
}: {
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  onClick: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  const { focus } = useController()
  const loseFocus = useLoseFocus(focus, disabled)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn('yarl__button', className)}
          {...stopNavigationEventsPropagation()}
          {...loseFocus}
        >
          {children}
        </button>
      </TooltipTrigger>
      {/* The lightbox portal sits at z-9999 — a z-50 tooltip would open behind
          the backdrop it belongs to. */}
      <TooltipContent side={side} className="z-10000">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** Previous / next. The library keeps the arrow's placement; we keep its look. */
function NavButton({ action }: { action: 'prev' | 'next' }) {
  const { prev, next } = useController()
  const { prevDisabled, nextDisabled } = useNavigationState()
  const isPrev = action === 'prev'

  return (
    <LightboxButton
      label={isPrev ? 'Previous' : 'Next'}
      side={isPrev ? 'right' : 'left'}
      onClick={isPrev ? prev : next}
      disabled={isPrev ? prevDisabled : nextDisabled}
      className={`yarl__navigation_${action}`}
    >
      {isPrev ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
    </LightboxButton>
  )
}

function CloseButton() {
  const { close } = useController()
  return (
    <LightboxButton label="Close" onClick={close}>
      <X className="size-5" />
    </LightboxButton>
  )
}

/** Zoom in / out, disabled at the ends of the range rather than hidden. */
function ZoomButtons({
  zoom,
}: {
  zoom: {
    zoom: number
    minZoom: number
    maxZoom: number
    disabled: boolean
    zoomIn: () => void
    zoomOut: () => void
  }
}) {
  return (
    <>
      <LightboxButton
        label="Zoom in"
        onClick={zoom.zoomIn}
        disabled={zoom.disabled || zoom.zoom >= zoom.maxZoom}
      >
        <ZoomIn className="size-5" />
      </LightboxButton>
      <LightboxButton
        label="Zoom out"
        onClick={zoom.zoomOut}
        disabled={zoom.disabled || zoom.zoom <= zoom.minZoom}
      >
        <ZoomOut className="size-5" />
      </LightboxButton>
    </>
  )
}

/** The caption bar: what this image is, and where it came from. */
function SlideFooter({ slide }: { slide: LightboxSlide }) {
  if (!slide.badge && !slide.caption && !slide.meta) return null

  return (
    <div className="xl-lightbox__footer">
      <div className="flex items-center gap-2.5 rounded-full bg-black/55 px-3.5 py-2 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md">
        {slide.badge && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
              TONE[slide.tone || 'neutral'],
            )}
          >
            {slide.badge}
          </span>
        )}
        {slide.caption && (
          <span className="text-sm font-medium tabular-nums">{slide.caption}</span>
        )}
        {slide.meta && (
          <span className="border-l border-white/20 pl-2.5 text-xs text-white/70">
            {slide.meta}
          </span>
        )}
      </div>
    </div>
  )
}
