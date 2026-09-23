/**
 * Render a document template into a detached DOM host and export it.
 *
 * Exporting straight from the on-screen preview would pin the preview to 100%:
 * html2canvas measures the live boxes, so a zoomed ancestor corrupts the
 * capture. Rendering a throwaway copy at exactly A4 width leaves the preview
 * free to scale however it likes.
 */
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import {
  A4_WIDTH_PX,
  PDF_SECTION_CLASS,
  exportSectionsToPdf,
  printSections,
} from './export-pdf'

/**
 * One paint, or 60ms — whichever lands first. `requestAnimationFrame` stops
 * firing in a backgrounded tab, and people do switch away mid-export.
 */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 60)
    requestAnimationFrame(() => {
      clearTimeout(timer)
      resolve()
    })
  })

/**
 * Wait until a measure-and-paginate template has settled: the sheet count has
 * held for two frames in a row.
 */
async function waitForStableLayout(host: HTMLElement, timeoutMs = 4000) {
  const start = performance.now()
  let previous = -1
  let stableFrames = 0

  while (performance.now() - start < timeoutMs) {
    const count = host.querySelectorAll(`.${PDF_SECTION_CLASS}`).length
    if (count > 0 && count === previous) {
      stableFrames += 1
      if (stableFrames >= 2) return
    } else {
      stableFrames = 0
    }
    previous = count
    await nextFrame()
  }
}

async function withDetachedRender<T>(
  element: ReactElement,
  run: (host: HTMLElement) => Promise<T>,
): Promise<T> {
  // The shell parks the render off-screen; the host inside stays a plain
  // static block, the only geometry html2canvas reads reliably.
  const shell = document.createElement('div')
  shell.setAttribute('aria-hidden', 'true')
  shell.style.cssText =
    'position:fixed;left:-99999px;top:0;pointer-events:none;z-index:-1;'
  const host = document.createElement('div')
  host.style.cssText = `width:${A4_WIDTH_PX}px;background:#ffffff;`
  shell.appendChild(host)
  document.body.appendChild(shell)

  const root = createRoot(host)
  try {
    root.render(element)
    await nextFrame()
    await document.fonts.ready
    await waitForStableLayout(host)
    return await run(host)
  } finally {
    // Unmounting synchronously from inside a render pass isn't allowed.
    setTimeout(() => {
      root.unmount()
      shell.remove()
    }, 0)
  }
}

/** Render `element` off-screen and save it as an A4 PDF. */
export const downloadDocument = (element: ReactElement, filename: string) =>
  withDetachedRender(element, (host) => exportSectionsToPdf(host, { filename }))

/** Render `element` off-screen and send it to the printer. */
export const printDocument = (element: ReactElement, title: string) =>
  withDetachedRender(element, (host) => printSections(host, title))
