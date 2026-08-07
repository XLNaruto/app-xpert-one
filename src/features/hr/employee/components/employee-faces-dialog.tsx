import { ScanFace, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { useMediaResolver } from '@/hooks/use-media-url'
import type { Employee } from '../types'

/**
 * The face images one employee has enrolled for attendance recognition.
 *
 * Read-only apart from the clear: faces are captured in the mobile app, and the
 * portal's only write is `DELETE …/face`, which de-registers the face and purges
 * every picture at once — the API has no per-image delete, so the footer clears
 * the whole set and the person registers again from the app.
 */
export function EmployeeFacesDialog({
  employee,
  onClose,
  onClearFaces,
  isClearing,
}: {
  /** `null` keeps the dialog closed — it's the open state and the subject in one. */
  employee: Employee | null
  onClose: () => void
  onClearFaces: () => void
  isClearing: boolean
}) {
  const resolveUrl = useMediaResolver()

  if (!employee) return null

  const faces = employee.faces
  const fullName = [employee.prefix, employee.name].filter(Boolean).join(' ') || 'Employee'
  const initial = (employee.name || '?').trim().charAt(0).toUpperCase()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl p-0"
        onClose={onClose}
        aria-labelledby="employee-faces-title"
      >
        {/* Who these faces belong to — name, code and how many are enrolled. */}
        <div className="flex items-center gap-3 border-b px-6 py-4 pr-14">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initial}
          </span>
          <div className="min-w-0 leading-tight">
            <h2
              id="employee-faces-title"
              className="font-heading text-lg font-semibold text-foreground"
            >
              {fullName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {employee.code && (
                <span className="font-mono font-medium text-primary">#{employee.code}</span>
              )}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <ScanFace className="size-3.5" />
                {faces.length} {faces.length === 1 ? 'face' : 'faces'}
              </span>
            </div>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Registered faces
            </span>
            <Badge variant="secondary">{faces.length}</Badge>
          </div>

          {faces.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No face images are registered for this employee.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {faces.map((face, index) => (
                <figure
                  key={face.id}
                  className="overflow-hidden rounded-xl border bg-muted/30"
                >
                  <div className="relative">
                    {/* The capture order is what an admin refers to a shot by. */}
                    <span className="absolute left-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-foreground/70 text-xs font-semibold text-background">
                      {index + 1}
                    </span>
                    <ImageWithFallback
                      src={resolveUrl(face.url || face.key)}
                      alt={`${fullName} face ${index + 1}`}
                      wrapperClassName="aspect-square w-full bg-muted"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="truncate px-3 py-2 text-sm text-foreground">
                    Face {index + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Faces are captured in the mobile app. Deleting them de-registers the
            face entirely — the employee has to register again from the app.
          </p>
          {faces.length > 0 && (
            <Button
              variant="destructive"
              onClick={onClearFaces}
              disabled={isClearing}
              className="shrink-0"
            >
              <Trash2 className="size-4" />
              {isClearing ? 'Deleting…' : 'Delete faces'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
