import type {
  Permission,
  PermissionAction,
  PermissionModule,
} from '@/features/permissions'

/**
 * The role builder's selection engine — pure, no React.
 *
 * **Why this exists.** Every checkbox in the catalog carries `requires`: the
 * other codes it does not work without. `Edit` needs the same row's `View` (and
 * its `List` where the row has one); a screen needs the `read` of every section
 * above it, or the menu never draws it. The API does NOT repair a selection — a
 * save missing any required code is rejected with a 400 naming the offenders. So
 * the closure has to be maintained here, as the user ticks, not discovered after
 * a failed save.
 *
 * That cuts both ways:
 *
 * - ticking a code pulls in the transitive closure of its `requires`;
 * - unticking a code drops every selected code that (transitively) requires it,
 *   because leaving those behind is exactly the 400.
 *
 * A code held only because something else pulled it in is **locked** — the user
 * clears whatever pulled it in and it unlocks. That is the rule the screen's
 * legend describes, and {@link lockedCodes} is what computes it.
 */

/** A node flattened out of the tree, with the trail that leads to it. */
export interface FlatNode {
  node: PermissionModule
  /** Depth from the top-level module — 0 for the module itself. */
  depth: number
  /** The top-level module this node sits under. */
  rootKey: string
}

/**
 * Everything the selection operations need, derived once from the catalog. Built
 * with {@link buildPermissionIndex} and passed to every function below.
 */
export interface PermissionIndex {
  /** Every checkbox, by its code. */
  actionsByCode: Map<Permission, PermissionAction>
  /** What each code needs — the node's own `requires`, as given. */
  requiresByCode: Map<Permission, Permission[]>
  /** The reverse edge: which codes name this one in their `requires`. */
  dependentsByCode: Map<Permission, Permission[]>
  /** Every node of the tree, by key. */
  nodeByKey: Map<string, FlatNode>
  /** Every code in the catalog, in catalog order. */
  allCodes: Permission[]
  /** The label of the node each code belongs to — for error messages. */
  ownerLabelByCode: Map<Permission, string>
}

/** Walk the tree depth-first, in catalog order. */
export function flattenModules(
  modules: PermissionModule[],
  depth = 0,
  rootKey?: string,
): FlatNode[] {
  return modules.flatMap((node) => {
    const root = rootKey ?? node.key
    return [
      { node, depth, rootKey: root },
      ...flattenModules(node.children, depth + 1, root),
    ]
  })
}

/**
 * Index the catalog once. Everything downstream reads this rather than walking
 * the tree again — a matrix of 300-odd checkboxes re-derives on every click
 * otherwise.
 */
export function buildPermissionIndex(modules: PermissionModule[]): PermissionIndex {
  const actionsByCode = new Map<Permission, PermissionAction>()
  const requiresByCode = new Map<Permission, Permission[]>()
  const dependentsByCode = new Map<Permission, Permission[]>()
  const nodeByKey = new Map<string, FlatNode>()
  const ownerLabelByCode = new Map<Permission, string>()
  const allCodes: Permission[] = []

  for (const flat of flattenModules(modules)) {
    nodeByKey.set(flat.node.key, flat)

    for (const action of flat.node.actions) {
      // A code can only appear once in the catalog; if a payload ever repeats
      // one, the first spelling wins rather than the last.
      if (actionsByCode.has(action.permission)) continue

      actionsByCode.set(action.permission, action)
      requiresByCode.set(action.permission, action.requires)
      ownerLabelByCode.set(action.permission, flat.node.label)
      allCodes.push(action.permission)
    }
  }

  // Reverse edges, built after every code is known so a `requires` pointing at
  // something outside the catalog (a plan narrowed since) is simply skipped.
  for (const [code, requires] of requiresByCode) {
    for (const required of requires) {
      if (!actionsByCode.has(required)) continue
      const dependents = dependentsByCode.get(required)
      if (dependents) dependents.push(code)
      else dependentsByCode.set(required, [code])
    }
  }

  return {
    actionsByCode,
    requiresByCode,
    dependentsByCode,
    nodeByKey,
    allCodes,
    ownerLabelByCode,
  }
}

/** An empty index, so a screen can render before the catalog arrives. */
export const EMPTY_PERMISSION_INDEX: PermissionIndex = buildPermissionIndex([])

/**
 * Walk an edge map transitively from a set of seeds, collecting everything
 * reachable. Shared by the two closures below — they differ only in direction.
 */
function reach(
  seeds: Iterable<Permission>,
  edges: Map<Permission, Permission[]>,
  known: (code: Permission) => boolean,
): Set<Permission> {
  const found = new Set<Permission>()
  const queue = [...seeds]

  while (queue.length) {
    const code = queue.pop() as Permission
    if (found.has(code) || !known(code)) continue
    found.add(code)
    for (const next of edges.get(code) ?? []) {
      if (!found.has(next)) queue.push(next)
    }
  }

  return found
}

/**
 * Tick `codes` — and everything they need, transitively.
 *
 * `requires` is documented as already transitive where it matters, but following
 * the graph costs nothing and makes the result correct even where it isn't.
 */
export function selectCodes(
  selected: ReadonlySet<Permission>,
  codes: Iterable<Permission>,
  index: PermissionIndex,
): Set<Permission> {
  const next = new Set(selected)
  for (const code of reach(codes, index.requiresByCode, (c) =>
    index.actionsByCode.has(c),
  )) {
    next.add(code)
  }
  return next
}

/**
 * Untick `codes` — and every SELECTED code that depends on them, transitively.
 *
 * Dropping `View` while `Edit` stays ticked is precisely the save the server
 * rejects, so the dependents go with it. That's also why unticking one box can
 * move the counter by more than one.
 */
export function deselectCodes(
  selected: ReadonlySet<Permission>,
  codes: Iterable<Permission>,
  index: PermissionIndex,
): Set<Permission> {
  const seeds = new Set(codes)
  // Only what is actually ticked can be dropped — walking into unselected
  // dependents would drag half the catalog into the traversal for nothing.
  const doomed = reach(seeds, index.dependentsByCode, (code) => selected.has(code))

  const next = new Set(selected)
  for (const code of seeds) next.delete(code)
  for (const code of doomed) next.delete(code)
  return next
}

/** Tick or untick one code, whichever the current state calls for. */
export function toggleCode(
  selected: ReadonlySet<Permission>,
  code: Permission,
  index: PermissionIndex,
): Set<Permission> {
  return selected.has(code)
    ? deselectCodes(selected, [code], index)
    : selectCodes(selected, [code], index)
}

/** How much of a node's subtree is ticked — what its tri-state box shows. */
export type NodeState = 'none' | 'partial' | 'all'

/**
 * `node.permissions` is every code at or below the node, flattened by the API —
 * so this never walks `children` itself.
 */
export function nodeState(
  selected: ReadonlySet<Permission>,
  node: PermissionModule,
): NodeState {
  if (node.permissions.length === 0) return 'none'
  let held = 0
  for (const code of node.permissions) if (selected.has(code)) held += 1
  if (held === 0) return 'none'
  return held === node.permissions.length ? 'all' : 'partial'
}

/** How many of a node's codes are ticked — the `n/total` counter on its row. */
export function countSelectedIn(
  selected: ReadonlySet<Permission>,
  node: PermissionModule,
): number {
  let held = 0
  for (const code of node.permissions) if (selected.has(code)) held += 1
  return held
}

/**
 * Tick or untick a whole node. Ticking pulls in each code's requirements, which
 * may reach outside this node — a screen needs the `read` of the sections above
 * it, and those can live in another module entirely.
 */
export function toggleNode(
  selected: ReadonlySet<Permission>,
  node: PermissionModule,
  index: PermissionIndex,
): Set<Permission> {
  return nodeState(selected, node) === 'all'
    ? deselectCodes(selected, node.permissions, index)
    : selectCodes(selected, node.permissions, index)
}

/**
 * The codes held ONLY because another selected code requires them.
 *
 * These render locked: unticking one directly would immediately drop whatever
 * pulled it in, which reads as the checkbox doing something it didn't say. The
 * user clears the dependent instead, and the lock lifts on its own.
 *
 * **Mutual pairs don't lock.** `List` and `View` require *each other*, so a rule
 * of "locked when anything selected requires it" would lock both the moment they
 * come on — permanently, since neither could then be cleared to unlock the other.
 * A dependency only locks when it is one-way: something else needs this code, and
 * this code does not need it back. The `List`/`View` pair therefore stays
 * clickable and goes off together, which is exactly how it went on.
 *
 * The builder can't tell "ticked deliberately" from "pulled in" without tracking
 * intent, and tracked intent lies after an undo — so the rule is structural
 * rather than historical.
 */
export function lockedCodes(
  selected: ReadonlySet<Permission>,
  index: PermissionIndex,
): Set<Permission> {
  const locked = new Set<Permission>()

  for (const code of selected) {
    for (const required of index.requiresByCode.get(code) ?? []) {
      if (!selected.has(required) || required === code) continue
      // Mutual: `required` needs `code` right back, so neither is the one
      // holding the other in place.
      if ((index.requiresByCode.get(required) ?? []).includes(code)) continue
      locked.add(required)
    }
  }

  return locked
}

/**
 * Required codes missing from the selection — a pre-flight guard before save.
 *
 * The closure above should keep this empty; it runs anyway because an edit form
 * seeds itself from a STORED set, which may predate a catalog change and arrive
 * already inconsistent.
 */
export function missingRequirements(
  selected: ReadonlySet<Permission>,
  index: PermissionIndex,
): Permission[] {
  const missing = new Set<Permission>()

  for (const code of selected) {
    for (const required of index.requiresByCode.get(code) ?? []) {
      if (!selected.has(required) && index.actionsByCode.has(required)) {
        missing.add(required)
      }
    }
  }

  return [...missing]
}

/**
 * Order a selection the way the catalog does, so the body sent and the codes
 * stored read the same way as the screen.
 */
export function orderCodes(
  selected: ReadonlySet<Permission>,
  index: PermissionIndex,
): Permission[] {
  const ordered = index.allCodes.filter((code) => selected.has(code))
  // Anything stored but no longer in the catalog (a narrowed plan) would be
  // dropped by the filter above — which is right: the save would reject it.
  return ordered
}

/**
 * Human-readable names for a set of codes — for the "these came along" line and
 * a checkbox's lock tooltip.
 */
export function describeCodes(
  codes: Iterable<Permission>,
  index: PermissionIndex,
): string[] {
  return [...codes].map((code) => {
    const action = index.actionsByCode.get(code)
    const owner = index.ownerLabelByCode.get(code)
    if (!action) return code
    return owner ? `${owner} → ${action.label}` : action.label
  })
}
