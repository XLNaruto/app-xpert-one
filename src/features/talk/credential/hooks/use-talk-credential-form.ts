import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMyCompanies } from '@/features/company'
import { employeePickerOptions, useEmployeePicker } from '@/features/hr/employee'
import { talkCredentialSchema, type TalkCredentialFormValues } from '../schemas'
import { EMPTY_TALK_CREDENTIAL_FORM } from '../constants'
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
 */
export function useTalkCredentialForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useTalkCredential(id ?? Number.NaN)

  const createCredential = useCreateTalkCredential()
  const updateCredential = useUpdateTalkCredential(id ?? Number.NaN)

  const { companies, isLoading: isCompaniesLoading } = useMyCompanies()

  /**
   * A password is required to issue a credential and optional to edit one, and
   * the employee is asked for on create alone — so the schema is built for the
   * mode rather than declared once.
   */
  const schema = useMemo(
    () => talkCredentialSchema({ requirePassword: !isEdit, requireEmployee: !isEdit }),
    [isEdit],
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

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      updateCredential.mutate(values, {
        onSuccess: () => {
          toast.success('XpertOne Talk credential updated')
          goToList()
        },
        // A moved address is re-checked platform-wide (409); the message says so.
        onError: (err) =>
          toast.error(getApiErrorMessage(err, "Couldn't update the XpertOne Talk credential.")),
      })
      return
    }

    createCredential.mutate(values, {
      onSuccess: () => {
        toast.success('XpertOne Talk credential issued')
        goToList()
      },
      // Either the address is taken somewhere on the platform or the employee
      // already holds a credential — both are 409s, worded by the server.
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't issue the XpertOne Talk credential.")),
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
