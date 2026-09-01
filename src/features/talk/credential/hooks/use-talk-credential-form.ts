import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ApiError, getApiErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMyCompanies } from '@/features/company'
import { employeePickerOptions, useEmployeePicker } from '@/features/hr/employee'
import { talkCredentialSchema, type TalkCredentialFormValues } from '../schemas'
import { EMPTY_TALK_CREDENTIAL_FORM, NO_PANEL_PASSWORD_ERROR } from '../constants'
import { useTalkCredential } from '../api/use-talk-credentials'
import {
  useCreateTalkCredential,
  useUpdateTalkCredential,
} from '../api/use-talk-credential-mutations'
import { talkCredentialToFormValues } from '../lib/talk-credential-mappers'

/**
 * Owns the Issue / Edit Talk Credential screen — the employee, the login, the
 * password and the reach.
 *
 * **The credential is Talk's own login, not the panel one.** The address is the
 * username (there is no separate one) and it is unique across every Talk
 * credential on the PLATFORM, because Talk is one deployment whose sign-in
 * resolves the account from the address rather than being told where to look.
 *
 * Two things the API refuses, handled here rather than as a 4xx:
 *
 * - **Re-pointing a credential at another employee.** There's no field for it —
 *   it would hand someone the first person's conversation history under an
 *   address their colleagues already know. So the picker is create-only and the
 *   edit form states who it belongs to instead.
 * - **A second credential for the same employee.** One person, one Talk login
 *   (409). Nothing on this screen can pre-empt that, so the message is surfaced
 *   as the server words it.
 *
 * Both forms offer **"same as panel credentials"**, which hands the seeding to
 * the endpoint: the address comes from the employee's panel account, and the
 * password too when they have one. Turning it on puts the three credential
 * boxes away — there is nothing to fill in — and empties them, so a value typed
 * before the switch was flipped can't travel unseen.
 *
 * On EDIT the same flag RE-SEEDS from the panel credential as it stands now, and
 * a password sent alongside it counts only as the fallback for an employee with
 * no panel account — never as a rotation. So the way to ROTATE a seeded
 * credential is to turn the switch OFF, which brings the boxes back and sends
 * `false`. The value travels on every save rather than being omitted, so what
 * the switch shows is what the credential reads afterwards; left off, the
 * endpoint decides for itself and the form would be describing a save it never
 * made.
 *
 * Employees without a panel account sign in by phone OTP and so have no
 * password to copy, and NOTHING ON THE CLIENT can tell which of the two an
 * employee is. That case is recovered rather than prevented: the 409 saying
 * there was no password to copy flips {@link panelPasswordRequired}, which
 * brings the password boxes back — required this time — without the user having
 * to work out that unticking is what the message wanted.
 */
export function useTalkCredentialForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useTalkCredential(id ?? Number.NaN)

  /**
   * Set by the "no panel password to copy" 409 — see the note above. Cleared
   * whenever the switch is turned off, since the boxes come back on their own
   * terms then and the server has said nothing about the next employee.
   */
  const [panelPasswordRequired, setPanelPasswordRequired] = useState(false)

  const createCredential = useCreateTalkCredential()
  const updateCredential = useUpdateTalkCredential(id ?? Number.NaN)

  const { companies, isLoading: isCompaniesLoading } = useMyCompanies()

  /**
   * A password is required to issue a credential and optional to edit one, the
   * employee is asked for on create alone, and the panel-copy checkbox lifts
   * both credential fields — so the schema is built for the mode rather than
   * declared once. The checkbox itself is a form value, so the rules it moves
   * live inside the refinement rather than here.
   */
  const schema = useMemo(
    () => talkCredentialSchema({ isEdit, requirePanelPassword: panelPasswordRequired }),
    [isEdit, panelPasswordRequired],
  )

  const form = useForm<TalkCredentialFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_TALK_CREDENTIAL_FORM,
  })
  const { control, reset, handleSubmit, setValue } = form

  const departmentGrants = useFieldArray({ control, name: 'departmentGrants' })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(talkCredentialToFormValues(detail.data))
  }, [detail.data, reset])

  const employeeId = useWatch({ control, name: 'employeeId' }) ?? ''
  /**
   * Live in BOTH modes — PATCH takes the flag too. On edit it starts at whatever
   * the record says and, turned on again, re-seeds from the panel credential.
   */
  const isSameAsPanelCreds = useWatch({ control, name: 'isSameAsPanelCreds' }) ?? false
  const status = useWatch({ control, name: 'status' }) ?? 'active'
  const companyIds = useWatch({ control, name: 'companyIds' }) ?? []

  /**
   * The company each department row currently names, by row. One row PER
   * COMPANY is the rule, so a row's picker offers everything the others haven't
   * taken.
   */
  const grantCompanyIds = (useWatch({ control, name: 'departmentGrants' }) ?? []).map(
    (grant) => grant?.companyId ?? '',
  )

  /* ── The employee picker ────────────────────────────────────────────────── */

  /**
   * The dropdown's own search box. The picker endpoint matches the NAME
   * server-side across every company of the account, so the term travels rather
   * than filtering a page that was already fetched.
   */
  const [employeeSearch, setEmployeeSearch] = useState('')
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 300)

  // Only create mode picks an employee; an edit names one it already knows, so
  // the read doesn't run there at all.
  const employees = useEmployeePicker(debouncedEmployeeSearch, !isEdit)

  /**
   * The option that was picked, remembered by label.
   *
   * The list is re-fetched per search term, so the chosen employee drops out of
   * `options` as soon as the user types something else — and a `<Combobox>` with
   * no matching option shows a blank trigger. Holding onto the pick keeps the
   * field readable while the panel is being searched again.
   */
  const [pickedEmployee, setPickedEmployee] = useState<{
    label: string
    value: string
  } | null>(null)

  const employeeOptions = useMemo(() => {
    const options = employeePickerOptions(employees.data?.items ?? [])
    if (pickedEmployee && !options.some((option) => option.value === pickedEmployee.value)) {
      return [pickedEmployee, ...options]
    }
    return options
  }, [employees.data, pickedEmployee])

  const setEmployeeId = (value: string) => {
    setPickedEmployee(employeeOptions.find((option) => option.value === value) ?? null)
    setValue('employeeId', value, { shouldValidate: true, shouldDirty: true })
  }

  /**
   * The picker answers one page (the API caps `limit` at 100). Say so when there
   * are more, rather than letting a missing colleague read as "not an employee".
   */
  const hasMoreEmployees = (employees.data?.total ?? 0) > (employees.data?.items.length ?? 0)

  /* ── Copying the panel login ────────────────────────────────────────────── */

  /**
   * Turning the switch on empties all three credential boxes along with hiding
   * them. The address is discarded server-side anyway, and a password typed
   * before the switch was flipped would otherwise still travel — out of sight,
   * and quietly becoming the login instead of the panel one.
   *
   * Turning it off also forgets the "no panel password" answer: the boxes are
   * back on their own terms, and the next employee may well have a panel login.
   */
  const setIsSameAsPanelCreds = (checked: boolean) => {
    const options = { shouldValidate: true, shouldDirty: true }
    setValue('isSameAsPanelCreds', checked, options)

    if (checked) {
      setValue('email', '', options)
      setValue('password', '', options)
      setValue('confirmPassword', '', options)
    } else if (detail.data) {
      // Turning it back off on an EDIT puts the stored address back. It was
      // emptied on the way in, and an empty box here would read as "this
      // credential has no login" rather than "you cleared it a click ago".
      setValue('email', detail.data.email, options)
    }

    setPanelPasswordRequired(false)
  }

  /* ── Reach ──────────────────────────────────────────────────────────────── */

  const setStatus = (value: string) =>
    setValue('status', value === 'inactive' ? 'inactive' : 'active', {
      shouldValidate: true,
      shouldDirty: true,
    })

  /** Companies for the whole-company tiles and for the department rows. */
  const companyOptions = useMemo(
    () => companies.map((company) => ({ label: company.name, value: String(company.id) })),
    [companies],
  )

  const toggleCompany = (companyId: number) => {
    const next = companyIds.includes(companyId)
      ? companyIds.filter((current) => current !== companyId)
      : [...companyIds, companyId]
    setValue('companyIds', next, { shouldValidate: true, shouldDirty: true })
  }

  const addDepartmentGrant = () =>
    departmentGrants.append({ companyId: '', departmentIds: [] })

  /** A row's departments belong to its company — a company change empties them. */
  const clearGrantDepartments = (index: number) =>
    setValue(`departmentGrants.${index}.departmentIds`, [], {
      shouldValidate: true,
      shouldDirty: true,
    })

  const goToList = () => navigate({ to: '/talk/credential' })

  /**
   * Every failure a save with the switch ON can answer, in one place — the two
   * endpoints word them identically because they do the same copying.
   *
   * One of them is recoverable in place: the employee signs into the employee
   * app by phone OTP and so has no panel password to copy. Nothing on the client
   * can foresee that, so the password boxes come back — required — and the rest
   * of the form, reach included, survives the failed save.
   */
  const handleSeedError = (err: unknown, fallback: string) => {
    const message = getApiErrorMessage(err, fallback)

    if (
      err instanceof ApiError &&
      err.status === 409 &&
      NO_PANEL_PASSWORD_ERROR.test(err.message)
    ) {
      setPanelPasswordRequired(true)
      toast.error(message, { description: 'Enter a password below and save again.' })
      return
    }

    // With the switch on, the address in a "this email already has a Talk login"
    // is the COPIED one, which the user never typed — say so, or the message
    // reads as being about a box they can see.
    toast.error(message, {
      description: isSameAsPanelCreds
        ? "The login was copied from the employee's panel credential. Turn off \u201csame as panel credentials\u201d to enter one instead."
        : undefined,
    })
  }

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateCredential.mutate(values, {
        onSuccess: () => {
          toast.success('Talk credential updated')
          goToList()
        },
        // A moved address is re-checked platform-wide, and a re-seed can find
        // nothing to copy — both 409s, worded by the server.
        onError: (err) => handleSeedError(err, "Couldn't update the Talk credential."),
      })
      return
    }

    createCredential.mutate(values, {
      onSuccess: () => {
        toast.success('Talk credential issued')
        goToList()
      },
      // Either the address is taken somewhere on the platform, the employee
      // already holds a credential, or the panel login had nothing to copy.
      onError: (err) => handleSeedError(err, "Couldn't issue the Talk credential."),
    })
  })

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    goToList,

    /** The credential being edited — undefined while loading, and on create. */
    credential: detail.data,

    /* Employee — create only */
    employeeId,
    setEmployeeId,
    employeeOptions,
    employeeSearch,
    setEmployeeSearch,
    isEmployeesLoading: employees.isLoading,
    hasMoreEmployees,

    /* Credentials */
    isSameAsPanelCreds,
    setIsSameAsPanelCreds,
    /**
     * The endpoint has said this employee has no panel password to copy — the
     * password boxes are shown again, required, with the switch still on.
     */
    panelPasswordRequired,
    /**
     * What the credential reads TODAY, before this form touches it. The switch
     * is the value being saved; this is the one to compare it against.
     */
    wasSeededFromPanel: detail.data?.isSameAsPanelCreds ?? false,
    status,
    setStatus,

    /* Reach — two independent lists */
    companies,
    companyIds,
    companyOptions,
    isCompaniesLoading,
    toggleCompany,
    departmentGrants,
    grantCompanyIds,
    /** Every company already has a row — there is nothing left to add. */
    canAddDepartmentGrant: departmentGrants.fields.length < companyOptions.length,
    addDepartmentGrant,
    clearGrantDepartments,

    isPending: isEdit ? updateCredential.isPending : createCredential.isPending,
    isLoading: isEdit ? detail.isLoading : false,
    isError: isEdit ? detail.isError || (!detail.isLoading && !detail.data) : false,
    loadError: isEdit ? detail.error : null,
  }
}
