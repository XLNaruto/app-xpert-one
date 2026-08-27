import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DropzoneFile } from '@/components/common/file-dropzone'
import type { LightboxSlide } from '@/components/common/image-lightbox'
import { useMediaResolver } from './use-media-url'

/** A file the viewer can show as a picture. */
export const isImageFile = (f: DropzoneFile) =>
  f.url.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name)

/** A file the viewer can embed as a document. */
export const isPdfFile = (f: DropzoneFile) =>
  f.url.startsWith('data:application/pdf') || /\.pdf$/i.test(f.name)

/** Whether the viewer can render the file itself, rather than card it. */
export const canPreviewFile = (f: DropzoneFile) => isImageFile(f) || isPdfFile(f)

/**
 * The preview behind an upload field's thumbnails.
 *
 * A thumbnail is too small to answer the question it raises — is this the right
 * document, is this the right page — and a new tab answers it by leaving the
 * form. So every picked or stored file opens in the app's own lightbox instead:
 * images and PDFs rendered inline, and a format nothing can embed as a card
 * with open/download in the toolbar. Nothing drops the user out of the app, so
 * paging through the set stays possible whatever it holds.
 *
 * Freshly picked files are held as `data:` URLs, which an `<img>` takes happily
 * but a PDF frame refuses in Chrome, and which a new tab refuses outright —
 * every non-image gets a `blob:` URL from the raw `File`, revoked once the file
 * leaves the field or the field unmounts.
 *
 * `open(index)` takes the index in `files`, which is also the slide's: every
 * file has one.
 */
export function useFilePreview(files: DropzoneFile[]) {
  const resolveMedia = useMediaResolver()
  const [index, setIndex] = useState(-1)
  const objectUrls = useRef(new Map<File, string>())

  const objectUrl = useCallback((file: File) => {
    let url = objectUrls.current.get(file)
    if (!url) {
      url = URL.createObjectURL(file)
      objectUrls.current.set(file, url)
    }
    return url
  }, [])

  const slides = useMemo<LightboxSlide[]>(
    () =>
      files.map((file) => {
        if (isImageFile(file)) {
          return { src: resolveMedia(file.url), alt: file.name, caption: file.name }
        }
        return {
          type: isPdfFile(file) ? 'pdf' : 'file',
          src: file.file ? objectUrl(file.file) : resolveMedia(file.url),
          caption: file.name,
        }
      }),
    [files, objectUrl, resolveMedia],
  )

  // A file removed from the field has no slide left to serve, so its blob URL
  // is dead weight in the document — drop it as soon as it goes.
  useEffect(() => {
    const live = new Set(files.map((f) => f.file).filter(Boolean) as File[])
    for (const [file, url] of objectUrls.current) {
      if (!live.has(file)) {
        URL.revokeObjectURL(url)
        objectUrls.current.delete(file)
      }
    }
  }, [files])

  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const open = useCallback((fileIndex: number) => setIndex(fileIndex), [])
  const close = useCallback(() => setIndex(-1), [])

  return { slides, index, setIndex, open, close }
}
