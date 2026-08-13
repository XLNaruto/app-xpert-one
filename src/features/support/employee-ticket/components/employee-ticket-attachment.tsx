import { FileText, Paperclip } from 'lucide-react'
import { useMediaUrl } from '@/hooks/use-media-url'
import { cn } from '@/lib/utils'
import { isImageAttachment } from '../lib/employee-ticket-mappers'

/**
 * One attachment on a ticket or a message.
 *
 * The API stores a storage KEY, not a URL — `useMediaUrl()` prefixes it with the
 * `media_path` from `GET /config`. Images preview inline; a PDF gets a link,
 * because those are the only two things the presign signs for.
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

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn('mt-2 block w-fit', className)}
      >
        <img
          src={url}
          alt={name}
          className="max-h-48 rounded-lg border object-contain"
        />
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'mt-2 inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted',
        className,
      )}
    >
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="max-w-64 truncate">{name}</span>
      <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
    </a>
  )
}
