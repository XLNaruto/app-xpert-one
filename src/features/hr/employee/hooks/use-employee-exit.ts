import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isConflictError } from '@/lib/api-error'
import { useExitEmployee } from '../api/use-employee-step-mutations'
import { useEmployee } from '../api/use-employees'
import { toFormDate, todayIso } from '../lib/employee-dates'
import { leaveServiceSchema, type LeaveServiceFormValues } from '../schemas'
import type { Employee } from '../types'

/**
 * The employee list's "Exit Employee": the Leave Service dialog of step 8,
 * opened straight from a row. It closes the row's open posting
 * (`POST …/transfers/:serviceId/leave-service`) — the employee then shows as
 * exited and moves to the De-active tab.
 */
export function useEmployeeExit() {
  const exit = useExitEmployee()
  const [target, setTarget] = useState<Employee | null>(null)

  const form = useForm<LeaveServiceFormValues>({
    resolver: zodResolver(leaveServiceSchema),
    defaultValues: { leavingDate: '', leavingReason: '' },
  })

  /**
   * A list row carries `exit` but not its posting, so the open posting (whose id
   * the write is addressed by) is read from `GET /user/employees/:id` once the
   * dialog opens.
   */
  const detail = useEmployee(target ? target.id : Number.NaN)
  const service = detail.data?.service ?? null
  const openService = service && !service.leavingDate ? service : null

  /** Only someone still serving in the company can be exited. */
  const canExit = (row: Employee) => !row.exit

  /** The earliest leaving date the posting allows — its joining date. */
  const joiningDate = toFormDate(openService?.joiningDate)

  // Seed the leaving date once the posting has loaded: today, or the joining
  // date if that is later.
  const seededFor = useRef<number | null>(null)
  useEffect(() => {
    if (!target || !openService || seededFor.current === target.id) return
    seededFor.current = target.id
    const today = todayIso()
    const joined = toFormDate(openService.joiningDate)
    form.reset({ leavingDate: joined > today ? joined : today, leavingReason: '' })
  }, [target, openService, form])

  const open = (row: Employee) => {
    if (!canExit(row)) return
    seededFor.current = null
    form.reset({ leavingDate: '', leavingReason: '' })
    setTarget(row)
  }

  const close = () => setTarget(null)

  const onSubmit = form.handleSubmit((values) => {
    if (!target || !openService) return
    exit.mutate(
      { employeeId: target.id, serviceId: openService.id, values },
      {
        onSuccess: () => {
          toast.success(`${target.name || 'Employee'} exited`)
          close()
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Couldn't exit the employee."))
          // Already closed elsewhere — the list has been re-read.
          if (isConflictError(error)) close()
        },
      },
    )
  })

  return {
    target,
    canExit,
    open,
    close,
    form,
    onSubmit,
    joiningDate,
    isLoading: !!target && detail.isLoading,
    /** Loaded, but there's no open posting to close (already left, or step 1 incomplete). */
    noOpenPosting: !!target && !detail.isLoading && !openService,
    loadError: detail.error,
    isPending: exit.isPending,
  }
}
