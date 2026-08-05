import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useStateSelect } from '@/features/master/state'
import { useDistrictSelect } from '@/features/master/district'
import { employeeBasicSchema, type EmployeeBasicFormValues } from '../schemas'
import { EMPTY_EMPLOYEE_BASIC_FORM } from '../constants'
import {
  useCreateEmployee,
  useUpdateEmployee,
  useUploadEmployeePhoto,
} from '../api/use-employee-mutations'
import { employeeToBasicFormValues } from '../lib/employee-mappers'
import { deriveRenewalDate } from '../lib/employee-dates'
import { usePostingOptions } from './use-posting-options'
import type { Employee } from '../types'
import { PERMANENT_EMPLOYMENT_TYPE } from '../constants'

/**
 * Step 1 — the person, their address, contact, health and their posting.
 *
 * One form, but two endpoints behind it: `POST /user/employees` creates the person
 * *and* their opening posting together, and `PATCH` writes the person plus the
 * current posting. Which one runs is decided by whether an employee already
 * exists, and a successful create hands its new id back up so the wizard can move
 * on to step 2 — which is only addressable once that id exists.
 *
 * A save is offered two ways: continue to the next step, or close back to the
 * list. Both run the same mutation; only what happens afterwards differs.
 */
export function useEmployeeBasicForm({
  employee,
  onCreated,
  onSaved,
  onClose,
}: {
  /** The record being edited, or `undefined` for a fresh employee. */
  employee: Employee | undefined
  /** A new employee was created — the wizard adopts the id and opens step 2. */
  onCreated: (id: number) => void
  /** An existing employee was saved and the user asked to continue. */
  onSaved: () => void
  /** Saved (or cancelled) and the user asked to leave. */
  onClose: () => void
}) {
  const isEdit = employee !== undefined
  const employeeId = employee?.id ?? Number.NaN

  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee(employeeId)
  const uploadPhoto = useUploadEmployeePhoto()

  const form = useForm<EmployeeBasicFormValues>({
    resolver: zodResolver(employeeBasicSchema),
    defaultValues: EMPTY_EMPLOYEE_BASIC_FORM,
  })
  const { control, setValue, getValues, reset, handleSubmit } = form

  /** Which button was pressed — read in the success handler, not by the mutation. */
  const closeAfterSaveRef = useRef(false)

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (employee) reset(employeeToBasicFormValues(employee, EMPTY_EMPLOYEE_BASIC_FORM))
  }, [employee, reset])

  /* ── Address: the "same as current" mirror ─────────────────────────────── */

  const sameAsCurrent = useWatch({ control, name: 'sameAsCurrent' })
  const currentAddress = useWatch({
    control,
    name: [
      'currentAddress1',
      'currentAddress2',
      'currentAddress3',
      'currentCountry',
      'currentStateId',
      'currentDistrictId',
      'currentTaluka',
      'currentCity',
      'currentPinCode',
    ],
  })

  /**
   * While the switch is on, the permanent block is hidden and mirrored from the
   * current one — the API stores both address sets, so the copy has to be real
   * values rather than a flag. Turning it off leaves what was copied in place: the
   * user's next act is to correct it, not to retype it from nothing.
   *
   * Each field is only written when it actually differs. `useWatch` on a list of
   * names hands back a fresh array every render, so an unconditional `setValue`
   * here would notify the permanent block's own subscribers, re-render, and run
   * this again — a loop.
   */
  useEffect(() => {
    if (!sameAsCurrent) return

    const mirror: [keyof EmployeeBasicFormValues, string][] = [
      ['permanentAddress1', currentAddress[0]],
      ['permanentAddress2', currentAddress[1]],
      ['permanentAddress3', currentAddress[2]],
      ['permanentCountry', currentAddress[3]],
      ['permanentStateId', currentAddress[4]],
      ['permanentDistrictId', currentAddress[5]],
      ['permanentTaluka', currentAddress[6]],
      ['permanentCity', currentAddress[7]],
      ['permanentPinCode', currentAddress[8]],
    ]

    for (const [name, value] of mirror) {
      if (getValues(name) !== value) setValue(name, value)
    }
    // `currentAddress` is a new array each render — the primitives inside it are
    // what actually change, and the guard above makes a repeat run a no-op.
  }, [sameAsCurrent, currentAddress, getValues, setValue])

  /* ── Contract dates ────────────────────────────────────────────────────── */

  const joiningDate = useWatch({ control, name: 'joiningDate' })
  const employmentType = useWatch({ control, name: 'employmentType' })
  const contractPeriod = useWatch({ control, name: 'contractPeriod' })
  const contractPeriodType = useWatch({ control, name: 'contractPeriodType' })

  /**
   * Confirmation defaults to the joining date — most employees are confirmed on
   * joining, and the schema requires it to be on or after. Only filled while it's
   * empty, so a date the user chose is never overwritten.
   */
  useEffect(() => {
    if (joiningDate && !getValues('confirmationDate')) {
      setValue('confirmationDate', joiningDate, { shouldValidate: true })
    }
  }, [joiningDate, getValues, setValue])

  /**
   * Renewal follows from the contract's start and length. Recomputed whenever any
   * of the three change — a contract's end isn't a free choice, and leaving a
   * stale date here is what makes a renewal get missed. The field stays editable
   * for the contract that says otherwise.
   */
  useEffect(() => {
    if (employmentType === PERMANENT_EMPLOYMENT_TYPE) {
      if (getValues('renewalDate')) setValue('renewalDate', '')
      return
    }
    const derived = deriveRenewalDate(joiningDate, contractPeriod, contractPeriodType)
    if (derived && derived !== getValues('renewalDate')) {
      setValue('renewalDate', derived, { shouldValidate: true })
    }
  }, [employmentType, joiningDate, contractPeriod, contractPeriodType, getValues, setValue])

  /* ── Dropdowns ─────────────────────────────────────────────────────────── */

  const currentStateId = useWatch({ control, name: 'currentStateId' })
  const currentDistrictId = useWatch({ control, name: 'currentDistrictId' })
  const permanentStateId = useWatch({ control, name: 'permanentStateId' })
  const permanentDistrictId = useWatch({ control, name: 'permanentDistrictId' })
  const branchId = useWatch({ control, name: 'branchId' })

  /**
   * Both geography dropdowns page in as they're scrolled and search server-side,
   * so the form never pulls all ~36 states or the district master's ~800 rows up
   * front. The employee response carries no state/district *names*, only ids, so
   * each selection is labelled by a background read of that one row.
   */
  const currentState = useStateSelect({
    selected: currentStateId ? { value: currentStateId } : undefined,
  })
  const currentDistrict = useDistrictSelect({
    stateId: currentStateId ? Number(currentStateId) : undefined,
    selected: currentDistrictId ? { value: currentDistrictId } : undefined,
  })
  const permanentState = useStateSelect({
    selected: permanentStateId ? { value: permanentStateId } : undefined,
  })
  const permanentDistrict = useDistrictSelect({
    stateId: permanentStateId ? Number(permanentStateId) : undefined,
    selected: permanentDistrictId ? { value: permanentDistrictId } : undefined,
  })

  const postingOptions = usePostingOptions(branchId)

  /** Pick a state and clear its district — it won't exist under the new state. */
  const changeCurrentState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('currentDistrictId', '')
  }
  const changePermanentState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('permanentDistrictId', '')
  }

  /* ── Photo ─────────────────────────────────────────────────────────────── */

  /**
   * Upload the picked file and answer its storage key, which is what the form
   * holds. Rethrows so the field can drop its optimistic preview.
   */
  const uploadPhotoFile = async (file: File): Promise<string> => {
    try {
      return await uploadPhoto.mutateAsync(file)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't upload the photo."))
      throw error
    }
  }

  /* ── Submit ────────────────────────────────────────────────────────────── */

  const submit = handleSubmit((values) => {
    const shouldClose = closeAfterSaveRef.current
    closeAfterSaveRef.current = false

    if (isEdit) {
      updateEmployee.mutate(values, {
        onSuccess: () => {
          toast.success('Basic detail saved')
          if (shouldClose) onClose()
          else onSaved()
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't save.")),
      })
      return
    }

    createEmployee.mutate(values, {
      onSuccess: (created) => {
        toast.success('Employee created')
        // Every later step is addressed by this id, so the wizard has to adopt it
        // before any of them can open.
        if (shouldClose) onClose()
        else onCreated(created.id)
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't create the employee.")),
    })
  })

  /** Save and continue to step 2. */
  const onSubmit = submit

  /** Save and go back to the list. */
  const onSubmitAndClose = () => {
    closeAfterSaveRef.current = true
    void submit()
  }

  return {
    form,
    register: form.register,
    control,
    errors: form.formState.errors,
    isEdit,
    isPending: createEmployee.isPending || updateEmployee.isPending,
    isUploadingPhoto: uploadPhoto.isPending,
    uploadPhotoFile,
    sameAsCurrent,
    employmentType,
    currentState,
    currentDistrict,
    permanentState,
    permanentDistrict,
    changeCurrentState,
    changePermanentState,
    hasCurrentState: Boolean(currentStateId),
    hasPermanentState: Boolean(permanentStateId),
    postingOptions,
    onSubmit,
    onSubmitAndClose,
    onClose,
  }
}
