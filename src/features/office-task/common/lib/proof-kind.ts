import { FileImage, FileSpreadsheet, FileText, FileType2, type LucideIcon } from 'lucide-react'

/** How a proof file is drawn — one look per format, shared by the uploader and the viewer. */
export interface ProofKind {
  kind: 'image' | 'pdf' | 'word' | 'excel' | 'file'
  icon: LucideIcon
  /** Short badge text — `PDF`, `DOCX`, … */
  label: string
  /** Tile background + icon colour. */
  tone: string
}

const TONES: Record<ProofKind['kind'], { icon: LucideIcon; tone: string }> = {
  image: { icon: FileImage, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  pdf: { icon: FileText, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  word: { icon: FileType2, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  excel: { icon: FileSpreadsheet, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  file: { icon: FileText, tone: 'bg-muted text-muted-foreground' },
}

/** A file's format, from its content type when known, else its extension. */
export function proofKind(name: string, contentType = ''): ProofKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const type = contentType.toLowerCase()
  const kind: ProofKind['kind'] =
    type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)
      ? 'image'
      : type === 'application/pdf' || ext === 'pdf'
        ? 'pdf'
        : type.includes('word') || ['doc', 'docx'].includes(ext)
          ? 'word'
          : type.includes('sheet') || type.includes('excel') || ['xls', 'xlsx'].includes(ext)
            ? 'excel'
            : 'file'
  return { kind, ...TONES[kind], label: ext ? ext.toUpperCase() : 'FILE' }
}

/** `532 KB`, `1.4 MB`. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
