import { useMemo, useState } from 'react'
import { ImageLightbox, type LightboxSlide } from '@/components/common/image-lightbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useMediaResolver } from '@/hooks/use-media-url'
import { proofKind } from '../lib/proof-kind'
import type { ProofFile } from '../types'

/**
 * Handed-in proof, read-only. Photos are thumbnails; documents are chips with
 * their format and name. Every file — photo, PDF, Word, Excel — opens in the
 * app's own lightbox (a document it can't embed gets a card with open /
 * download), so reviewing proof never drops the user into a new tab. `max`
 * folds the rest into a "+N" tile that opens the viewer on the first hidden one.
 */
export function ProofStrip({
  files,
  required = false,
  max = 4,
  size = 'md',
}: {
  files: ProofFile[]
  required?: boolean
  max?: number
  size?: 'sm' | 'md'
}) {
  const [index, setIndex] = useState(-1)
  // The API hands back storage keys; the origin is the `media_path` config.
  const resolveMedia = useMediaResolver()

  const slides = useMemo<LightboxSlide[]>(
    () =>
      files.map((file) => {
        const kind = proofKind(file.name, file.contentType).kind
        const src = resolveMedia(file.key)
        if (kind === 'image') return { src, alt: file.name, caption: file.name }
        return { type: kind === 'pdf' ? 'pdf' : 'file', src, caption: file.name }
      }),
    [files, resolveMedia],
  )

  if (files.length === 0) {
    return (
      <span className={cn('text-xs', required ? 'text-destructive' : 'text-muted-foreground')}>
        {required ? 'Required, none uploaded' : 'None'}
      </span>
    )
  }

  const shown = files.slice(0, max)
  const extra = files.length - shown.length
  const tile = size === 'sm' ? 'h-9' : 'h-12'

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map((file, i) => {
          const kind = proofKind(file.name, file.contentType)
          const Icon = kind.icon
          return (
            <Tooltip key={file.key}>
              <TooltipTrigger asChild>
                {kind.kind === 'image' ? (
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Preview ${file.name}`}
                    className={cn(
                      tile,
                      'aspect-square cursor-zoom-in overflow-hidden rounded-md border border-border bg-muted',
                    )}
                  >
                    <img src={resolveMedia(file.key)} alt={file.name} className="size-full object-cover" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Preview ${file.name}`}
                    className={cn(
                      tile,
                      'flex max-w-44 cursor-pointer items-center gap-2 rounded-md border border-border bg-card pl-1 pr-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5',
                    )}
                  >
                    <span className={cn('grid aspect-square h-[calc(100%-8px)] shrink-0 place-items-center rounded', kind.tone)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-foreground">{file.name}</span>
                      {size === 'md' && (
                        <span className="block text-[10px] font-semibold text-muted-foreground">{kind.label}</span>
                      )}
                    </span>
                  </button>
                )}
              </TooltipTrigger>
              <TooltipContent>{file.name}</TooltipContent>
            </Tooltip>
          )
        })}
        {extra > 0 && (
          <button
            type="button"
            onClick={() => setIndex(max)}
            aria-label={`Show ${extra} more`}
            className={cn(
              tile,
              'grid aspect-square cursor-pointer place-items-center rounded-md border border-border bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground',
            )}
          >
            +{extra}
          </button>
        )}
      </div>
      <ImageLightbox slides={slides} index={index} onIndexChange={setIndex} onClose={() => setIndex(-1)} />
    </>
  )
}
