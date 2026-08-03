import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useStateSelect } from '@/features/master/state'
import { useDistrictSelect } from '@/features/master/district'
import { BRANCH_DETAIL_FIELDS, branchSchema, type BranchFormValues } from '../schemas'
import { EMPTY_BRANCH_ACTS_FORM, EMPTY_BRANCH_FORM } from '../constants'
import { useBranch } from '../api/use-branch'
import { useCreateBranch, useUpdateBranch } from '../api/use-branch-mutations'
import { useBranchActs } from '../api/use-branch-acts'
import { useSaveBranchActs } from '../api/use-branch-acts-mutations'
import { branchToFormValues } from '../lib/branch-mappers'
import { actsToFormValues } from '../lib/act-mappers'
import { useActLookups } from './use-act-lookups'

/** The two tabs of the create/edit screen. */
export type BranchFormTab = 'detail' | 'acts'

/**
 * Owns the branch form for both create and edit — both tabs, and both endpoints
 * behind them.
 *
 * The branch itself lives in `/user/branches`; its applicable acts are a
 * separate row in `/user/act-registrations`, keyed by branch id. That id is the
 * reason the screen is two steps rather than two tabs of one form: until the
 * branch exists there's nothing for an acts row to hang off, so the acts tab
 * stays locked and saving step one unlocks it. The page consumes this and only
 * lays out fields.
 */
export function useBranchForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const [tab, setTab] = useState<BranchFormTab>('detail')

  const detail = useBranch(id ?? Number.NaN)
  const acts = useBranchActs(id ?? Number.NaN)
  const createBranch = useCreateBranch()
  const updateBranch = useUpdateBranch(id ?? Number.NaN)
  const saveActs = useSaveBranchActs()

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: EMPTY_BRANCH_FORM,
  })

  // Seed each tab as its own record lands (edit mode only). They arrive from
  // two endpoints and in either order, so each reset merges onto what the form
  // already holds rather than replacing it — otherwise whichever answered
  // second would wipe the other tab back to blank.
  useEffect(() => {
    if (detail.data) {
      reset({ ...getValues(), ...branchToFormValues(detail.data) })
    }
  }, [detail.data, getValues, reset])

  useEffect(() => {
    if (acts.data === undefined) return
    // `null` is a real answer — the branch has no acts row, so the tab opens
    // blank and the first save will POST one.
    reset({
      ...getValues(),
      ...(acts.data ? actsToFormValues(acts.data) : EMPTY_BRANCH_ACTS_FORM),
    })
  }, [acts.data, getValues, reset])

  const selectedStateId = useWatch({ control, name: 'stateId' })
  const selectedDistrictId = useWatch({ control, name: 'districtId' })

  /**
   * What the form currently holds, plus the record's own name for it when there
   * is one. The dropdowns page in from the server, and a saved selection is
   * usually further down the master than the first page reaches — handed the
   * value, the select keeps that option visible either way: labelled from the
   * record when the API sent a name, or read by id in the background when it
   * didn't. A name the API couldn't resolve reads as a dash, which is no use as
   * a label, so it's dropped and the by-id read fills in instead.
   */
  const chosen = (value: string, recordId: number | null, name: string) => {
    if (!value) return undefined
    const isSaved = recordId !== null && String(recordId) === value
    const label = isSaved && name && name !== '—' ? name : undefined
    return { value, label }
  }

  // Both dropdowns page in as they're scrolled and search server-side, so the
  // form never pulls all ~36 states or the district master's ~800 rows up front.
  const state = useStateSelect({
    selected: chosen(
      selectedStateId,
      detail.data?.stateId ?? null,
      detail.data?.stateName ?? '',
    ),
  })

  // Districts cascade off the state, and the API narrows them by `state_id`.
  const district = useDistrictSelect({
    stateId: selectedStateId ? Number(selectedStateId) : undefined,
    selected: chosen(
      selectedDistrictId,
      detail.data?.districtId ?? null,
      detail.data?.districtName ?? '',
    ),
  })

  /** Pick a state and clear its district — it won't exist under the new state. */
  const changeState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('districtId', '')
  }

  const ptStateId = useWatch({ control, name: 'ptStateId' })

  // The acts tab's own references: the state master, the Professional Tax
  // district read, and five office lists. None of it is cheap and none of it
  // belongs to the branch detail step, so it waits until that tab is genuinely
  // on screen.
  const lookups = useActLookups({
    enabled: isEdit && tab === 'acts',
    ptStateId: ptStateId ? Number(ptStateId) : undefined,
  })

  /** The Professional Tax state/district pair — the only one the acts carry. */
  const pt = useMemo(
    () => ({
      districtOptions: lookups.ptDistrictOptions,
      hasState: Boolean(ptStateId),
      changeState: (value: string, onChange: (value: string) => void) => {
        onChange(value)
        setValue('ptDistrictId', '')
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ptStateId, lookups.ptDistrictOptions],
  )

  const goToList = () => navigate({ to: '/master/branch' })

  /**
   * The acts row belongs to a branch, so step two only opens once step one has
   * been saved and the branch has an id.
   */
  const canEditActs = isEdit

  /** Switch tabs, refusing the locked one with a reason rather than silently. */
  const selectTab = (next: BranchFormTab) => {
    if (next === 'acts' && !canEditActs) {
      toast.error('Complete the branch detail first, then add its applicable acts.')
      return
    }
    setTab(next)
  }

  /**
   * Save the acts row for `branchId`, then leave for the list.
   *
   * The branch is already saved by the time this runs, so a failure here is
   * reported as its own thing — the user is told the branch went in and the acts
   * didn't, rather than being left to assume nothing saved.
   */
  const saveActsThenLeave = (branchId: number, values: BranchFormValues) => {
    saveActs.mutate(
      { branchId, actsId: acts.data?.id ?? null, values },
      {
        onSuccess: () => {
          toast.success('Branch updated')
          goToList()
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? `Branch saved, but the applicable acts didn't: ${err.message}`
              : "Branch saved, but the applicable acts didn't.",
          )
          setTab('acts')
        },
      },
    )
  }

  const onSubmit = handleSubmit(
    (values) => {
      if (isEdit) {
        updateBranch.mutate(values, {
          onSuccess: (branch) => saveActsThenLeave(branch.id, values),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : 'Failed to update branch'),
        })
        return
      }

      // Step one. The response carries the new branch's id, so the screen turns
      // into that branch's edit screen and moves straight on to its acts — the
      // acts row now has something to hang off.
      createBranch.mutate(values, {
        onSuccess: (branch) => {
          toast.success('Branch created — now add its applicable acts')
          setTab('acts')
          navigate({
            to: '/master/branch/create',
            search: { data: encryptId(branch.id) },
          })
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to create branch'),
      })
    },
    // Every invalid field already says so under itself, so a toast would only
    // repeat it. All this does is jump to the tab holding the errors — on the
    // hidden one they'd otherwise be invisible.
    (invalid) => {
      const keys = Object.keys(invalid) as (keyof BranchFormValues)[]
      const onDetailTab = keys.some((key) =>
        (BRANCH_DETAIL_FIELDS as readonly string[]).includes(key),
      )
      setTab(onDetailTab ? 'detail' : 'acts')
    },
  )

  // Reading this record was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

  return {
    register,
    control,
    errors,
    tab,
    selectTab,
    /** Step two is locked until the branch exists to hang an acts row off. */
    canEditActs,
    onSubmit,
    isEdit,
    isPending:
      saveActs.isPending || (isEdit ? updateBranch.isPending : createBranch.isPending),
    // Both tabs are seeded before the form is shown, so neither opens on stale
    // blanks the user might save over.
    isLoading: isEdit && (detail.isLoading || acts.isLoading),
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    goToList,
    /** Scroll-lazy dropdown props — spread straight onto `<Combobox>`. */
    state,
    district,
    hasState: Boolean(selectedStateId),
    changeState,
    /** The acts tab's dropdowns. */
    actStateOptions: lookups.stateOptions,
    pt,
    pfOfficeOptions: lookups.officesFor('PF'),
    esicOfficeOptions: lookups.officesFor('ESIC'),
    factoryOfficeOptions: lookups.officesFor('FACTORY'),
    lwfOfficeOptions: lookups.officesFor('LWF'),
    exOfficeOptions: lookups.officesFor('EMPLOYMENT EXCHANGE'),
  }
}
