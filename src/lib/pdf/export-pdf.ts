/**
 * A4 PDF export and printing for generated documents (appointment letters and
 * the like).
 *
 * A template renders one or more `.pdf-section` nodes, each an exact A4 sheet
 * (794 × 1123 CSS px at 96dpi). Download rasterises them with html2canvas-pro
 * and lays each onto a jsPDF page; print hands the same markup to the browser.
 *
 * Rasterising — rather than drawing text with jsPDF's own `text()` — is
 * deliberate: Gujarati and Devanagari need the complex-script shaping (matra
 * reordering, conjuncts) only the browser's text engine does. jsPDF writes
 * glyphs in codepoint order, which turns Indic text into mojibake.
 *
 * `html2canvas-pro` rather than `html2canvas` because it parses the `oklch()`
 * colours Tailwind v4 emits — the original throws on them before drawing.
 * Both libraries are a few hundred kB and only needed once someone clicks
 * Download, so they're imported on demand rather than riding in the screen's chunk.
 */

/** A4 at 96dpi, in CSS pixels. Templates must match these exactly. */
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = 1123

/** The class every page of every template carries — what export looks for. */
export const PDF_SECTION_CLASS = 'pdf-section'

/**
 * html2canvas deep-clones the whole page on every call, so each sheet is one
 * call — slower than one tall capture, but a letter is a few pages and a tall
 * canvas is where browsers start refusing allocations.
 */
async function capturePages(container: HTMLElement, scale: number): Promise<string[]> {
  const sections = Array.from(
    container.querySelectorAll<HTMLElement>(`.${PDF_SECTION_CLASS}`),
  )
  if (sections.length === 0) throw new Error('Nothing to export')

  const { default: html2canvas } = await import('html2canvas-pro')

  // Webfonts must be resolved first, or Gujarati / Hindi fall back to a system
  // face mid-capture and the pages disagree with the preview.
  await document.fonts.ready

  const pages: string[] = []
  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: A4_WIDTH_PX,
    })
    pages.push(canvas.toDataURL('image/jpeg', 0.92))
    // Release the raster straight away — a few A4 sheets at 2× add up.
    canvas.width = 0
    canvas.height = 0
  }
  return pages
}

/**
 * Rasterise every `.pdf-section` inside `container` into one A4 PDF and hand it
 * to the browser as `<filename>.pdf`.
 */
export async function exportSectionsToPdf(
  container: HTMLElement,
  { filename, scale = 2 }: { filename: string; scale?: number },
): Promise<void> {
  const [pages, { jsPDF }] = await Promise.all([
    capturePages(container, scale),
    import('jspdf'),
  ])

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()

  pages.forEach((data, index) => {
    if (index > 0) pdf.addPage()
    pdf.addImage(data, 'JPEG', 0, 0, width, height, undefined, 'FAST')
  })

  pdf.save(`${filename}.pdf`)
}

/**
 * Print `container` through a hidden iframe.
 *
 * `srcdoc` rather than a `blob:` URL: an srcdoc document resolves relative URLs
 * against the app's own address, so the copied `<link>` stylesheets — and the
 * font files they point at — load exactly as they do on the page. A `blob:`
 * document can't resolve them at all.
 */
export function printSections(container: HTMLElement, title: string): Promise<void> {
  const styles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )
    .map((node) => node.outerHTML)
    .join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
${styles}
<style>
  * { box-sizing: border-box; }
  html, body { background: #fff !important; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .${PDF_SECTION_CLASS} {
      width: ${A4_WIDTH_PX}px !important;
      height: ${A4_HEIGHT_PX}px !important;
      overflow: hidden !important;
      break-after: page !important;
      margin: 0 auto !important;
      box-shadow: none !important;
    }
    .${PDF_SECTION_CLASS}:last-child { break-after: auto !important; }
  }
</style>
</head><body>${container.innerHTML}</body></html>`

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'

  return new Promise<void>((resolve) => {
    iframe.onload = async () => {
      const frame = iframe.contentWindow
      // The stylesheet links load after `onload` of the srcdoc itself in some
      // browsers — wait on the frame's fonts so Indic text prints shaped.
      await frame?.document.fonts.ready
      frame?.addEventListener('afterprint', () => iframe.remove())
      frame?.focus()
      frame?.print()
      resolve()
    }
    iframe.srcdoc = html
    document.body.appendChild(iframe)
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  )
}
