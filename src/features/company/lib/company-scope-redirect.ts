/** The shape of a router match this helper needs — kept structural so it's testable. */
interface RouteMatchLike {
  routeId: string
  fullPath: string
}

/**
 * The list route to fall back to when the active company changes, or `null` when
 * the current screen can stay put.
 *
 * Every record screen is tenant-scoped and reaches its record through an
 * encrypted `?data=` token, so a detail / create / edit page left open across a
 * company switch would be pointing at a record the new company doesn't own. The
 * module's list page is always safe — it just refetches.
 *
 * The route tree tells us which is which without a hard-coded list: a module
 * folder's `index.tsx` (the list) has a route id ending in `/`, and every
 * sub-page (`create`, `detail`, `history`, …) sits under the module's
 * `route.tsx`, whose `fullPath` *is* the list path.
 */
export function listPathForScopedRoute(matches: RouteMatchLike[]): string | null {
  const current = matches[matches.length - 1]
  const parent = matches[matches.length - 2]
  if (!current || !parent) return null

  // An index route — already the list screen.
  if (current.routeId.endsWith('/')) return null

  // Top-level screens (`/dashboard`, `/profile`) hang straight off the
  // `_authenticated` layout, whose fullPath is `/`. Nothing to fall back to.
  const listPath = parent.fullPath
  if (!listPath || listPath === '/' || listPath === current.fullPath) return null

  return listPath
}
