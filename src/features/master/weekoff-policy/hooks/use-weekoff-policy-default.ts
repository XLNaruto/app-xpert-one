import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCompanies } from '@/features/master/company'
import { departmentOptions, useDepartments } from '@/features/master/department'
import {
  useClearDefaultWeekoffPolicy,
  useSetDefaultWeekoffPolicy,
} from '../api/use-weekoff-policy-mutations'
import type { WeekoffDefaultScope } from '../schemas'
import type { WeekoffPolicy } from '../types'

/** Which level the default is being pinned at. */
export type WeekoffDefaultLevel = 'company' | 'department'

/**
 * The "make this the default" flow on the policy list.
 *
 * A shift may name its own pattern, but most don't — so a default at the company
 * or department level is what actually decides which days are off for the bulk of
 * a workforce. Both levels are set from here rather than from the company and
 * department screens, because the pattern being pinned is the thing on screen.
 *
 * Clearing is its own action, not "save nothing": a department with no default
 * falls back to its company's, and a company with none leaves its shifts on the
 * platform's Sunday-only constant. Those are different outcomes from leaving the
 * current default in place.
 *
 * No read exposes the stored default today (neither the company nor the
 * department response carries it), so the dialog can't pre-select what's already
 * pinned — it states the write it is about to make instead of pretending to show
 * the current state.
 */
export function useWeekoffPolicyDefault() {
  const companies = useCompanies()
  const departments = useDepartments()
  const setDefault = useSetDefaultWeekoffPolicy()
  const clearDefault = useClearDefaultWeekoffPolicy()

  /** The policy the dialog is acting on, or `null` while it's shut. */
  const [pinning, setPinning] = useState<WeekoffPolicy | null>(null)
  const [level, setLevel] = useState<WeekoffDefaultLevel>('company')
  /** The company id as a string — the combobox's value. */
  const [companyId, setCompanyId] = useState('')
  /** The department id as a string — the combobox's value. */
  const [departmentId, setDepartmentId] = useState('')

  const companySelectOptions = useMemo(
    () =>
      (companies.data?.items ?? []).map((company) => ({
        label: company.companyName,
        value: String(company.id),
      })),
    [companies.data],
  )

  const departmentSelectOptions = useMemo(
    () => departmentOptions(departments.data?.items ?? []),
    [departments.data],
  )

  const startPinning = (policy: WeekoffPolicy) => {
    setLevel('company')
    // The policy belongs to a company already — that's the one being pinned in
    // the ordinary case, so the picker opens on it rather than empty.
    setCompanyId(String(policy.companyId))
    setDepartmentId('')
    setPinning(policy)
  }

  const closePinning = () => setPinning(null)

  /** The one id the endpoint wants, or `null` when the form isn't complete. */
  const scope = (): WeekoffDefaultScope | null => {
    if (level === 'company') {
      if (!companyId) return null
      return { company_id: Number(companyId) }
    }
    if (!departmentId) return null
    return { department_id: Number(departmentId) }
  }

  const save = () => {
    if (!pinning) return
    const chosen = scope()
    if (!chosen) {
      toast.error(
        level === 'company'
          ? 'Pick the company this default applies to.'
          : 'Pick the department this default applies to.',
      )
      return
    }
    setDefault.mutate(
      { policyId: pinning.id, scope: chosen },
      {
        onSuccess: () => {
          toast.success(
            level === 'company'
              ? `"${pinning.name}" is now the company default`
              : `"${pinning.name}" is now this department's default`,
          )
          closePinning()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't set the default pattern.")),
      },
    )
  }

  const clear = () => {
    const chosen = scope()
    if (!chosen) {
      toast.error(
        level === 'company'
          ? 'Pick the company whose default should be cleared.'
          : 'Pick the department whose default should be cleared.',
      )
      return
    }
    clearDefault.mutate(chosen, {
      onSuccess: () => {
        toast.success(
          level === 'company'
            ? "Company default cleared — shifts fall back to Sunday-only unless they name their own pattern"
            : "Department default cleared — it now follows the company's",
        )
        closePinning()
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't clear the default pattern.")),
    })
  }

  return {
    pinning,
    startPinning,
    closePinning,
    level,
    setLevel,
    companyId,
    setCompanyId,
    companySelectOptions,
    isCompaniesLoading: companies.isLoading,
    departmentId,
    setDepartmentId,
    departmentSelectOptions,
    isDepartmentsLoading: departments.isLoading,
    save,
    clear,
    isSaving: setDefault.isPending,
    isClearing: clearDefault.isPending,
  }
}
