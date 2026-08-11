import type { ReactNode } from 'react'
import { useCan } from '../api/use-permissions'
import type { PermissionSpec } from '../types'

interface CanProps {
  /** Render children only when the user satisfies this requirement. */
  permission?: PermissionSpec
  /**
   * Render children only when the user satisfies these. `mode="every"`
   * (default) requires all; `mode="some"` requires at least one.
   */
  anyOf?: PermissionSpec[]
  mode?: 'every' | 'some'
  children: ReactNode
  /** Rendered when the check fails (nothing by default). */
  fallback?: ReactNode
}

/**
 * Declarative permission gate — the JSX counterpart to `useCan()`. Use it for
 * toolbar buttons and row actions the user may not perform.
 *
 * @example
 * <Can permission="employees:create">
 *   <Button onClick={goToCreate}>Add Employee</Button>
 * </Can>
 */
export function Can({
  permission,
  anyOf,
  mode = 'every',
  children,
  fallback = null,
}: CanProps) {
  const { can, canEvery, canSome } = useCan()

  const allowed = anyOf
    ? mode === 'some'
      ? canSome(...anyOf)
      : canEvery(...anyOf)
    : can(permission)

  return <>{allowed ? children : fallback}</>
}
