import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isConflictError } from '@/lib/api-error'
import { employeeRejoinSchema, type EmployeeRejoinFormValues } from '../schemas'
import { EMPTY_EMPLOYEE_REJOIN_FORM, PERMANENT_EMPLOYMENT_TYPE } from '../constants'
import { useEmployee } from '../api/use-employees'
import { useEmployeeRejoinEligibility } from '../api/use-employee-steps'
import { useRejoinEmployee } from '../api/use-employee-step-mutations'
import { deriveRenewalDate, todayIso } from '../lib/employee-dates'
import { usePostingOptions } from './use-posting-options'

/** Who the dialog is rejoining — a list row or the employee open in the wizard. */
export interface RejoinTarget {
  id: number
  name: string
}

/** The day after an ISO date. */
function nextDayIso(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

/**
 * Rejoin — a de-active employee starts a new spell of service in a company they
 * worked in before (`POST /user/employees/:id/rejoin`). Opened from step 8 or
 * straight from a de-active row on the list.
 *
 * `GET …/rejoin` decides everything up front: whether it's allowed at all (the
 * `reason` is shown as-is when not), which companies the dropdown offers (newest
 * leaving first — the first is preselected), and the floor for the joining date
 * (the day after the last posting ended).
 *
 * The new posting is seeded from the employee's last one when the preselected
 * company is the one their record sits in — the branch, department and
 * designation belong to that company, so they're only carried over there.
 *
 * A 409 (service still running somewhere, or another live record shares their
 * Aadhaar / PAN / UAN) names WHERE, so it stays on the form as a banner rather
 * than a toast that vanishes before the user knows which record to close.
 */
export function useEmployeeRejoin() {
  const [target, setTarget] = useState<RejoinTarget | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const employeeId = target?.id ?? Number.NaN

  const eligibility = useEmployeeRejoinEligibility(employeeId, target !== null)
  const employee = useEmployee(employeeId)
  const rejoin = useRejoinEmployee()

  /** Allowed AND somewhere to go — a company the caller can reach. */
  const allowed = !!eligibility.data?.canRejoin && eligibility.data.companies.length > 0
  const lastLeavingDate = eligibility.data?.lastLeavingDate ?? ''
  /** The earliest joining date the API accepts — the day after the last exit. */
  const minJoiningDate = lastLeavingDate ? nextDayIso(lastLeavingDate) : ''

  const schema = useMemo(() => employeeRejoinSchema(lastLeavingDate), [lastLeavingDate])
  const form = useForm<EmployeeRejoinFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_EMPLOYEE_REJOIN_FORM,
  })

  /* ── Seed once eligibility (and the record) have answered ─────────────── */

  const seedValues = useMemo(() => {
    const first = eligibility.data?.companies[0]
    if (!first) return null
    const record = employee.data
    const service = record?.service ?? null
    // The masters belong to a company — carry them over only into that company.
    const sameCompany = record?.companyId === first.companyId
    const startDate = minJoiningDate && minJoiningDate > todayIso() ? minJoiningDate : todayIso()
    const idOf = (id: number | null | undefined) =>
      sameCompany && id !== null && id !== undefined ? String(id) : ''

    return {
      ...EMPTY_EMPLOYEE_REJOIN_FORM,
      companyId: String(first.companyId),
      branchId: idOf(service?.branchId),
      departmentId: idOf(service?.departmentId),
      designationId: idOf(service?.designationId),
      grade: service?.grade || EMPTY_EMPLOYEE_REJOIN_FORM.grade,
      employmentType: service?.employmentType || EMPTY_EMPLOYEE_REJOIN_FORM.employmentType,
      contractPeriod:
        service?.contractPeriod !== null && service?.contractPeriod !== undefined
          ? String(service.contractPeriod)
          : '',
      contractPeriodType:
        service?.contractPeriodType || EMPTY_EMPLOYEE_REJOIN_FORM.contractPeriodType,
      joiningDate: startDate,
      confirmationDate: startDate,
    }
  }, [eligibility.data, employee.data, minJoiningDate])

  // Seed once per opening, when both reads are in (the record only adds defaults,
  // so a failed record read still seeds from eligibility alone).
  const [seededFor, setSeededFor] = useState<number | null>(null)
  const recordSettled = !employee.isLoading
  useEffect(() => {
    if (!target || seededFor === target.id || !seedValues || !recordSettled) return
    form.reset(seedValues)
    setSeededFor(target.id)
  }, [target, seededFor, seedValues, recordSettled, form])

  /* ── The new posting's dropdowns, scoped to the chosen company ────────── */

  const companyId = useWatch({ control: form.control, name: 'companyId' })
  const branchId = useWatch({ control: form.control, name: 'branchId' })
  const designationId = useWatch({ control: form.control, name: 'designationId' })
  const destinationCompanyId = companyId.trim() ? Number(companyId) : undefined

  const options = usePostingOptions({
    branchId,
    designationId,
    companyId: destinationCompanyId,
    enabled: target !== null && destinationCompanyId !== undefined,
  })

  const companyOptions = useMemo(
    () =>
      (eligibility.data?.companies ?? []).map((company) => ({
        label: company.companyName || `Company #${company.companyId}`,
        value: String(company.companyId),
      })),
    [eligibility.data],
  )

  /** Another company's branches, departments and designations are different rows. */
  const changeCompany = (next: string) => {
    if (next === form.getValues('companyId')) return
    form.setValue('companyId', next, { shouldValidate: true })
    form.setValue('branchId', '')
    form.setValue('departmentId', '')
    form.setValue('designationId', '')
  }

  /* ── Contract renewal follows the joining date and the period ─────────── */

  const values = useWatch({ control: form.control })
  useEffect(() => {
    if (!target) return
    const {
      employmentType = '',
      joiningDate = '',
      contractPeriod = '',
      contractPeriodType = '',
    } = values
    if (employmentType === PERMANENT_EMPLOYMENT_TYPE) {
      if (form.getValues('renewalDate')) form.setValue('renewalDate', '')
      return
    }
    const derived = deriveRenewalDate(joiningDate, contractPeriod, contractPeriodType)
    if (derived && derived !== form.getValues('renewalDate')) {
      form.setValue('renewalDate', derived, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, values.employmentType, values.joiningDate, values.contractPeriod, values.contractPeriodType])

  /* ── Open / close / save ──────────────────────────────────────────────── */

  const open = (next: RejoinTarget) => {
    form.reset(EMPTY_EMPLOYEE_REJOIN_FORM)
    setConflict(null)
    setSeededFor(null)
    setTarget(next)
  }

  const close = () => {
    setTarget(null)
    setConflict(null)
  }

  const onSubmit = form.handleSubmit((formValues) => {
    if (!target || !allowed) return
    setConflict(null)
    rejoin.mutate(
      { employeeId: target.id, values: formValues },
      {
        onSuccess: () => {
          toast.success(`${target.name || 'Employee'} rejoined`, {
            description: 'A New Posting Has Been Opened — They Are Active Again.',
          })
          close()
        },
        onError: (error) => {
          const message = getApiErrorMessage(error, "Couldn't rejoin the employee.")
          if (isConflictError(error)) {
            setConflict(message)
            return
          }
          // The contract-period refusal is a field's problem, so it goes on the field.
          if (/contract period/i.test(message)) {
            form.setError('contractPeriod', { message })
            return
          }
          toast.error(message)
        },
      },
    )
  })

  return {
    target,
    open,
    close,
    form,
    onSubmit,
    isPending: rejoin.isPending,
    /** Eligibility still loading, or allowed but the form not yet seeded. */
    isLoading:
      target !== null &&
      (eligibility.isLoading ||
        (allowed && seededFor !== target.id)),
    loadError: eligibility.error,
    /** Refused up front — `reason` says why; the form isn't shown. */
    refusal: !eligibility.data
      ? null
      : !eligibility.data.canRejoin
        ? eligibility.data.reason || 'This employee cannot rejoin right now.'
        : !allowed
          ? "None of This Employee's Earlier Companies Are Within Your Reach."
          : null,
    /** A 409 from the save — names where their service is still running. */
    conflict,
    /** The chosen company, as the form holds it. */
    companyId,
    companyOptions,
    changeCompany,
    options,
    needsCompany: destinationCompanyId === undefined,
    lastLeavingDate,
    minJoiningDate,
  }
}

export type EmployeeRejoin = ReturnType<typeof useEmployeeRejoin>
