import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { shiftOptions, useShifts } from '@/features/master/shift'
import {
  employeeRosterSchema,
  employeeShiftAssignmentSchema,
  type EmployeeRosterFormValues,
  type EmployeeShiftAssignmentFormValues,
} from '../schemas'
import { todayIso } from '../lib/employee-dates'
import { useEmployee } from '../api/use-employees'
import {
  useEmployeeRoster,
  useEmployeeShiftAssignments,
  useEmployeeShiftOnDay,
} from '../api/use-employee-shifts'
import {
  useCreateEmployeeRosterEntry,
  useCreateEmployeeShiftAssignment,
  useDeleteEmployeeRosterEntry,
  useDeleteEmployeeShiftAssignment,
} from '../api/use-employee-shift-mutations'
import type { EmployeeRosterEntry, EmployeeShiftAssignment } from '../types'

/** Which dialog of the tab is open, if any. */
type ShiftDialog = 'assign' | 'roster' | null

/** The first and last day of the month a `YYYY-MM-DD` date falls in. */
function monthBounds(date: string): { from: string; to: string } {
  const anchor = new Date(`${date}T00:00:00`)
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const pad = (value: number) => String(value).padStart(2, '0')
  // Day 0 of the next month is the last day of this one — no month-length table.
  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  }
}

/** Shift the window by whole months, keeping it aligned to month boundaries. */
function shiftMonth(from: string, months: number): { from: string; to: string } {
  const anchor = new Date(`${from}T00:00:00`)
  anchor.setMonth(anchor.getMonth() + months)
  const pad = (value: number) => String(value).padStart(2, '0')
  return monthBounds(
    `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}-${pad(1)}`,
  )
}

/**
 * Step 9 — the employee's shift.
 *
 * Three things sit on the tab, and they are three different kinds of statement:
 *
 * 1. **The resolved answer for a date.** Not stored anywhere — the server walks
 *    roster → assignment → department → company and says which link
 *    answered. That `source` is the point of the card: it separates "General,
 *    because it's the company default" (nothing here to undo) from "General,
 *    because somebody rostered it" (one row to remove).
 * 2. **The assignment timeline.** Effective-dated and append-only. Writing one is
 *    only necessary when the employee DEVIATES from the default, and an entry
 *    naming no shift is how a deviation ENDS.
 * 3. **The roster.** Per-date overrides, read a month at a time, outranking
 *    everything. Safe to delete, unlike a timeline entry.
 *
 * The shift dropdown is scoped to the employee's own company.
 */
export function useEmployeeShiftTab(employeeId: number) {
  const sessionCompanyId = useAuthStore((state) => state.user?.companyId ?? undefined)
  // Already in the cache: the wizard read this employee to draw its header.
  const employee = useEmployee(employeeId)
  const companyId = employee.data?.companyId ?? sessionCompanyId

  /** The date the resolved-shift card is answering for. */
  const [lookupDate, setLookupDate] = useState(todayIso())
  /** The roster window — a month at a time, which is how a roster is read. */
  const [window, setWindow] = useState(() => monthBounds(todayIso()))

  const shiftOnDay = useEmployeeShiftOnDay(employeeId, lookupDate)
  const timeline = useEmployeeShiftAssignments(employeeId)
  const roster = useEmployeeRoster(employeeId, window.from, window.to)

  // Whole masters, not pages — these are dropdowns.
  const shifts = useShifts(undefined, companyId)

  const createAssignment = useCreateEmployeeShiftAssignment(employeeId)
  const deleteAssignment = useDeleteEmployeeShiftAssignment(employeeId)
  const createRosterEntry = useCreateEmployeeRosterEntry(employeeId)
  const deleteRosterEntry = useDeleteEmployeeRosterEntry(employeeId)

  const [dialog, setDialog] = useState<ShiftDialog>(null)
  const [pendingAssignmentDelete, setPendingAssignmentDelete] =
    useState<EmployeeShiftAssignment | null>(null)
  const [pendingRosterDelete, setPendingRosterDelete] =
    useState<EmployeeRosterEntry | null>(null)

  const assignForm = useForm<EmployeeShiftAssignmentFormValues>({
    resolver: zodResolver(employeeShiftAssignmentSchema),
    defaultValues: {
      mode: 'shift',
      shiftId: '',
      effectiveDate: todayIso(),
    },
  })

  const rosterForm = useForm<EmployeeRosterFormValues>({
    resolver: zodResolver(employeeRosterSchema),
    defaultValues: { workDate: todayIso(), shiftId: '' },
  })

  const shiftSelectOptions = useMemo(
    () => shiftOptions(shifts.data?.items ?? []),
    [shifts.data],
  )

  const openAssign = () => {
    assignForm.reset({
      mode: 'shift',
      shiftId: '',
      effectiveDate: todayIso(),
    })
    setDialog('assign')
  }

  const openRoster = (workDate?: string) => {
    rosterForm.reset({ workDate: workDate ?? lookupDate, shiftId: '' })
    setDialog('roster')
  }

  const closeDialog = () => setDialog(null)

  const onSubmitAssignment = assignForm.handleSubmit((values) => {
    createAssignment.mutate(values, {
      onSuccess: () => {
        toast.success(
          values.mode === 'default'
            ? 'Assignment ended — the employee follows the default again'
            : 'Shift assignment saved',
        )
        closeDialog()
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't save the shift assignment.")),
    })
  })

  const onSubmitRoster = rosterForm.handleSubmit((values) => {
    createRosterEntry.mutate(values, {
      onSuccess: () => {
        toast.success('Shift overridden for that date')
        closeDialog()
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't override the shift.")),
    })
  })

  const confirmAssignmentDelete = () => {
    if (!pendingAssignmentDelete) return
    deleteAssignment.mutate(pendingAssignmentDelete.id, {
      onSuccess: () => {
        toast.success('Timeline entry removed')
        setPendingAssignmentDelete(null)
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't remove the timeline entry.")),
    })
  }

  const confirmRosterDelete = () => {
    if (!pendingRosterDelete) return
    deleteRosterEntry.mutate(pendingRosterDelete.id, {
      onSuccess: () => {
        toast.success('Date override dropped')
        setPendingRosterDelete(null)
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't drop the date override.")),
    })
  }

  /** Step the roster window a month at a time — the unit a roster is read in. */
  const goToPreviousMonth = () => setWindow((current) => shiftMonth(current.from, -1))
  const goToNextMonth = () => setWindow((current) => shiftMonth(current.from, 1))
  const goToThisMonth = () => setWindow(monthBounds(todayIso()))
  /**
   * Jump straight to a month picked from the calendar — `yyyy-MM`, the month
   * picker's own value. Cleared, the window falls back to this month rather than
   * to no window at all: the endpoint requires one.
   */
  const goToMonth = (month: string) =>
    setWindow(monthBounds(month ? `${month}-01` : todayIso()))

  const isForbidden =
    isForbiddenError(shiftOnDay.error) ||
    isForbiddenError(timeline.error) ||
    isForbiddenError(roster.error)

  return {
    /** The resolved answer for `lookupDate`, and the date itself. */
    lookupDate,
    setLookupDate,
    resolved: shiftOnDay.data,
    isResolving: shiftOnDay.isLoading,
    resolveError: shiftOnDay.error,

    /** The assignment timeline, newest first. Empty means "on the default". */
    timelineRows: timeline.data?.items ?? [],
    isTimelineLoading: timeline.isLoading,
    isTimelineError: timeline.isError && !isForbidden,
    timelineError: timeline.error,

    /** The roster window and the overrides inside it. */
    window,
    /** The window's month as `yyyy-MM` — what the month picker binds to. */
    month: window.from.slice(0, 7),
    goToPreviousMonth,
    goToNextMonth,
    goToThisMonth,
    goToMonth,
    rosterRows: roster.data?.items ?? [],
    isRosterLoading: roster.isLoading,
    isRosterError: roster.isError && !isForbidden,
    rosterError: roster.error,

    shiftSelectOptions,
    isShiftsLoading: shifts.isLoading,
    /** Nothing to assign yet — the company has no shifts. */
    hasNoShifts: !shifts.isLoading && shiftSelectOptions.length === 0,

    dialog,
    openAssign,
    openRoster,
    closeDialog,
    assignForm,
    onSubmitAssignment,
    isAssigning: createAssignment.isPending,
    rosterForm,
    onSubmitRoster,
    isRostering: createRosterEntry.isPending,

    pendingAssignmentDelete,
    setPendingAssignmentDelete,
    confirmAssignmentDelete,
    isDeletingAssignment: deleteAssignment.isPending,

    pendingRosterDelete,
    setPendingRosterDelete,
    confirmRosterDelete,
    isDeletingRosterEntry: deleteRosterEntry.isPending,

    isForbidden,
    forbiddenMessage: isForbidden
      ? getApiErrorMessage(shiftOnDay.error ?? timeline.error ?? roster.error)
      : undefined,
  }
}
