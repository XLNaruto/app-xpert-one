import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAllowanceDeductions } from '@/features/master/allowance-deduction'
import { designationSchema, type DesignationFormValues } from '../schemas'
import { EMPTY_DESIGNATION_FORM } from '../constants'
import { useDesignation } from '../api/use-designation'
import {
  useCreateDesignation,
  useUpdateDesignation,
} from '../api/use-designation-mutations'
import { designationToFormValues } from '../lib/designation-mappers'
import { calculateWagePerDay } from '../lib/designation-calculations'

/** One allowance / deduction head as listed on the form. */
export interface HeadRow {
  id: number
  label: string
}

/**
 * Owns the designation form for both create and edit: the record load, the
 * allowance and deduction head rows, the derived wage per day and the save. The
 * page consumes this and only lays out fields.
 */
export function useDesignationForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useDesignation(id ?? Number.NaN)
  const createDesignation = useCreateDesignation()
  const updateDesignation = useUpdateDesignation(id ?? Number.NaN)

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
  const allowanceHeads = useMemo<HeadRow[]>(() => headRows(components.data, 'ALLOWANCE'), [components.data])
  const deductionHeads = useMemo<HeadRow[]>(() => headRows(components.data, 'DEDUCTION'), [components.data])

  /*
   * Seed the form once the heads (and, in edit mode, the record) have loaded —
   * one row per head, carrying whatever the record already had for it.
   */
  useEffect(() => {
    if (!components.data) return
    if (isEdit && !detail.data) return
    const saved = detail.data

    reset({
      ...(saved ? designationToFormValues(saved) : EMPTY_DESIGNATION_FORM),
      allowances: allowanceHeads.map((head) => {
        const existing = saved?.allowances.find((a) => a.componentId === head.id)
        return {
          componentId: String(head.id),
          valueType: existing?.valueType ?? 'Percentage',
          amount: existing?.amount != null ? String(existing.amount) : '',
          pfApplicable: existing?.pfApplicable ?? false,
          esicApplicable: existing?.esicApplicable ?? false,
          ptApplicable: existing?.ptApplicable ?? false,
        }
      }),
      deductions: deductionHeads.map((head) => ({ componentId: String(head.id) })),
    })
  }, [components.data, detail.data, isEdit, allowanceHeads, deductionHeads, reset])

  // Watched values that other fields read: derived wage, and which act settings show.
  const basicPay = useWatch({ control, name: 'basicPay' })
  const workingDayCalculationType = useWatch({ control, name: 'workingDayCalculationType' })
  const pfActApplicable = useWatch({ control, name: 'pfActApplicable' })
  const pfDeductionType = useWatch({ control, name: 'pfDeductionType' })
  const esicActApplicable = useWatch({ control, name: 'esicActApplicable' })
  const ptActApplicable = useWatch({ control, name: 'ptActApplicable' })
  const ptActType = useWatch({ control, name: 'ptActType' })
  const lwfActApplicable = useWatch({ control, name: 'lwfActApplicable' })
  const lwfActType = useWatch({ control, name: 'lwfActType' })
  const overtimeApplicable = useWatch({ control, name: 'overtimeApplicable' })
  const overtimeCalculationType = useWatch({ control, name: 'overtimeCalculationType' })

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
    const mutation = isEdit ? updateDesignation : createDesignation
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Designation updated' : 'Designation created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} designation`,
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
    lwfActApplicable,
    lwfActType,
    overtimeApplicable,
    overtimeCalculationType,

    onSubmit,
    isEdit,
    isPending: isEdit ? updateDesignation.isPending : createDesignation.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
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
