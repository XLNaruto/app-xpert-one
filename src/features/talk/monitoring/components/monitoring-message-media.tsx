import { useCallback, useState } from 'react'
import { ExternalLink, FileText, ImageOff, Music, Play } from 'lucide-react'
import { ImageLightbox } from '@/components/common/image-lightbox'
import { useMediaResolver } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { formatDuration, formatFileSize, mediaLabel } from '../lib/talk-monitoring-mappers'
import type { MessageMedia } from '../types'

/**
 * A message's attachments, laid out the way they were sent.
 *
 * Photos and video frames are ONE ALBUM — a single frame at its own
 * proportions, two to four as a tight grid, anything past the fourth collapsed
 * into a `+N` on it. Stacking them full-width instead (which this used to do)
 * turned a four-photo message into a bubble three screens tall, and a thread of
 * those cannot be read at all: the reader scrolls past attachments looking for
 * the words between them. An album says "four photos" in one glance and in the
 * height of one.
 *
 * Audio and documents stay ROWS beneath it, because a waveform and a filename
 * have nothing to tile.
 *
 * Every `fileUrl`/`thumbnailUrl` the API returns is a storage KEY despite the
 * naming, so each is resolved here — the base URL is config the client fetches,
 * not something a pure mapper may read.
 *
 * Images open in the shared lightbox; a video plays in place, since the viewer
 * carries no video plugin and a monitor watching a clip has not asked to leave
 * the thread. Nothing is offered as a DOWNLOAD: monitoring is a reading window,
 * and a one-click export of a colleague's attachments is a bigger act than
 * reading one.
 */
export function MonitoringMessageMedia({
  media,
  own,
  className,
}: {
  media: MessageMedia[]
  /** The monitored person's own bubble — the saturated one, so rows tint darker. */
  own: boolean
  className?: string
}) {
  const resolveMedia = useMediaResolver()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!media.length) return null

  const tiles = media.filter((item) => item.kind === 'image' || item.kind === 'video')
  const rows = media.filter((item) => item.kind !== 'image' && item.kind !== 'video')
  // The lightbox pages through the bubble's PHOTOS — including any hidden
  // behind a `+N`, so the overflow is reachable without a second screen.
  const images = media.filter((item) => item.kind === 'image')

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {tiles.length > 0 && (
        <MediaAlbum
          tiles={tiles}
          onOpenImage={(item) =>
            setLightboxIndex(images.findIndex((image) => image.id === item.id))
          }
        />
      )}

      {rows.map((item) => (
        <MediaRow key={item.id} media={item} own={own} />
      ))}

      {lightboxIndex != null && lightboxIndex >= 0 && (
        <ImageLightbox
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          slides={images.map((image) => ({
            src: resolveMedia(image.fileUrl),
            caption: mediaLabel(image),
            meta: formatFileSize(image.sizeBytes),
          }))}
        />
      )}
    </div>
  )
}

/** At most four tiles are drawn; the fourth carries a `+N` for the rest. */
const ALBUM_TILES = 4

/**
 * The album.
 *
 * A three-up leads with a full-width banner, the way every chat client draws it
 * — a 2×2 with a hole in it reads as a missing photo rather than as three.
 */
function MediaAlbum({
  tiles,
  onOpenImage,
}: {
  tiles: MessageMedia[]
  onOpenImage: (media: MessageMedia) => void
}) {
  const visible = tiles.slice(0, ALBUM_TILES)
  const extra = tiles.length - visible.length
  const count = visible.length
  // A lone tile sizes the bubble from its own frame, so the grid shrinks to it
  // (`w-fit`) rather than stretching it out to the column's full width.
  const solo = count === 1

  return (
    <div
      className={cn(
        // `rounded-lg` (8px), not the bubble's own `rounded-2xl`: the album sits
        // inside 4px of bubble padding, and a nested corner has to be the outer
        // radius minus that gap, or the two curves run at different rates and
        // the photo reads as bulging out of its frame.
        'grid gap-0.5 overflow-hidden rounded-lg',
        solo ? 'w-fit max-w-full grid-cols-1' : 'w-64 max-w-full grid-cols-2',
      )}
    >
      {visible.map((item, index) => (
        <AlbumTile
          key={item.id}
          media={item}
          solo={solo}
          extraCount={index === visible.length - 1 ? extra : 0}
          onOpenImage={onOpenImage}
          className={cn(
            count > 1 && 'aspect-square',
            count === 3 && index === 0 && 'col-span-2 aspect-[2/1]',
          )}
        />
      ))}
    </div>
  )
}

/** Natural pixel size of a photo or a video frame, or null before it is known. */
type MediaSize = { w: number; h: number } | null

/**
 * Natural sizes already learnt, keyed by the attachment's own storage key.
 *
 * It has to outlive the component, and that is the whole point. A tile that
 * measures itself on load and keeps the answer in `useState` FORGETS it the
 * moment the row scrolls out of the virtualized window — and the thread is
 * virtualized, so that happens constantly. On the way back in the tile reverts
 * to the fluid box, which is a different HEIGHT from the one it had settled
 * into; the row changes size, that moves the edges of the mounted window, which
 * unmounts and remounts other image rows, which forget and re-learn their sizes
 * in turn. Learning a size once per attachment per session is what breaks the
 * loop: the second mount is the same shape as the first, so nothing moves.
 */
const naturalSizes = new Map<string, { w: number; h: number }>()

/** Bounded, so a long session in a media-heavy account doesn't keep every frame
    it ever drew. Oldest out first — those are the furthest from the viewport. */
const NATURAL_SIZE_CAP = 500

function rememberNaturalSize(key: string, size: { w: number; h: number }): void {
  if (naturalSizes.size >= NATURAL_SIZE_CAP) {
    const oldest = naturalSizes.keys().next()
    if (!oldest.done) naturalSizes.delete(oldest.value)
  }
  naturalSizes.set(key, size)
}

/**
 * A LONE attachment is sized by its OWN frame: one photo in a bubble has
 * nothing to line up with, so neither cropping it square nor padding it out to
 * a guessed shape is right.
 *
 * There is deliberately no fallback BOX. A fixed portrait well for an
 * unmeasured tile letterboxes every landscape photo the API did not measure, so
 * an unmeasured tile flows at the picture's own proportions instead, capped on
 * both axes — and `soloBox()` reproduces exactly the shape it settles into, so
 * learning the size never moves anything.
 */
const SOLO_MAX_WIDTH = 320
const SOLO_MAX_HEIGHT = 380

/** Shrink-to-fit around the picture, capped on both axes. */
const SOLO_FLUID = 'w-fit max-w-[320px] min-h-24 min-w-24'

/**
 * The exact box for a frame whose real proportions are known.
 *
 * A width plus the ratio rather than a width and a height: the bubble can be
 * narrower than the cap on a small window, and an `aspect-ratio` keeps the box
 * matched to the photo as it clamps, where a fixed height would letterbox again.
 */
function soloBox(size: { w: number; h: number }) {
  const scale = Math.min(1, SOLO_MAX_WIDTH / size.w, SOLO_MAX_HEIGHT / size.h)
  return { width: Math.round(size.w * scale), aspectRatio: `${size.w} / ${size.h}` }
}

function AlbumTile({
  media,
  solo,
  extraCount,
  className,
  onOpenImage,
}: {
  media: MessageMedia
  solo: boolean
  /** Drawn over the last visible tile when the album holds more than four. */
  extraCount: number
  className?: string
  onOpenImage: (media: MessageMedia) => void
}) {
  const resolveMedia = useMediaResolver()
  const src = resolveMedia(media.fileUrl)
  const poster = resolveMedia(media.thumbnailUrl)
  const label = mediaLabel(media)
  const isVideo = media.kind === 'video'

  /** Playing in place: a video tile is a frame until it is asked to be a player. */
  const [playing, setPlaying] = useState(false)

  /**
   * Seeded from the payload when the API named the dimensions — the common case,
   * which means the right box is picked on the FIRST paint with no reflow once
   * the bytes decode. Otherwise the element measures itself on load, and what it
   * measures is banked in `naturalSizes` so the next mount matches this one.
   */
  const sizeKey = media.fileUrl
  const [size, setSize] = useState<MediaSize>(
    () =>
      (media.width && media.height ? { w: media.width, h: media.height } : null) ??
      naturalSizes.get(sizeKey) ??
      null,
  )

  const learnSize = useCallback(
    (next: MediaSize) => {
      if (!next) return
      const held = naturalSizes.get(sizeKey)
      if (held && held.w === next.w && held.h === next.h) return
      rememberNaturalSize(sizeKey, next)
      setSize(next)
    },
    [sizeKey],
  )

  // A solo tile with a known frame is an exact box, so the picture fills it and
  // `contain` has nothing to letterbox. Unmeasured, the picture IS the box: it
  // keeps its own height and the caps stop it running away.
  const fitClass = !solo
    ? 'size-full object-cover'
    : size
      ? 'size-full object-contain'
      : 'block h-auto w-auto max-h-[380px] max-w-full'

  const boxClass = cn(
    'relative block overflow-hidden',
    (!solo || size) && 'size-full',
    // A grid tile fills its square, so its backdrop only shows while the
    // picture loads. A solo frame's box is the photo's own shape, so its
    // backdrop is only ever the loading plate — a `--foreground` tint, which is
    // a light plate on the saturated bubble and a soft grey on the plain one
    // without naming either theme's colour.
    solo ? cn(!size && SOLO_FLUID, 'bg-foreground/10') : 'bg-black/15',
  )

  const frame = isVideo ? (
    playing ? (
      <video
        src={src}
        poster={poster || undefined}
        controls
        autoPlay
        preload="metadata"
        className={cn(fitClass, 'bg-black')}
      />
    ) : (
      // A frame, not a player, until it is clicked: `preload="metadata"` shows
      // the first frame when the API gave no thumbnail — without pulling whole
      // files into a virtualized list — and is also what reports the frame's
      // size when the payload didn't.
      <video
        src={src}
        poster={poster || undefined}
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
        className={fitClass}
        onLoadedMetadata={(event) => {
          const element = event.currentTarget
          if (element.videoWidth && element.videoHeight) {
            learnSize({ w: element.videoWidth, h: element.videoHeight })
          }
        }}
      />
    )
  ) : (
    <TileImage
      src={src}
      alt={label}
      width={media.width}
      height={media.height}
      imgClassName={fitClass}
      onNaturalSize={learnSize}
    />
  )

  return (
    <span
      className={cn('relative block', solo ? 'w-fit max-w-full' : className)}
      style={solo && size ? { ...soloBox(size), maxWidth: '100%' } : undefined}
    >
      {/* A playing video owns its own controls, so it must not sit inside a
          button — the click would be swallowed by the wrapper instead of
          reaching the scrubber. */}
      {isVideo && playing ? (
        <span className={boxClass}>{frame}</span>
      ) : (
        <button
          type="button"
          onClick={() => (isVideo ? setPlaying(true) : onOpenImage(media))}
          aria-label={
            extraCount > 0
              ? `Open ${label} and ${extraCount} more`
              : isVideo
                ? `Play ${label}`
                : `Open ${label}`
          }
          className={cn(boxClass, isVideo ? 'cursor-pointer' : 'cursor-zoom-in')}
        >
          {frame}

          {isVideo && extraCount === 0 && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-9 items-center justify-center rounded-full bg-black/55">
                <Play className="size-4 fill-white text-white" aria-hidden />
              </span>
            </span>
          )}

          {isVideo && media.durationSeconds != null && extraCount === 0 && (
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/60 px-1.5 text-[10px] text-white">
              {formatDuration(media.durationSeconds)}
            </span>
          )}

          {extraCount > 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-semibold text-white">
              +{extraCount}
            </span>
          )}
        </button>
      )}
    </span>
  )
}

/**
 * A tile's picture.
 *
 * Never the browser's broken-image glyph: a monitored attachment may be gone
 * from storage, or merely still arriving, and those are different facts. An
 * unloaded tile is a plain pulsing block and a failed one says so with an icon.
 */
function TileImage({
  src,
  alt,
  width,
  height,
  imgClassName,
  onNaturalSize,
}: {
  src: string
  alt: string
  width: number | null
  height: number | null
  imgClassName?: string
  /** Reports the decoded frame's size, for tiles the payload left unmeasured. */
  onNaturalSize?: (size: MediaSize) => void
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  /**
   * The src the state above is ABOUT.
   *
   * A tile can mount before the media base URL has been fetched, in which case
   * the resolver hands back the bare storage key and the picture fails — and
   * then the base arrives and the same tile is given a URL that works. Without
   * this the tile stayed on its failure and the thread was full of `ImageOff`
   * icons for files that were there all along. Tracked in render rather than in
   * an effect so the new src is never painted through the old verdict.
   */
  const [attempted, setAttempted] = useState(src)
  if (attempted !== src) {
    setAttempted(src)
    setState('loading')
  }

  if (!src || (state === 'failed' && attempted === src)) {
    // `min-h` because a landscape tile has no height of its own — it borrows the
    // picture's, and there is no picture here.
    return (
      <span className="flex size-full min-h-24 items-center justify-center bg-black/10">
        {src ? (
          <ImageOff className="size-5 opacity-60" aria-label={alt} />
        ) : (
          <span className="size-full animate-pulse bg-black/10" aria-label={alt} />
        )}
      </span>
    )
  }

  return (
    <>
      {state === 'loading' && (
        <span className="absolute inset-0 animate-pulse bg-black/10" aria-hidden />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={(event) => {
          setState('ready')
          const element = event.currentTarget
          if (element.naturalWidth && element.naturalHeight) {
            onNaturalSize?.({ w: element.naturalWidth, h: element.naturalHeight })
          }
        }}
        onError={() => setState('failed')}
        className={cn(
          'transition-opacity duration-200',
          imgClassName ?? 'size-full object-cover',
          state === 'ready' ? 'opacity-100' : 'opacity-0',
        )}
        // An intrinsic size stops the thread jumping as each image decodes.
        width={width ?? undefined}
        height={height ?? undefined}
      />
    </>
  )
}

/** Audio and documents — the attachments an album cannot tile. */
function MediaRow({ media, own }: { media: MessageMedia; own: boolean }) {
  const resolveMedia = useMediaResolver()
  const src = resolveMedia(media.fileUrl)
  const label = mediaLabel(media)
  // On the saturated bubble a tint of black is the only plate that stays legible
  // in both themes; on the plain one it is the muted surface.
  const plate = own ? 'bg-black/15' : 'bg-muted/70'

  if (media.kind === 'audio') {
    return (
      <div className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5', plate)}>
        <Music className="size-4 shrink-0 opacity-80" aria-hidden />
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={src} controls preload="metadata" className="h-8 min-w-0 flex-1" />
        {media.durationSeconds != null && (
          <span className="shrink-0 text-[10px] tabular-nums opacity-80">
            {formatDuration(media.durationSeconds)}
          </span>
        )}
      </div>
    )
  }

  const size = formatFileSize(media.sizeBytes)

  return (
    <a
      href={src || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex w-full max-w-[16rem] items-center gap-2.5 rounded-lg px-2 py-2 transition-opacity hover:opacity-90',
        plate,
      )}
    >
      <FileText className="size-5 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{label}</span>
        <span className="block text-[10px] opacity-80">{size || 'Document'}</span>
      </span>
      {/* Opened, never saved — see the note on this file. */}
      <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  )
}
