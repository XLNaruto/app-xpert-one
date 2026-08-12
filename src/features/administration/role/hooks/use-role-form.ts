import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useMyCompanies } from '@/features/company'
import type { Permission, PermissionModule } from '@/features/permissions'
import { roleSchema, type RoleFormValues } from '../schemas'
import { EMPTY_ROLE_FORM, WHOLE_COMPANY } from '../constants'
import { useAssignablePermissions, useRole } from '../api/use-roles'
import { useCreateRole, useUpdateRole } from '../api/use-role-mutations'
import { roleToFormValues } from '../lib/role-mappers'
import {
  buildPermissionIndex,
  countSelectedIn,
  deselectCodes,
  describeCodes,
  lockedCodes,
  missingRequirements,
  nodeState,
  orderCodes,
  selectCodes,
  toggleCode,
  toggleNode,
  type NodeState,
} from '../lib/permission-tree'

/**
 * Owns the Create / Edit Role screen — the form fields, the scope switches and
 * the permission matrix.
 *
 * **The whole selection is one field.** `permission_codes` REPLACES what's
 * stored on save, so the builder holds the complete ticked set rather than a diff
 * of it. `permissionCodes` on the form IS that set; the matrix is a view over it.
 *
 * **The catalog comes from whichever call has it.** `GET /user/roles/:id` already
 * answers with the tree ticked against the role, so edit mode reads one endpoint
 * and create mode reads `assignable-permissions`. Either way the tree is only a
 * *rendering* of the selection — what the user ticks lives in the form.
 */
export function useRoleForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useRole(id ?? Number.NaN)
  // Edit already gets the catalog inside the detail, so only create fetches it.
  const catalog = useAssignablePermissions(!isEdit)

  const createRole = useCreateRole()
  const updateRole = useUpdateRole(id ?? Number.NaN)

  const { companies, isLoading: isCompaniesLoading } = useMyCompanies()

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: EMPTY_ROLE_FORM,
  })
  const { control, setValue, reset, handleSubmit } = form

  const talkAccess = useFieldArray({ control, name: 'talkAccess' })

  const permissionCodes = useWatch({ control, name: 'permissionCodes' }) ?? []
  const accessLevel = useWatch({ control, name: 'accessLevel' }) ?? 'COMPANY'
  const companyIds = useWatch({ control, name: 'companyIds' }) ?? []
  const talkEnabled = useWatch({ control, name: 'talkEnabled' }) ?? false

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(roleToFormValues(detail.data))
  }, [detail.data, reset])

  /** The tree the matrix renders — from the role in edit mode, the catalog in create. */
  const modules: PermissionModule[] = useMemo(
    () => (isEdit ? (detail.data?.modules ?? []) : (catalog.data?.modules ?? [])),
    [isEdit, detail.data, catalog.data],
  )

  const index = useMemo(() => buildPermissionIndex(modules), [modules])

  /**
   * The selection as a set — every matrix lookup is a membership test.
   *
   * Keyed off the joined codes rather than the array: `useWatch` hands back a
   * fresh array identity on every render, which would rebuild the set (and every
   * memo below it) three hundred entries at a time on each keystroke elsewhere
   * in the form. The codes are `<resource>:<action>` strings, so a NUL separator
   * can't collide with one.
   */
  const selectionKey = permissionCodes.join('\0')
  const selected = useMemo(
    () => new Set<Permission>(selectionKey ? selectionKey.split('\0') : []),
    [selectionKey],
  )

  /**
   * Codes another selected code depends on. They render locked: unticking one
   * directly would silently drop whatever pulled it in.
   */
  const locked = useMemo(() => lockedCodes(selected, index), [selected, index])

  const totalCodes = index.allCodes.length
  const selectedCount = useMemo(
    // Count against the catalog, not the raw array: a stored code with no
    // checkbox (a plan narrowed since) has nothing on screen to count.
    () => index.allCodes.reduce((sum, code) => (selected.has(code) ? sum + 1 : sum), 0),
    [index, selected],
  )

  /** Which module the right-hand panel is showing. */
  const [activeModuleKey, setActiveModuleKey] = useState<string | null>(null)
  const activeModule = useMemo(
    () => modules.find((module) => module.key === activeModuleKey) ?? modules[0] ?? null,
    [modules, activeModuleKey],
  )

  // Open on the first module once the tree arrives, and recover if the module
  // that was open is no longer in the catalog.
  useEffect(() => {
    if (!modules.length) return
    setActiveModuleKey((current) =>
      current && modules.some((module) => module.key === current) ? current : modules[0].key,
    )
  }, [modules])

  /** Which nodes inside the panel are expanded, by key. */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const toggleExpanded = (key: string) =>
    setExpandedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const setAllExpanded = (expanded: boolean) =>
    setExpandedKeys(
      expanded
        ? new Set(
            // Every node of the open module, so "Expand all" reaches the leaves.
            [...index.nodeByKey.values()]
              .filter((flat) => flat.rootKey === activeModule?.key)
              .map((flat) => flat.node.key),
          )
        : new Set(),
    )

  /**
   * The keys the "Expand all" control actually governs: the open module's nodes
   * that hold children. The module itself is excluded — its sections are always
   * drawn, so it has no chevron of its own to count.
   */
  const expandableKeys = useMemo(
    () =>
      [...index.nodeByKey.values()]
        .filter(
          (flat) =>
            flat.rootKey === activeModule?.key &&
            flat.node.key !== activeModule?.key &&
            flat.node.children.length > 0,
        )
        .map((flat) => flat.node.key),
    [index, activeModule],
  )

  /** Everything that can be open is open — the control flips to "Collapse all". */
  const isAllExpanded =
    expandableKeys.length > 0 && expandableKeys.every((key) => expandedKeys.has(key))

  /** Write a new selection back to the form, in catalog order. */
  const commit = (next: Set<Permission>) =>
    setValue('permissionCodes', orderCodes(next, index), {
      shouldValidate: true,
      shouldDirty: true,
    })

  /**
   * Tick or untick one checkbox. Ticking pulls in what the code needs; unticking
   * drops what needed it — which is why the counter can move by more than one.
   */
  const onToggleCode = (code: Permission) => commit(toggleCode(selected, code, index))

  /** Tick or untick a whole node — a module, a section or one screen's row. */
  const onToggleNode = (node: PermissionModule) => commit(toggleNode(selected, node, index))

  /** Every code in the catalog, or none of them. */
  const selectAll = () => commit(selectCodes(selected, index.allCodes, index))
  const clearAll = () => commit(deselectCodes(selected, index.allCodes, index))

  /** The open module, wholesale. */
  const toggleActiveModule = () => {
    if (activeModule) onToggleNode(activeModule)
  }

  /** State + counters for one node's row, so the components stay presentational. */
  const stateOf = (node: PermissionModule): NodeState => nodeState(selected, node)
  const countOf = (node: PermissionModule) => countSelectedIn(selected, node)

  /** What a marked pill says on hover — what goes with it if it's cleared. */
  const requiredByLabel = (code: Permission): string | undefined => {
    if (!locked.has(code)) return undefined
    // Only the one-way holders — a mutual pair never locks, so naming one as the
    // reason would send the user to a checkbox that isn't holding anything.
    const holders = [...selected].filter(
      (other) =>
        other !== code &&
        (index.requiresByCode.get(other) ?? []).includes(code) &&
        !(index.requiresByCode.get(code) ?? []).includes(other),
    )
    const names = describeCodes(holders, index)
    return names.length
      ? `Needed by ${names.join(', ')} — clearing this clears ${names.length === 1 ? 'it' : 'them'} too.`
      : undefined
  }

  /** Companies for the scope picker and the Talk grants. */
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

  const addTalkGrant = () =>
    talkAccess.append({ companyId: '', departmentId: WHOLE_COMPANY })

  const goToList = () => navigate({ to: '/administration/role' })

  const onSubmit = handleSubmit((values) => {
    // The closure is maintained as the user ticks, so this only ever fires for a
    // STORED set that predates a catalog change — an edit form seeded from one.
    const missing = missingRequirements(new Set(values.permissionCodes), index)
    if (missing.length) {
      const repaired = selectCodes(new Set(values.permissionCodes), missing, index)
      commit(repaired)
      toast.info(
        `Added ${missing.length} permission${missing.length === 1 ? '' : 's'} the selection needs to work. Review and save again.`,
      )
      return
    }

    const mutation = isEdit ? updateRole : createRole
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Role updated' : 'Role created')
        goToList()
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't save the role.")),
    })
  })

  // The builder is useless without a catalog — an empty one means the account has
  // no serving subscription, which the screen says rather than drawing nothing.
  const isCatalogEmpty =
    !catalog.isLoading && !detail.isLoading && modules.length === 0

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    goToList,

    /** The role being edited — its `isSystem` flag locks the screen down. */
    role: detail.data,

    /* Permission matrix */
    modules,
    activeModule,
    activeModuleKey: activeModule?.key ?? null,
    setActiveModuleKey,
    expandedKeys,
    toggleExpanded,
    setAllExpanded,
    hasExpandable: expandableKeys.length > 0,
    isAllExpanded,
    selected,
    locked,
    selectedCount,
    totalCodes,
    isCatalogEmpty,
    stateOf,
    countOf,
    requiredByLabel,
    onToggleCode,
    onToggleNode,
    selectAll,
    clearAll,
    toggleActiveModule,

    /* Scope & access */
    accessLevel,
    companyIds,
    companyOptions,
    companies,
    isCompaniesLoading,
    toggleCompany,

    /* Talk */
    talkEnabled,
    talkAccess,
    addTalkGrant,

    isPending: isEdit ? updateRole.isPending : createRole.isPending,
    isLoading: isEdit ? detail.isLoading : catalog.isLoading,
    isError: isEdit
      ? detail.isError || (!detail.isLoading && !detail.data)
      : catalog.isError,
    loadError: isEdit ? detail.error : catalog.error,
  }
}
