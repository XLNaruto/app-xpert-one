import { useState } from 'react'
import { FileText, Play } from 'lucide-react'
import { ImageLightbox } from '@/components/common/image-lightbox'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { useMediaResolver } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { formatDuration, formatFileSize } from '../lib/talk-monitoring-mappers'
import type { MessageMedia } from '../types'

/**
 * A message's attachments.
 *
 * Every `file_url` is a storage KEY, so each one is resolved here rather than in
 * the mapper — the base URL is config the client fetches, not something a pure
 * function may read.
 *
 * Images open in the shared lightbox; a clip is played in place; anything else
 * is a file card that opens in a new tab. Nothing is offered as a DOWNLOAD:
 * monitoring is a reading window, and a one-click export of a colleague's
 * attachments is a bigger act than reading one.
 */
export function MonitoringMessageMedia({
  media,
  className,
}: {
  media: MessageMedia[]
  className?: string
}) {
  const resolveMedia = useMediaResolver()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!media.length) return null

  const images = media.filter((item) => item.kind === 'image')

  return (
    <div className={cn('space-y-2', className)}>
      {media.map((item) => {
        const url = resolveMedia(item.fileUrl)
        const thumbnail = resolveMedia(item.thumbnailUrl) || url

        if (item.kind === 'image') {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setLightboxIndex(images.findIndex((image) => image.id === item.id))
              }
              className="block overflow-hidden rounded-lg transition-opacity hover:opacity-90"
            >
              <ImageWithFallback
                src={url}
                alt={item.fileName ?? 'Photo'}
                wrapperClassName="max-h-72 w-full max-w-[16rem] rounded-lg"
                className="object-cover"
              />
            </button>
          )
        }

        if (item.kind === 'video') {
          return (
            <video
              key={item.id}
              src={url}
              poster={thumbnail || undefined}
              controls
              preload="metadata"
              className="max-h-72 w-full max-w-[16rem] rounded-lg bg-black"
            />
          )
        }

        if (item.kind === 'audio') {
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg bg-muted/60 p-2"
            >
              <Play className="size-4 shrink-0 text-muted-foreground" />
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={url} controls preload="none" className="h-8 max-w-[14rem]" />
              {item.durationSeconds != null && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDuration(item.durationSeconds)}
                </span>
              )}
            </div>
          )
        }

        return (
          <a
            key={item.id}
            href={url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex max-w-[16rem] items-center gap-2.5 rounded-lg bg-muted/60 p-2.5 transition-colors hover:bg-muted"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background">
              <FileText className="size-4 text-muted-foreground" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">
                {item.fileName ?? 'Document'}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {formatFileSize(item.sizeBytes) || 'Document'}
              </span>
            </span>
          </a>
        )
      })}

      {lightboxIndex != null && lightboxIndex >= 0 && (
        <ImageLightbox
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          slides={images.map((image) => ({
            src: resolveMedia(image.fileUrl),
            caption: image.fileName ?? 'Photo',
            meta: formatFileSize(image.sizeBytes),
          }))}
        />
      )}
    </div>
  )
}
