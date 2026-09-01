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
 * **The owner's place in the chain is a CHOICE.** They used to be the implicit
 * last link always; now `includesOwner` says whether they still are. Opting out
 * is only accepted while every company is covered by a level — the API does that
 * arithmetic (it walks user reach, not just role names) and answers a 400 naming
 * the companies that would be stranded, so the toggle stays pressable and the 400
 * is the real answer. Untouched, the field never leaves the client: a save that
 * only reordered a level must not put an opted-out owner back into the routing.
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

  /**
   * The owner toggle, and ONLY once touched — `null` means "the user never said",
   * which is what keeps `includes_owner` off the PUT body entirely.
   */
  const [ownerDraft, setOwnerDraft] = useState<boolean | null>(null)

  // Seed from the server, and re-seed after each save.
  useEffect(() => {
    if (chain.data) {
      setDraft(chain.data.levels.map((level) => level.roleName))
      setOwnerDraft(null)
    }
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

  /** The saved choice unless the user has said otherwise on this screen. */
  const savedIncludesOwner = chain.data?.includesOwner ?? true
  const includesOwner = ownerDraft ?? savedIncludesOwner

  const isDirty = useMemo(() => {
    const saved = (chain.data?.levels ?? []).map((level) => level.roleName)
    const orderChanged =
      saved.length !== order.length || saved.some((name, i) => name !== order[i])
    return orderChanged || includesOwner !== savedIncludesOwner
  }, [chain.data, order, includesOwner, savedIncludesOwner])

  const addLevel = (roleName: string) => {
    if (!roleName || order.includes(roleName)) return
    setDraft([...order, roleName])
  }

  const removeLevel = (index: number) =>
    setDraft(order.filter((_, i) => i !== index))

  /** Drag-drop and the keyboard arrows both land here — one move, one new order. */
  const moveLevel = (from: number, to: number) =>
    setDraft(reorderRoleNames(order, from, to))

  const setIncludesOwner = (next: boolean) => setOwnerDraft(next)

  const resetDraft = () => {
    setDraft((chain.data?.levels ?? []).map((level) => level.roleName))
    setOwnerDraft(null)
  }

  const onSave = () => {
    save.mutate(
      {
        roleNames: order,
        // Untouched stays off the body: the stored choice is not this screen's to
        // restate, and a hardcoded `true` here would undo an opt-out on every save.
        includesOwner: ownerDraft ?? undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            order.length === 0
              ? 'Approval chain cleared — anyone who may decide leave can decide any leave again'
              : 'Approval chain saved',
          )
        },
        // The opt-out's 400 names the companies that would be stranded, so it is
        // surfaced verbatim — nothing this screen could write would be as useful.
        onError: (error) =>
          toast.error(
            getApiErrorMessage(error, "Couldn't save the leave approval chain."),
          ),
      },
    )
  }

  const isForbidden = isForbiddenError(chain.error)

  return {
    order,
    coverage,
    companyCount: chain.data?.companyCount ?? 0,
    /**
     * A QUEUE while the owner is in the chain, a WARNING once they are out — the
     * page reads it against `includesOwner`, never on its own.
     */
    companiesWithOwner: chain.data?.companiesWithOwner ?? [],
    includesOwner,
    /**
     * What the LAST SAVE holds, which is what `companiesWithOwner` was counted
     * against — an unsaved toggle mustn't re-label a list the server answered
     * under the other setting.
     */
    savedIncludesOwner,
    availableRoleNames,
    isRoleNamesLoading: roleNames.isLoading,

    canUpdate,
    isDirty,
    addLevel,
    removeLevel,
    moveLevel,
    setIncludesOwner,
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
