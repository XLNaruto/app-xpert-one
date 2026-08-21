import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { PERMISSIONS, useCan } from '@/features/permissions'
import {
  useLeaveApprovalChain,
  useLeaveApprovalRoleNames,
} from '../api/use-leave-approval-chain'
import { useSaveLeaveApprovalChain } from '../api/use-leave-approval-chain-mutations'
import { reorderRoleNames } from '../lib/leave-approval-chain-mappers'

/**
 * Hierarchy Management → Leave: the account's one leave approval chain.
 *
 * **The whole list is the edit.** There is no per-level endpoint — inserting a
 * level renumbers everything below it — so the screen holds the complete ordered
 * list of role names and PUTs it entire. Editing is therefore local until Save,
 * which is also what makes drag-to-reorder honest: nothing moves on the server
 * until the user says so.
 *
 * **The empty chain is the OFF switch.** An account that has configured nothing
 * behaves exactly as it did before this feature existed — anyone holding
 * `leaves:update` may decide any leave. Routing begins only when a chain is
 * saved, and clearing it back to empty turns routing off again.
 */
export function useLeaveApprovalChainList() {
  const chain = useLeaveApprovalChain()
  const roleNames = useLeaveApprovalRoleNames()
  const save = useSaveLeaveApprovalChain()

  const { can } = useCan()
  /**
   * `:update` is owner-only and isn't offered by the role builder — whoever edits
   * the chain chooses who approves leave, so a role holding it could route every
   * application in the account to itself.
   */
  const canUpdate = can(`${PERMISSIONS.leaveApprovalChain}:update`)

  /** The order being edited. Server state until the user touches it. */
  const [draft, setDraft] = useState<string[] | null>(null)

  // Seed from the server, and re-seed after each save.
  useEffect(() => {
    if (chain.data) setDraft(chain.data.levels.map((level) => level.roleName))
  }, [chain.data])

  /** Memoised so the `[]` before the first load isn't a new array every render. */
  const order = useMemo(() => draft ?? [], [draft])

  /** Coverage by role name, so a dragged row keeps its counts without a refetch. */
  const coverage = useMemo(
    () => new Map((chain.data?.levels ?? []).map((level) => [level.roleName, level])),
    [chain.data],
  )

  /** Role names not already in the chain — a role may appear only once (400 otherwise). */
  const availableRoleNames = useMemo(
    () => (roleNames.data ?? []).filter((name) => !order.includes(name)),
    [roleNames.data, order],
  )

  const isDirty = useMemo(() => {
    const saved = (chain.data?.levels ?? []).map((level) => level.roleName)
    return saved.length !== order.length || saved.some((name, i) => name !== order[i])
  }, [chain.data, order])

  const addLevel = (roleName: string) => {
    if (!roleName || order.includes(roleName)) return
    setDraft([...order, roleName])
  }

  const removeLevel = (index: number) =>
    setDraft(order.filter((_, i) => i !== index))

  /** Drag-drop and the keyboard arrows both land here — one move, one new order. */
  const moveLevel = (from: number, to: number) =>
    setDraft(reorderRoleNames(order, from, to))

  const resetDraft = () =>
    setDraft((chain.data?.levels ?? []).map((level) => level.roleName))

  const onSave = () => {
    save.mutate(order, {
      onSuccess: () => {
        toast.success(
          order.length === 0
            ? 'Approval chain cleared — anyone who may decide leave can decide any leave again'
            : 'Approval chain saved',
        )
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't save the leave approval chain.")),
    })
  }

  const isForbidden = isForbiddenError(chain.error)

  return {
    order,
    coverage,
    companyCount: chain.data?.companyCount ?? 0,
    companiesWithOwner: chain.data?.companiesWithOwner ?? [],
    availableRoleNames,
    isRoleNamesLoading: roleNames.isLoading,

    canUpdate,
    isDirty,
    addLevel,
    removeLevel,
    moveLevel,
    resetDraft,
    onSave,
    isSaving: save.isPending,

    isLoading: chain.isLoading,
    isError: chain.isError && !isForbidden,
    error: chain.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(chain.error) : undefined,
  }
}
