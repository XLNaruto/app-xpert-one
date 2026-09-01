import { useState } from 'react'
import { Expand, FileText, Paperclip } from 'lucide-react'
import { ImageLightbox } from '@/components/common/image-lightbox'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { isImageAttachment } from '../lib/employee-ticket-mappers'

/**
 * One attachment on a ticket or a message.
 *
 * The API stores a storage KEY, not a URL — `useMediaUrl()` prefixes it with the
 * `media_path` from `GET /config`. Both an image and a PDF open in the app's own
 * viewer rather than a new tab: the thumbnail is too small to answer the
 * question it raises, and losing the thread to a tab to read one payslip is a
 * poor trade.
 */
export function EmployeeTicketAttachment({
  attachmentKey,
  className,
}: {
  attachmentKey: string
  className?: string
}) {
  const url = useMediaUrl(attachmentKey)
  const isImage = isImageAttachment(attachmentKey)
  /** The key keeps a slug of the original name after a uuid — enough to label it. */
  const name = attachmentKey.split('/').pop() ?? 'attachment'
  const [isOpen, setIsOpen] = useState(false)

  const viewer = isOpen && (
    <ImageLightbox
      index={0}
      onClose={() => setIsOpen(false)}
      slides={[
        isImage
          ? { src: url, caption: name }
          : { type: 'pdf' as const, src: url, caption: name },
      ]}
    />
  )

  if (isImage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={`Open ${name}`}
          className={cn(
            'group relative mt-2 block w-fit cursor-pointer overflow-hidden rounded-xl border',
            className,
          )}
        >
          <img src={url} alt={name} className="max-h-56 object-contain" />
          {/* Nothing about a picture says it can be opened — the hover does. */}
          <span className="absolute inset-0 hidden place-items-center bg-black/35 text-white transition-opacity group-hover:grid">
            <Expand className="size-5" />
          </span>
        </button>
        {viewer}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-background',
          className,
        )}
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="max-w-64 truncate">{name}</span>
        <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      {viewer}
    </>
  )
}
