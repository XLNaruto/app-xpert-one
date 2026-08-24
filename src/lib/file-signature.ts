/**
 * Content-based file type checking — "is this really a PNG?".
 *
 * Everything else in the app validates a picked file by its **name**: the
 * dropzone's `types` list and the `accept` string both look at the extension,
 * and `file.type` is derived by the browser from that same extension. So a
 * `virus.exe` renamed to `photo.png` passes every one of those checks.
 *
 * These helpers read the first bytes of the file instead and compare the magic
 * number against the extension the file claims. A renamed file fails here, with
 * a message a form or a toast can show.
 *
 * Formats without a signature at all (CSV and other plain text) can't be
 * verified this way — they're accepted, since there is nothing to contradict.
 */

interface Signature {
  mime: string
  /** Extensions this signature legitimately backs. */
  extensions: string[]
  /** A human name for the message shown when a file is really this. */
  label: string
  test: (bytes: Uint8Array) => boolean
}

/** How much of the head we read — enough for every signature below. */
const HEAD_BYTES = 512

const startsWith = (bytes: Uint8Array, magic: number[]) =>
  magic.every((byte, i) => bytes[i] === byte)

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length))

const SIGNATURES: Signature[] = [
  {
    mime: 'image/png',
    extensions: ['png'],
    label: 'PNG image',
    test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mime: 'image/jpeg',
    extensions: ['jpg', 'jpeg'],
    label: 'JPEG image',
    test: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  {
    mime: 'image/webp',
    extensions: ['webp'],
    label: 'WebP image',
    test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP',
  },
  {
    mime: 'image/gif',
    extensions: ['gif'],
    label: 'GIF image',
    test: (b) => ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a',
  },
  {
    mime: 'application/pdf',
    extensions: ['pdf'],
    label: 'PDF document',
    test: (b) => ascii(b, 0, 5) === '%PDF-',
  },
  {
    // xlsx/docx are zip containers, so the zip signature is as far as bytes
    // alone can take us — enough to catch a renamed image or executable.
    mime: 'application/zip',
    extensions: ['xlsx', 'docx', 'zip'],
    label: 'ZIP archive',
    test: (b) => startsWith(b, [0x50, 0x4b]) && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  },
  {
    mime: 'image/bmp',
    extensions: ['bmp'],
    label: 'BMP image',
    test: (b) => ascii(b, 0, 2) === 'BM',
  },
]

/** Extensions we can actually verify — anything else is left alone. */
const VERIFIABLE_EXTENSIONS = new Set(SIGNATURES.flatMap((s) => s.extensions))

/** The file's own extension, lowercased and without the dot (`''` if none). */
export function fileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : ''
}

/** Read the head of a file as bytes. */
async function readHead(file: File): Promise<Uint8Array> {
  const buffer = await file.slice(0, HEAD_BYTES).arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * What the bytes say the file actually is — `null` when no known signature
 * matches (a plain-text file, or a format not listed above).
 */
export async function sniffFileType(file: File): Promise<Signature | null> {
  const head = await readHead(file)
  return SIGNATURES.find((signature) => signature.test(head)) ?? null
}

/**
 * Check a picked file's real contents against the extension it claims and, when
 * given, the set of content types the destination accepts.
 *
 * Returns an error message to show, or `null` when the file is fine.
 *
 * ```ts
 * const error = await checkFileContent(file, IMAGE_CONTENT_TYPES)
 * if (error) { toasterrormsg(error); return }
 * ```
 */
export async function checkFileContent(
  file: File,
  allowed?: readonly string[],
): Promise<string | null> {
  const extension = fileExtension(file.name)
  const sniffed = await sniffFileType(file)

  if (!sniffed) {
    // An extension we know how to verify but no matching signature: the file is
    // not what it says it is (a renamed .exe, .txt or .zip-bomb, say).
    if (VERIFIABLE_EXTENSIONS.has(extension)) {
      return `This file isn't a real .${extension} file — its contents don't match its extension.`
    }
    return null
  }

  // Bytes recognised, but the name claims something else — the rename case.
  if (VERIFIABLE_EXTENSIONS.has(extension) && !sniffed.extensions.includes(extension)) {
    return `This file is a ${sniffed.label} renamed to .${extension}. Upload it with its real extension.`
  }

  // Real type identified — make sure the destination actually takes it, even
  // when the extension was never in our verifiable set.
  if (allowed && !allowed.includes(sniffed.mime)) {
    return `${sniffed.label} files aren't supported here.`
  }

  return null
}
