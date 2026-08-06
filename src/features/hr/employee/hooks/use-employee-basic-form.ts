import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { IMAGE_CONTENT_TYPES } from '@/lib/uploads'
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
 * The step has one save, and it moves the wizard on. A save that doesn't validate
 * moves nothing — `handleSubmit` never reaches the mutation, and `notifyInvalid`
 * says which field held it back.
 */
export function useEmployeeBasicForm({
  employee,
  onCreated,
  onSaved,
}: {
  /** The record being edited, or `undefined` for a fresh employee. */
  employee: Employee | undefined
  /** A new employee was created — the wizard adopts the id and opens step 2. */
  onCreated: (id: number) => void
  /** An existing employee was saved — the wizard opens the next step. */
  onSaved: () => void
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

  /**
   * The picked file, held until Save. Nothing is presigned or PUT while the user
   * is still filling the form: an abandoned form leaves no stray object in
   * storage, and swapping the photo three times costs one upload, not three. The
   * form's `photo` value stays the *stored* key until the save's upload lands.
   */
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Seed the form once the record loads (edit mode only). A re-seed discards the
  // pending photo along with everything else typed — the two have to agree.
  useEffect(() => {
    if (employee) {
      reset(employeeToBasicFormValues(employee, EMPTY_EMPLOYEE_BASIC_FORM))
      setPhotoFile(null)
    }
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
   * Take (or clear) the pending file. The content type is checked here rather
   * than at save time — the file dialog is already filtered, but a user who gets
   * an unsupported one through should hear about it now, not lose a save to it.
   */
  const pickPhotoFile = (file: File | null) => {
    if (file && !(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      toast.error('Photo must be a JPG, PNG or WebP image.')
      return
    }
    setPhotoFile(file)
  }

  /* ── Submit ────────────────────────────────────────────────────────────── */

  const submit = handleSubmit(async (values) => {
    // The photo is uploaded as part of the save, not when it was picked. It has
    // to land first: the record stores the key the presigned PUT answers.
    let payload = values
    if (photoFile) {
      try {
        const key = await uploadPhoto.mutateAsync(photoFile)
        setValue('photo', key)
        setPhotoFile(null)
        payload = { ...values, photo: key }
      } catch (error) {
        // The pending file is kept, so Save can be pressed again without
        // re-picking — and nothing was written, so there's no half-saved record.
        toast.error(getApiErrorMessage(error, "Couldn't upload the photo."))
        return
      }
    }

    if (isEdit) {
      updateEmployee.mutate(payload, {
        onSuccess: () => {
          toast.success('Basic detail saved')
          onSaved()
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't save.")),
      })
      return
    }

    createEmployee.mutate(payload, {
      onSuccess: (created) => {
        toast.success('Employee created')
        // Every later step is addressed by this id, so the wizard has to adopt it
        // before any of them can open.
        onCreated(created.id)
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't create the employee.")),
    })
  })

  return {
    form,
    register: form.register,
    control,
    errors: form.formState.errors,
    isEdit,
    isPending:
      createEmployee.isPending || updateEmployee.isPending || uploadPhoto.isPending,
    isUploadingPhoto: uploadPhoto.isPending,
    photoFile,
    pickPhotoFile,
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
    onSubmit: submit,
  }
}
