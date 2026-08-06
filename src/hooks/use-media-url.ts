import { useCallback } from 'react'
import { useConfigStore } from '@/stores/config-store'
import { joinMediaUrl } from '@/lib/media'

/**
 * Resolve a storage path returned by the API into a full media URL, subscribed
 * to the config store.
 *
 * The reactive counterpart to `mediaUrl()`. The base URL is fetched once at app
 * start (`useAppConfig`), so on a first-ever load — before the config store has
 * been persisted to IndexedDB — it can land *after* an image-bearing screen has
 * already rendered. `mediaUrl()` reads the store with `getState()` and so leaves
 * that render showing the bare path; this re-renders as soon as the base arrives.
 *
 * Use this anywhere a component builds an `src`/`href`; keep `mediaUrl()` for
 * mappers and other non-React code.
 */
export function useMediaUrl(path?: string | null): string {
  const base = useConfigStore((s) => s.mediaBaseUrl)
  return joinMediaUrl(base, path)
}

/**
 * The same resolution as `useMediaUrl()` as a reusable function, for the cases a
 * per-value hook can't cover: a component resolving a *list* of paths inside a
 * `.map()`, or one that needs a URL inside an event handler. Called once at the
 * top of the component; the identity changes only when the base URL does.
 */
export function useMediaResolver(): (path?: string | null) => string {
  const base = useConfigStore((s) => s.mediaBaseUrl)
  return useCallback((path?: string | null) => joinMediaUrl(base, path), [base])
}
