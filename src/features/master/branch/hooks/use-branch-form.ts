import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useStates } from '@/features/master/state'
import { useDistricts } from '@/features/master/district'
import { BRANCH_DETAIL_FIELDS, branchSchema, type BranchFormValues } from '../schemas'
import { EMPTY_BRANCH_FORM } from '../constants'
import { useBranch } from '../api/use-branch'
import { useCreateBranch, useUpdateBranch } from '../api/use-branch-mutations'
import { branchToFormValues } from '../lib/branch-mappers'

/** The two tabs of the manage screen. */
export type BranchFormTab = 'detail' | 'acts'

/**
 * Owns the branch form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PUT; create mode POSTs a fresh
 * record. Also feeds the state/district dropdowns from their masters and keeps
 * the active tab in sync with validation errors. The page only lays out fields.
 */
export function useBranchForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useBranch(id ?? Number.NaN)
  const createBranch = useCreateBranch()
  const updateBranch = useUpdateBranch(id ?? Number.NaN)

  const [tab, setTab] = useState<BranchFormTab>('detail')

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: EMPTY_BRANCH_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(branchToFormValues(detail.data))
  }, [detail.data, reset])

  // State + district dropdowns come from their own masters.
  const { data: states } = useStates()
  const { data: districts } = useDistricts()

  const stateOptions = useMemo<ComboboxOption[]>(
    () => (states ?? []).map((s) => ({ label: s.stateName, value: s.stateName })),
    [states],
  )

  /** Districts belonging to `state` (empty until one is chosen). */
  const districtsIn = (state: string): ComboboxOption[] =>
    (districts ?? [])
      .filter((d) => d.state === state)
      .map((d) => ({ label: d.districtName, value: d.districtName }))

  const pfState = watch('pfState')
  const esicState = watch('esicState')
  const pfDistrictOptions = useMemo(
    () => districtsIn(pfState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [districts, pfState],
  )
  const esicDistrictOptions = useMemo(
    () => districtsIn(esicState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [districts, esicState],
  )

  /** Pick an act's state and clear its district — it may not exist under the new state. */
  const changePfState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('pfDistrict', '')
  }
  const changeEsicState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('esicDistrict', '')
  }

  const goToList = () => navigate({ to: '/branch' })

  const onSubmit = handleSubmit(
    (values) => {
      const mutation = isEdit ? updateBranch : createBranch
      mutation.mutate(values, {
        onSuccess: () => {
          toast.success(isEdit ? 'Branch updated' : 'Branch created')
          goToList()
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : `Failed to ${isEdit ? 'update' : 'create'} branch`,
          ),
      })
    },
    // Errors can sit on the hidden tab — jump to whichever one holds them.
    (invalid) => {
      const keys = Object.keys(invalid) as (keyof BranchFormValues)[]
      const onDetailTab = keys.some((key) =>
        (BRANCH_DETAIL_FIELDS as readonly string[]).includes(key),
      )
      setTab(onDetailTab ? 'detail' : 'acts')
      toast.error('Please fix the highlighted fields')
    },
  )

  return {
    register,
    control,
    errors,
    tab,
    setTab,
    stateOptions,
    pfDistrictOptions,
    esicDistrictOptions,
    changePfState,
    changeEsicState,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateBranch.isPending : createBranch.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
