import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId, encryptParams } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import {
  EMPLOYEE_PROGRESS_STEPS,
  EMPLOYEE_TABS,
  EMPLOYEE_TAB_LABELS,
  type EmployeeTab,
} from '../constants'
import { useEmployee } from '../api/use-employees'
import { stepProgress } from '../lib/employee-mappers'
import type { EmployeeCompletedSteps } from '../types'

/** Narrow an unknown `tab` from the URL to a real step; anything else opens step 1. */
export function asEmployeeTab(value: unknown): EmployeeTab {
  return EMPLOYEE_TABS.includes(value as EmployeeTab) ? (value as EmployeeTab) : 'basic'
}

/** One entry in the wizard's nav — everything it needs to draw a step. */
export interface EmployeeWizardStep {
  tab: EmployeeTab
  label: string
  /** Position in the nav, 1-based. */
  index: number
  /** Locked until the employee exists — every step but the first. */
  locked: boolean
  /** Saved at least once, per `completed_steps`. */
  completed: boolean
  /** Counted toward the progress ring (step 8 is not). */
  counted: boolean
}

/**
 * Owns the nine-step wizard: which step is open, which are reachable, and how
 * complete the record is.
 *
 * **Why every step but the first is locked on a new employee.** The API creates
 * the person and their opening posting together in `POST /user/employees`, and
 * every later step is addressed as `/user/employees/:id/…`. Until step 1 is saved
 * there is no id, so those tabs have nothing to read or write — the lock states
 * that plainly rather than letting a tab open and fail.
 *
 * **Where the open tab lives.** In the same encrypted `?data=` token that carries
 * the id, so a refresh or a shared link comes back to the step that was open and
 * no raw id appears in the address bar. Switching tabs replaces the history entry
 * rather than pushing one, so Back leaves the wizard instead of walking the tabs
 * the user just clicked through.
 */
export function useEmployeeWizard(employeeId: number | undefined, openTab: EmployeeTab) {
  const navigate = useNavigate()
  const detail = useEmployee(employeeId ?? Number.NaN)

  const [tab, setTabState] = useState<EmployeeTab>(
    // A locked step can't be the landing tab on a brand-new employee.
    employeeId === undefined ? 'basic' : openTab,
  )

  // A different employee (or leaving edit mode) resets which step is open.
  useEffect(() => {
    setTabState(employeeId === undefined ? 'basic' : openTab)
    // `openTab` is read once per id: after that the tab is this hook's own state,
    // and re-syncing it here would fight the user's clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  const goToList = useCallback(() => navigate({ to: '/hr/employee' }), [navigate])

  /** Open the read-only 360° view of the employee being edited. */
  const goToDetail = useCallback(() => {
    if (employeeId === undefined) return
    navigate({ to: '/hr/employee/detail', search: { data: encryptId(employeeId) } })
  }, [employeeId, navigate])

  /**
   * Open a step, keeping the URL in step with it. On a new employee there is no
   * token to write into, so only the local state moves.
   */
  const setTab = useCallback(
    (next: string) => {
      const step = asEmployeeTab(next)
      setTabState(step)
      if (employeeId === undefined) return
      navigate({
        to: '/hr/employee/create',
        search: { data: encryptParams({ id: employeeId, tab: step }) },
        replace: true,
      })
    },
    [employeeId, navigate],
  )

  /**
   * Step 1 has just created the employee: adopt the new id and move on to KYC.
   * This is a push, not a replace — the create and the edit of an employee are
   * genuinely different places, and Back should return to the empty form.
   */
  const openCreatedEmployee = useCallback(
    (newId: number) => {
      navigate({
        to: '/hr/employee/create',
        search: { data: encryptParams({ id: newId, tab: 'kyc' }) },
      })
    },
    [navigate],
  )

  /** The next step after `from`, or `undefined` when it's the last one. */
  const nextTab = useCallback((from: EmployeeTab): EmployeeTab | undefined => {
    const at = EMPLOYEE_TABS.indexOf(from)
    return at >= 0 ? EMPLOYEE_TABS[at + 1] : undefined
  }, [])

  /** Advance to the step after the current one, or fall back to the list. */
  const goToNextTab = useCallback(() => {
    const next = nextTab(tab)
    if (next) setTab(next)
    else goToList()
  }, [tab, nextTab, setTab, goToList])

  /**
   * Step back. From the first step there is nowhere back to inside the wizard, so
   * Back leaves it — which is what the button means there anyway.
   */
  const goToPrevTab = useCallback(() => {
    const at = EMPLOYEE_TABS.indexOf(tab)
    const previous = at > 0 ? EMPLOYEE_TABS[at - 1] : undefined
    if (previous) setTab(previous)
    else goToList()
  }, [tab, setTab, goToList])

  const completedSteps: EmployeeCompletedSteps =
    detail.data?.completedSteps ??
    ({
      basicDetail: false,
      kycDetail: false,
      wageStructure: false,
      familyDetail: false,
      educationDetail: false,
      documents: false,
      assets: false,
    } satisfies EmployeeCompletedSteps)

  const countedFlags = EMPLOYEE_PROGRESS_STEPS.map((step) => step.flag)
  const progress = stepProgress(completedSteps, countedFlags)

  /** Which `completed_steps` flag reports a step, for the ones that have a flag. */
  const flagFor = (step: EmployeeTab) =>
    EMPLOYEE_PROGRESS_STEPS.find((entry) => entry.tab === step)?.flag

  const steps: EmployeeWizardStep[] = EMPLOYEE_TABS.map((step, index) => {
    const flag = flagFor(step)
    return {
      tab: step,
      label: EMPLOYEE_TAB_LABELS[step],
      index: index + 1,
      locked: step !== 'basic' && employeeId === undefined,
      completed: flag ? completedSteps[flag] : false,
      counted: flag !== undefined,
    }
  })

  /** A click on a locked step says why rather than doing nothing. */
  const onLockedStep = useCallback(() => {
    toast.warning('Save Basic Detail first — the other steps hang off the saved employee.')
  }, [])

  const isForbidden = employeeId !== undefined && isForbiddenError(detail.error)

  return {
    tab,
    setTab,
    steps,
    progress,
    completedSteps,
    employee: detail.data,
    /** True while editing and the record hasn't arrived — hold the tabs back. */
    isLoading: employeeId !== undefined && detail.isLoading,
    isError:
      employeeId !== undefined &&
      (detail.isError || (!detail.isLoading && detail.data === undefined)),
    loadError: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    goToList,
    goToDetail,
    goToNextTab,
    goToPrevTab,
    nextTab,
    openCreatedEmployee,
    onLockedStep,
  }
}
