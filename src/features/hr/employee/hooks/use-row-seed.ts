import { useEffect, useRef } from 'react'

/**
 * Seed a card list from its server read, but never mid-save.
 *
 * Each row's save invalidates the employee's queries, so a step saving four rows
 * triggers four refetches while the loop is still running. Left alone, each one
 * would reset the form out from under the save — replacing the list the user is
 * looking at with a half-written server state.
 *
 * So seeding is skipped while `isSaving`, and because `isSaving` is a dependency
 * the effect fires again the moment it clears — with whatever data has arrived by
 * then. No queue, no missed update: the last read always wins, it just waits for
 * the save to finish.
 */
export function useRowSeed<TData>(
  data: TData | undefined,
  isSaving: boolean,
  seed: (data: TData) => void,
) {
  // The callback closes over the form, so it's a new function every render —
  // holding it in a ref keeps that from re-triggering the effect.
  const seedRef = useRef(seed)
  seedRef.current = seed

  useEffect(() => {
    if (data === undefined || isSaving) return
    seedRef.current(data)
  }, [data, isSaving])
}
