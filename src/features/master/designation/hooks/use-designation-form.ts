import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { encryptParams } from '@/lib/crypto'
import { toast } from 'sonner'
import { useAllowanceDeductions } from '@/features/master/allowance-deduction'
import {
  designationSchema,
  type DesignationComponentRow,
  type DesignationFormValues,
} from '../schemas'
import { EMPTY_DESIGNATION_FORM } from '../constants'
import { useCreateDesignation } from '../api/use-designation-mutations'
import { calculateWagePerDay } from '../lib/designation-calculations'

/** One allowance / deduction head as listed on the form. */
export interface HeadRow {
  id: number
  label: string
}

/**
 * Owns the create form: the allowance and deduction head rows, the derived wage
 * per day and the save. The page consumes this and only lays out fields.
 *
 * Create is the one call that takes the whole screen — `POST /user/designations`
 * establishes the title *and* its opening wage structure in one body. After that
 * the two come apart: the title is renamed through the Basic Info tab (see
 * `useDesignationBasicInfoForm`) and pay is revised version by version on the
 * Wage Structure tab, so nothing here is reused for editing.
 *
 * A successful create hands off to the saved designation's Leave Allowance tab —
 * the one thing the create form can't do, because an allowance is stored against
 * the designation's id and there isn't one until this call answers.
 */
export function useDesignationForm() {
  const navigate = useNavigate()

  const createDesignation = useCreateDesignation()
  const components = useAllowanceDeductions()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DesignationFormValues>({
    resolver: zodResolver(designationSchema),
    defaultValues: EMPTY_DESIGNATION_FORM,
  })

  /*
   * Heads aren't picked — every head in the master gets a row, split by side.
   * The row order here is the order the form fields are registered in, so the
   * seeding effect below and the rendered rows stay index-aligned.
   */
  const allowanceHeads = useMemo<HeadRow[]>(
    () => headRows(components.data?.items, 'ALLOWANCE'),
    [components.data],
  )
  const deductionHeads = useMemo<HeadRow[]>(
    () => headRows(components.data?.items, 'DEDUCTION'),
    [components.data],
  )

  /* Seed one blank row per head, once the master has loaded. */
  useEffect(() => {
    if (!components.data) return
    reset({
      ...EMPTY_DESIGNATION_FORM,
      allowances: allowanceHeads.map(blankComponentRow),
      deductions: deductionHeads.map(blankComponentRow),
    })
  }, [components.data, allowanceHeads, deductionHeads, reset])

  // Watched values that other fields read: derived wage, and which act settings show.
  const basicPay = useWatch({ control, name: 'basicPay' })
  const workingDayCalculationType = useWatch({
    control,
    name: 'workingDayCalculationType',
  })
  const pfActApplicable = useWatch({ control, name: 'pfActApplicable' })
  const pfDeductionType = useWatch({ control, name: 'pfDeductionType' })
  const esicActApplicable = useWatch({ control, name: 'esicActApplicable' })
  const ptActApplicable = useWatch({ control, name: 'ptActApplicable' })
  const ptActType = useWatch({ control, name: 'ptActType' })
  const tdsActApplicable = useWatch({ control, name: 'tdsActApplicable' })
  const lwfActApplicable = useWatch({ control, name: 'lwfActApplicable' })
  const lwfActType = useWatch({ control, name: 'lwfActType' })
  const overtimeApplicable = useWatch({ control, name: 'overtimeApplicable' })

  const wagePerDay = calculateWagePerDay(basicPay ?? '')

  /**
   * Switching the calculation type clears the field the other mode owns, so a
   * designation never keeps both fixed working days and a weekly off. Clearing
   * the type drops both, since neither field is on screen any more.
   */
  const changeWorkingDayCalculationType = (
    value: string,
    onChange: (value: string) => void,
  ) => {
    onChange(value)
    if (value !== 'Fixed') setValue('workingDays', '')
    if (value !== 'As Per Calculation') setValue('weeklyOff', '')
  }

  const goToList = () => navigate({ to: '/master/designation' })

  const onSubmit = handleSubmit((values) => {
    createDesignation.mutate(values, {
      onSuccess: (designation) => {
        toast.success('Designation created')
        /*
         * Go to the saved designation's LEAVE ALLOWANCE tab rather than back to
         * the list. That tab is locked on the create form — an allowance is stored
         * against `/user/designations/:id/leave-quotas`, and there is no id until
         * this call answers — so landing on it IS how it unlocks, with the record
         * behind it now.
         *
         * `replace` so Back doesn't return to a create form that has already been
         * submitted, which would invite a duplicate.
         */
        navigate({
          to: '/master/designation/create',
          search: { data: encryptParams({ id: designation.id, tab: 'leave' }) },
          replace: true,
        })
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : 'Failed to create designation',
        ),
    })
  })

  return {
    register,
    control,
    errors,

    allowanceHeads,
    deductionHeads,
    componentsLoading: components.isLoading,

    basicPay: basicPay ?? '',
    wagePerDay,
    workingDayCalculationType,
    changeWorkingDayCalculationType,
    pfActApplicable,
    pfDeductionType,
    esicActApplicable,
    ptActApplicable,
    ptActType,
    tdsActApplicable,
    lwfActApplicable,
    lwfActType,
    overtimeApplicable,

    onSubmit,
    isPending: createDesignation.isPending,
    goToList,
  }
}

/**
 * A blank row for one head. Both sides take the same shape — the API carries
 * allowances and deductions in one `salary_components` array, each entry with a
 * value, a ₹/% type and the three act markers.
 */
function blankComponentRow(head: HeadRow): DesignationComponentRow {
  return {
    componentId: String(head.id),
    valueType: 'Percentage',
    amount: '',
    pfApplicable: false,
    esicApplicable: false,
    ptApplicable: false,
  }
}

/** The master's heads for one side, as form rows. */
function headRows(
  components: { id: number; type: string; name: string; shortName: string }[] | undefined,
  type: 'ALLOWANCE' | 'DEDUCTION',
): HeadRow[] {
  return (components ?? [])
    .filter((component) => component.type === type)
    .map((component) => ({
      id: component.id,
      label: `${component.shortName} (${component.name})`,
    }))
}
