import { useEffect, useState, type ReactNode } from 'react'
import Lightbox, {
  stopNavigationEventsPropagation,
  useController,
  useLightboxState,
  useLoseFocus,
  useNavigationState,
  type ContainerRect,
  type GenericSlide,
  type Slide,
} from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Maximize,
  Minus,
  Plus,
  X,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'

/**
 * The context every slide carries, whichever kind it is.
 *
 * `caption` is what the file *is* — it titles the viewer's top bar and names
 * the download. `badge` is the short verdict word (`Check In`, `Out`) with
 * `tone` colouring it, and `meta` is the second half of the context line —
 * where the file came from. `href` is the address the toolbar's open/download
 * actions point at when it differs from what the slide renders (a PDF framed
 * from a `blob:` URL still downloads from its stored one).
 */
declare module 'yet-another-react-lightbox' {
  interface GenericSlide {
    badge?: string
    tone?: 'success' | 'destructive' | 'neutral'
    caption?: string
    meta?: string
    href?: string
  }
  interface SlideTypes {
    /** A PDF, embedded in the viewer rather than thrown at a new tab. */
    pdf: SlidePdf
    /** Anything nothing can embed — shown as a card with a way out. */
    file: SlideFile
  }
}

/**
 * A PDF slide. `src` must be something the browser will embed — a stored file's
 * media URL, or a `blob:` URL for one that hasn't been uploaded yet (Chrome
 * refuses to render a `data:` PDF in a frame).
 */
export interface SlidePdf extends GenericSlide {
  type: 'pdf'
  src: string
}

/** A slide for a format the browser can't render inline — a .docx, a .xlsx. */
export interface SlideFile extends GenericSlide {
  type: 'file'
  src: string
}

/** Any slide the app's viewer can show. */
export type LightboxSlide = Slide

const TONE: Record<string, string> = {
  success: 'bg-success/20 text-success ring-success/30',
  destructive: 'bg-destructive/20 text-destructive ring-destructive/30',
  neutral: 'bg-white/15 text-white ring-white/25',
}

/** Everything that isn't an image is drawn by us rather than the library. */
const isDocument = (slide?: Slide) => slide?.type === 'pdf' || slide?.type === 'file'

/** Last path segment, for when a caller gave the slide no caption. */
const baseName = (url: string) => url.split(/[?#]/)[0].split('/').pop() || 'File'

/** Where a slide's open / download actions should point. */
const slideHref = (slide?: Slide) => slide?.href || slide?.src || ''

/** What the title bar shows and the download is saved as. */
const slideTitle = (slide?: Slide) =>
  slide?.caption || (slide ? baseName(slideHref(slide)) : 'File')

/**
 * Save a file locally. Streaming it through a blob keeps the original name and
 * avoids a stray tab; when the host blocks the fetch (cross-origin media
 * without CORS) we fall back to a plain anchor and let the browser decide.
 */
async function downloadFile(url: string, name: string) {
  const save = (href: string) => {
    const a = document.createElement('a')
    a.href = href
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(String(response.status))
    const objectUrl = URL.createObjectURL(await response.blob())
    save(objectUrl)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
  } catch {
    save(url)
  }
}

/**
 * The app's one file viewer.
 *
 * Thumbnails throughout the product are too small to answer the question they
 * raise — is this the right face, is this the right document — so every one of
 * them opens here at full size and zoomable, on a dimmed backdrop with the
 * file's own context sitting under it rather than printed over it. Images,
 * PDFs and formats nothing can embed all ride the same carousel, so paging
 * through an upload field never drops the user out of the app.
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
  const many = slides.length > 1

  return (
    <Lightbox
      open={index >= 0}
      close={onClose}
      index={index < 0 ? 0 : index}
      slides={slides}
      on={{ view: ({ index: next }) => onIndexChange?.(next) }}
      // A strip of one thumbnail is not a strip — it only earns its place once
      // there is something to page between.
      plugins={many ? [Zoom, Thumbnails] : [Zoom]}
      className="xl-lightbox"
      // A set has ends; wrapping around from the last file to the first only
      // makes it unclear which one you were on. The padding is what keeps the
      // slide clear of the title band above and the thumbnails below.
      carousel={{ finite: true, padding: '76px', imageFit: 'contain' }}
      controller={{ closeOnBackdropClick: true }}
      thumbnails={{ width: 96, height: 72, border: 0, gap: 8, padding: 4 }}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      animation={{ fade: 200, swipe: 350 }}
      // Every control is ours rather than the library's: its buttons carry a
      // `title`, and the browser's grey tooltip has no business appearing in a
      // screen the rest of the app renders with `<Tooltip>`.
      toolbar={{
        buttons: ['zoom', <SlideActions key="actions" />, <CloseButton key="close" />],
      }}
      render={{
        buttonPrev: many ? () => <NavButton action="prev" /> : () => null,
        buttonNext: many ? () => <NavButton action="next" /> : () => null,
        buttonZoom: (zoom) => <ZoomControls zoom={zoom} />,
        controls: () => <TitleBar count={slides.length} />,
        // Images keep the library's own renderer (and with it the zoom
        // plugin); anything else is ours to draw.
        slide: ({ slide, offset, rect }) =>
          slide.type === 'pdf' ? (
            <PdfSlide slide={slide} active={offset === 0} rect={rect} />
          ) : slide.type === 'file' ? (
            <FileSlide slide={slide} />
          ) : undefined,
        // The strip only knows how to paint images; a document gets an icon.
        thumbnail: ({ slide }) =>
          isDocument(slide) ? (
            <span className="grid size-full place-items-center rounded-md bg-white/10 text-white/70">
              <FileText className="size-6" />
            </span>
          ) : undefined,
        slideFooter: ({ slide }) => <SlideFooter slide={slide} />,
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
  href,
  disabled,
  className,
  children,
}: {
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  onClick?: () => void
  /** Renders an anchor instead of a button (opens in a new tab). */
  href?: string
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  const { focus } = useController()
  const loseFocus = useLoseFocus(focus, disabled)
  const shared = {
    'aria-label': label,
    className: cn('yarl__button', className),
    ...stopNavigationEventsPropagation(),
    ...loseFocus,
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <a {...shared} href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ) : (
          <button {...shared} type="button" disabled={disabled} onClick={onClick}>
            {children}
          </button>
        )}
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

/**
 * Zoom out / level / in.
 *
 * The live percentage doubles as "reset to fit" — the only way back to 1×
 * without spinning the wheel all the way down. The cluster disappears on a
 * document slide, where the library's zoom does nothing.
 */
function ZoomControls({
  zoom,
}: {
  zoom: {
    zoom: number
    minZoom: number
    maxZoom: number
    disabled: boolean
    zoomIn: () => void
    zoomOut: () => void
    changeZoom: (value: number) => void
  }
}) {
  if (zoom.disabled) return null

  return (
    <>
      <LightboxButton
        label="Zoom out"
        onClick={zoom.zoomOut}
        disabled={zoom.zoom <= zoom.minZoom}
      >
        <Minus className="size-5" />
      </LightboxButton>
      <LightboxButton
        label="Reset zoom"
        onClick={() => zoom.changeZoom(zoom.minZoom)}
        disabled={zoom.zoom <= zoom.minZoom}
        className="xl-lightbox__zoom"
      >
        <Maximize className="size-3.5" />
        {Math.round(zoom.zoom * 100)}%
      </LightboxButton>
      <LightboxButton
        label="Zoom in"
        onClick={zoom.zoomIn}
        disabled={zoom.zoom >= zoom.maxZoom}
      >
        <Plus className="size-5" />
      </LightboxButton>
    </>
  )
}

/**
 * Open and download, for whichever slide is showing.
 *
 * An embedded PDF can't be printed or searched comfortably at this size, and a
 * .docx can't be shown at all — the way out to the browser's own handling stays
 * one click away for every file.
 */
function SlideActions() {
  const { currentSlide } = useLightboxState()
  const href = slideHref(currentSlide)
  if (!href) return null

  return (
    <>
      <LightboxButton label="Open in a new tab" href={href}>
        <ExternalLink className="size-5" />
      </LightboxButton>
      <LightboxButton
        label="Download"
        onClick={() => void downloadFile(href, slideTitle(currentSlide))}
      >
        <Download className="size-5" />
      </LightboxButton>
    </>
  )
}

/** Top-left band: what you're looking at, and where you are in the set. */
function TitleBar({ count }: { count: number }) {
  const { currentSlide, currentIndex } = useLightboxState()

  return (
    <div className="xl-lightbox__title">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/10 text-white/85 backdrop-blur-sm">
        {isDocument(currentSlide) ? (
          <FileText className="size-4" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-white/95">
        {slideTitle(currentSlide)}
      </span>
      {count > 1 && (
        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium tabular-nums text-white/85 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
          {currentIndex + 1} / {count}
        </span>
      )}
    </div>
  )
}

/** The context bar under the slide: what this file says, and where it came from. */
function SlideFooter({ slide }: { slide: LightboxSlide }) {
  if (!slide.badge && !slide.meta) return null

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
        {slide.meta && (
          <span className="text-xs text-white/70">{slide.meta}</span>
        )}
      </div>
    </div>
  )
}

/**
 * A PDF inside the viewer.
 *
 * Only the slide the user is actually on gets a frame: an `<iframe>` per
 * preloaded neighbour would have the browser fetching and rendering documents
 * nobody asked to see. The others hold the card's shape with the file's name so
 * swiping still reads as moving between files.
 */
function PdfSlide({
  slide,
  active,
  rect,
}: {
  slide: SlidePdf
  active: boolean
  rect: ContainerRect
}) {
  const title = slideTitle(slide)
  const embed = useEmbeddablePdf(slide.src, active)

  return (
    <div
      className="xl-lightbox__pdf"
      style={{ width: rect.width, height: rect.height }}
      // The card is content, not backdrop — a drag inside it must not swipe the
      // carousel, and a click must not close the viewer.
      {...stopNavigationEventsPropagation()}
    >
      {/* No header of ours: the file's name is already in the viewer's title
          bar, and the browser's PDF viewer prints it again inside the frame —
          a third copy was two too many. */}
      {!active ? (
        <PdfPlaceholder title={title} />
      ) : embed.status === 'loading' ? (
        <PdfPlaceholder title={title} loading />
      ) : embed.status === 'ready' ? (
        <iframe
          src={`${embed.src}#view=FitH`}
          title={title}
          className="w-full flex-1 border-0"
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <span className="max-w-full truncate text-sm font-medium text-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">
            This document can&apos;t be shown here — open or download it from the
            toolbar above.
          </span>
        </div>
      )}
    </div>
  )
}

/** The card's shape held by a name, while it loads or waits its turn. */
function PdfPlaceholder({ title, loading }: { title: string; loading?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
      {loading ? (
        <Loader2 className="size-8 animate-spin" />
      ) : (
        <FileText className="size-8" />
      )}
      <span className="max-w-[80%] truncate text-xs font-medium">{title}</span>
    </div>
  )
}

/**
 * A framable address for a PDF.
 *
 * Storage hosts routinely answer with `X-Frame-Options: DENY` — the file opens
 * fine in a tab and refuses to render in an `<iframe>`, which is exactly the
 * case this viewer exists for. Fetching the bytes and framing them as a `blob:`
 * URL sidesteps that: the frame then points at this document's own origin, and
 * nothing about the file itself has changed. A `blob:`/`data:` source is
 * already local, so it is used as-is.
 *
 * Only the slide being looked at is fetched, and only once it is: a document
 * per preloaded neighbour would pull megabytes nobody asked to see. When even
 * the fetch is refused (no CORS header), the caller shows the way out instead.
 */
function useEmbeddablePdf(src: string, active: boolean) {
  const local = src.startsWith('blob:')
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error'
    src: string
  }>(local ? { status: 'ready', src } : { status: 'loading', src: '' })

  useEffect(() => {
    if (!active || local) return

    let objectUrl = ''
    const abort = new AbortController()
    setState({ status: 'loading', src: '' })

    void (async () => {
      try {
        const response = await fetch(src, { signal: abort.signal })
        if (!response.ok) throw new Error(String(response.status))
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(
          // A host that serves the file as `application/octet-stream` would
          // have the frame offer a download instead of rendering it.
          blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' }),
        )
        setState({ status: 'ready', src: objectUrl })
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return
        setState({ status: 'error', src: '' })
      }
    })()

    return () => {
      abort.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, active, local])

  return local ? { status: 'ready' as const, src } : state
}

/**
 * A format nothing can embed — a .docx, a .xlsx.
 *
 * It still gets a slide rather than a new tab: the user keeps their place in
 * the set, and the toolbar above already holds the two things they can
 * actually do with the file.
 */
function FileSlide({ slide }: { slide: SlideFile }) {
  return (
    <div
      className="xl-lightbox__file"
      {...stopNavigationEventsPropagation()}
    >
      <span className="grid size-14 place-items-center rounded-xl bg-muted text-muted-foreground">
        <FileText className="size-7" />
      </span>
      <span className="max-w-full truncate text-sm font-medium text-foreground">
        {slideTitle(slide)}
      </span>
      <span className="text-xs text-muted-foreground">
        This file type can&apos;t be previewed here — open or download it from the
        toolbar above.
      </span>
    </div>
  )
}
