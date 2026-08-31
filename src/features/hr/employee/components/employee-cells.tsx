import {
  CalendarDays,
  Eye,
  History,
  Mail,
  Pencil,
  ScanFace,
  Trash2,
  UserMinus,
} from 'lucide-react'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu'
import { useMediaUrl } from '@/hooks/use-media-url'
import type { Employee } from '../types'

/** The list's presentational cells, kept out of the page's column definitions. */

/**
 * Photo, name and employee code in one cell — the column a reader scans by. The
 * code sits under the name because it's what tells two people with the same name
 * apart, and it's how the API's search matches too.
 */
export function EmployeeIdentityCell({ employee }: { employee: Employee }) {
  const label = [employee.prefix, employee.name].filter(Boolean).join(' ')
  const photoUrl = useMediaUrl(employee.photo)

  return (
    <div className="flex items-center gap-3">
      <ImageWithFallback
        src={photoUrl}
        alt={employee.name || 'Employee photo'}
        wrapperClassName="size-9 shrink-0 rounded-full ring-1 ring-border"
        className="object-cover"
      />
      <div className="leading-tight">
        <span className="block font-medium text-foreground">{label || '—'}</span>
        <span className="block text-xs text-muted-foreground">
          {employee.code || 'No code yet'}
        </span>
      </div>
    </div>
  )
}

/**
 * The list's row actions, collapsed behind one "Actions" dropdown so the column
 * stays one button wide however many entries the row grows.
 *
 * View and Edit are the two ways into the record and are always there. The rest
 * are optional: each renders only when its handler is passed, so nothing dead
 * shows in the menu. Service History opens the wizard straight on step 8 —
 * closing a posting is the register's own action, and reaching it shouldn't mean
 * walking the whole wizard. There is no Delete on this screen — the API exposes no
 * `DELETE /user/employees/:id`, and deliberately so, since payroll, attendance
 * and leave history all reference the row. Taking someone off strength means
 * closing their open posting, which is done from the Service History tab where
 * the leaving date and reason are chosen.
 */
export function EmployeeRowActions({
  onView,
  onEdit,
  onServiceHistory,
  onViewFaces,
  onDeleteFaces,
  faceCount = 0,
  onDelete,
  onDeactivate,
  onViewAttendance,
  onAppointmentLetter,
}: {
  /** Omitted when the role may not read / edit an employee — the entry is dropped. */
  onView?: () => void
  onEdit?: () => void
  /** Jumps into the Employee Service History step of the wizard. */
  onServiceHistory?: () => void
  /** Both shown only when the row actually carries face images. */
  onViewFaces?: () => void
  onDeleteFaces?: () => void
  faceCount?: number
  onDelete?: () => void
  onDeactivate?: () => void
  onViewAttendance?: () => void
  onAppointmentLetter?: () => void
}) {
  const actions: RowAction[] = []

  if (onView) actions.push({ label: 'View Details', icon: Eye, onSelect: onView })
  if (onEdit) actions.push({ label: 'Edit Details', icon: Pencil, onSelect: onEdit })
  if (onServiceHistory)
    actions.push({
      label: 'Service History',
      icon: History,
      onSelect: onServiceHistory,
    })

  // An employee with no enrolled face has nothing to show and nothing to clear,
  // so both entries are absent rather than disabled.
  if (faceCount > 0) {
    if (onViewFaces)
      actions.push({
        label: `View Faces (${faceCount})`,
        icon: ScanFace,
        onSelect: onViewFaces,
      })
    // Clearing is reachable without opening the dialog first — the confirm names
    // the count, so the menu is a safe place for it.
    if (onDeleteFaces)
      actions.push({
        label: 'Delete Faces',
        icon: Trash2,
        onSelect: onDeleteFaces,
        destructive: true,
      })
  }

  if (onDelete)
    actions.push({ label: 'Delete', icon: Trash2, onSelect: onDelete, destructive: true })
  if (onDeactivate)
    actions.push({ label: 'Deactive Employee', icon: UserMinus, onSelect: onDeactivate })
  if (onViewAttendance)
    actions.push({
      label: 'View Attendance',
      icon: CalendarDays,
      onSelect: onViewAttendance,
    })
  if (onAppointmentLetter)
    actions.push({
      label: 'Appointment Letter',
      icon: Mail,
      onSelect: onAppointmentLetter,
    })

  return <RowActionsMenu actions={actions} />
}
