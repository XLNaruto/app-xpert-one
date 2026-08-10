import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { encryptId } from '@/lib/crypto'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { IMAGE_CONTENT_TYPES } from '@/lib/uploads'
import { useStateSelect } from '@/features/master/state'
import { useDistrictSelect } from '@/features/master/district'
import { companySchema, type CompanyFormValues } from '../schemas'
import { EMPTY_COMPANY_FORM } from '../constants'
import { useCompany } from '../api/use-company'
import {
  useCreateCompany,
  useUpdateCompany,
  useUploadCompanyLogo,
} from '../api/use-company-mutations'
import { companyToFormValues } from '../lib/company-mappers'

/** The two tabs of the create/edit screen. */
export type CompanyFormTab = 'detail' | 'shift'

/**
 * Owns the company form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PATCH; create mode POSTs a
 * fresh record. Also feeds the state/district dropdowns, with district cascading
 * off the chosen state. The page consumes this and only lays out fields.
 *
 * The Shift tab is a different resource entirely (`/user/shifts`, keyed by
 * company id) with its own form and its own save, so this hook only owns which
 * tab is showing — never the shifts themselves.
 */
export function useCompanyForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const [tab, setTab] = useState<CompanyFormTab>('detail')

  const detail = useCompany(id ?? Number.NaN)
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany(id ?? Number.NaN)
  const uploadLogo = useUploadCompanyLogo()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: EMPTY_COMPANY_FORM,
  })

  /**
   * The picked logo, held until Save. Nothing is presigned or PUT while the user
   * is still filling the form: an abandoned form leaves no stray object in
   * storage, and swapping the logo three times costs one upload, not three. The
   * form's `logo` value stays the *stored* key until that upload lands.
   */
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Seed the form once the record loads (edit mode only). A re-seed discards the
  // pending logo along with everything else typed — the two have to agree.
  useEffect(() => {
    if (detail.data) {
      reset(companyToFormValues(detail.data))
      setLogoFile(null)
    }
  }, [detail.data, reset])

  /**
   * Take (or clear) the pending logo. The content type is checked here rather
   * than at save time — the file dialog is already filtered, but a user who gets
   * an unsupported one through should hear about it now, not lose a save to it.
   */
  const pickLogoFile = (file: File | null) => {
    if (file && !(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      toast.error('Logo must be a JPG, PNG or WebP image.')
      return
    }
    setLogoFile(file)
  }

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

  const goToList = () => navigate({ to: '/master/company' })

  /**
   * A shift hangs off a company id, so the tab only opens once the company
   * exists — on a fresh create there is nothing to attach one to yet.
   */
  const canEditShifts = isEdit

  /** Switch tabs, refusing the locked one with a reason rather than silently. */
  const selectTab = (next: CompanyFormTab) => {
    if (next === 'shift' && !canEditShifts) {
      toast.error('Save the company first, then add its shifts.')
      return
    }
    setTab(next)
  }

  const onSubmit = handleSubmit(async (values) => {
    // The logo is uploaded as part of the save, not when it was picked. It has
    // to land first: the record stores the key the presigned PUT answers.
    let payload = values
    if (logoFile) {
      try {
        const key = await uploadLogo.mutateAsync(logoFile)
        setValue('logo', key)
        setLogoFile(null)
        payload = { ...values, logo: key }
      } catch (error) {
        // The pending file is kept, so Save can be pressed again without
        // re-picking — and nothing was written, so there's no half-saved record.
        toast.error(getApiErrorMessage(error, "Couldn't upload the logo."))
        return
      }
    }

    if (isEdit) {
      updateCompany.mutate(payload, {
        onSuccess: () => {
          toast.success('Company updated')
          goToList()
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to update company'),
      })
      return
    }

    // The response carries the new company's id, so the screen turns into that
    // company's edit screen and moves straight on to its shifts — which now
    // have a company to hang off.
    createCompany.mutate(payload, {
      onSuccess: (company) => {
        toast.success('Company created — now add its shifts')
        setTab('shift')
        navigate({
          to: '/master/company/create',
          search: { data: encryptId(company.id) },
        })
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to create company'),
    })
  })

  // Reading this record was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

  return {
    register,
    control,
    errors,
    tab,
    selectTab,
    /** The Shift tab is locked until the company exists to hang shifts off. */
    canEditShifts,
    /** The company the Shift tab reads and writes — undefined while creating. */
    companyId: id,
    onSubmit,
    isEdit,
    // The deferred upload is part of the save, so the buttons stay disabled for
    // it too — otherwise Save could be pressed twice while the bytes are going up.
    isPending:
      uploadLogo.isPending || (isEdit ? updateCompany.isPending : createCompany.isPending),
    /** True while the picked logo is being presigned + PUT as part of a save. */
    isUploadingLogo: uploadLogo.isPending,
    logoFile,
    pickLogoFile,
    isLoading: isEdit && detail.isLoading,
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
  }
}
