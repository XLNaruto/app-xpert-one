import { AMBIENT_ACTIONS } from '../constants'
import type { Permission, PermissionSpec } from '../types'

/**
 * Pure matching rules for permission codes — no React, no hooks, so both the
 * `useCan()` hook and the route guard share one implementation.
 *
 * A spec is matched two ways:
 *  - `employees:create` — an EXACT code. Use it to gate a single action.
 *  - `employees` — a bare RESOURCE, which matches any MEANINGFUL action the user
 *    holds on it (`employees:read`, `employees:update`, …). This is what menu
 *    items and route guards use: "may this user reach the Employee screens at
 *    all" is a question about the resource, not about one button.
 *
 * An array spec is an ANY-of — holding one entry is enough.
 *
 * ## Why a bare resource ignores `:list`
 *
 * The API grants every `<resource>:list` code to EVERY user unconditionally
 * (`USER_DEFAULT_PERMISSION` in `actor.builder.ts` — the 36 `:list` codes plus a
 * few non-tree ones). `:list` is not a screen right: it exists so that any user
 * can read a collection as REFERENCE DATA — the designation dropdown on the
 * employee form, the branch picker on a report — without being granted the
 * screen that owns it. It appears against no checkbox in the role builder, so a
 * role can neither be given nor refused it.
 *
 * That makes `:list` worthless as evidence of access: counting it would let a
 * bare-resource gate pass for every signed-in user, which would silently open
 * every sidebar row and every route in the app. So the prefix scan below skips
 * it, and `:read` is what actually says "this user may open this screen".
 *
 * A gate that genuinely means "may fetch this collection" must still ask for the
 * exact `<resource>:list` code — that path is unchanged, and always true.
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
    // Exact code — `<resource>:<action>`. Asked for by name, answered by name,
    // ambient actions included.
    if (entry.includes(':')) return granted.has(entry)
    // Bare resource — any held action on it counts, except the ambient ones
    // every user carries regardless of role (see the note above).
    const prefix = `${entry}:`
    for (const code of granted) {
      if (!code.startsWith(prefix)) continue
      const action = code.slice(prefix.length)
      if (!(AMBIENT_ACTIONS as readonly string[]).includes(action)) return true
    }
    return false
  })
}
