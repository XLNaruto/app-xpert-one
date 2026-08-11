import type { Permission, PermissionSpec } from '../types'

/**
 * Pure matching rules for permission codes — no React, no hooks, so both the
 * `useCan()` hook and the route guard share one implementation.
 *
 * A spec is matched two ways:
 *  - `employees:create` — an EXACT code. Use it to gate a single action.
 *  - `employees` — a bare RESOURCE, which matches any action the user holds on
 *    it (`employees:read`, `employees:update`, …). This is what menu items and
 *    route guards use: "may this user reach the Employee screens at all" is a
 *    question about the resource, and it doesn't break when the API names the
 *    read action `read` on one screen and `list` on another.
 *
 * An array spec is an ANY-of — holding one entry is enough.
 */
export function holdsPermission(
  granted: ReadonlySet<Permission>,
  spec?: PermissionSpec | null,
): boolean {
  if (!spec) return true
  const specs = typeof spec === 'string' ? [spec] : spec
  if (!specs.length) return true

  return specs.some((entry) => {
    if (!entry) return false
    // Exact code — `<resource>:<action>`.
    if (entry.includes(':')) return granted.has(entry)
    // Bare resource — any held action on it counts.
    const prefix = `${entry}:`
    for (const code of granted) if (code.startsWith(prefix)) return true
    return false
  })
}
