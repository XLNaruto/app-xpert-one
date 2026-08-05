/**
 * Saving a repeatable card list against a row-at-a-time API.
 *
 * Steps 4 to 7 read and write one row per call — there is no whole-step endpoint —
 * but the screens present the whole list at once with a single Save. This is the
 * bridge: given the list the form now holds and the ids the user removed from it,
 * it issues the deletes, updates and inserts that make the server match.
 *
 * Two decisions worth knowing:
 *
 * - **Deletes go first.** A row removed and a row added in the same save are
 *   independent calls, and closing out the removals first keeps any uniqueness
 *   check on the server from seeing both at once.
 * - **Every surviving row is PATCHed**, changed or not. Tracking per-field dirtiness
 *   across a field array is a lot of machinery to avoid a handful of idempotent
 *   requests, and getting it subtly wrong means silently dropping an edit — the
 *   worse failure of the two.
 *
 * Calls run in order rather than in parallel so the rows keep the order they were
 * entered in, and so a failure names the row that caused it.
 */

/** A form row: no `id` until the server has one for it. */
export interface SavableRow {
  id?: number
}

export interface RowSaveHandlers<TRow> {
  create: (row: TRow) => Promise<unknown>
  update: (id: number, row: TRow) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
}

/** What a save actually did, for the toast that follows it. */
export interface RowSaveResult {
  created: number
  updated: number
  removed: number
}

/**
 * Reconcile one collection. `removedIds` are the server ids of rows the user took
 * out of the list — a row that was never saved has no id and simply disappears.
 *
 * Rethrows the first failure, so the caller can leave the form as it stands and
 * show the server's message; the calls that already succeeded stay done, and a
 * second Save picks up from there.
 */
export async function saveRows<TRow extends SavableRow>(
  rows: TRow[],
  removedIds: number[],
  handlers: RowSaveHandlers<TRow>,
): Promise<RowSaveResult> {
  const result: RowSaveResult = { created: 0, updated: 0, removed: 0 }

  for (const id of removedIds) {
    await handlers.remove(id)
    result.removed += 1
  }

  for (const row of rows) {
    if (row.id === undefined) {
      await handlers.create(row)
      result.created += 1
    } else {
      await handlers.update(row.id, row)
      result.updated += 1
    }
  }

  return result
}

/**
 * Is this row still blank? A card list always keeps one row on screen so there's
 * something to type into, which means an untouched step submits one empty row —
 * and that must not become a record.
 *
 * `requiredKeys` are the fields that make a row real; a row with none of them
 * filled is skipped by the save entirely.
 */
export function isBlankRow<TRow extends Record<string, unknown>>(
  row: TRow,
  requiredKeys: readonly (keyof TRow)[],
): boolean {
  return requiredKeys.every((key) => {
    const value = row[key]
    return value === undefined || value === null || String(value).trim() === ''
  })
}
