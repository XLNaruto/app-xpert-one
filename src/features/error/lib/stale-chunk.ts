/**
 * A route's code failed to load — not a bug in the route, a missing file.
 *
 * Routes are code-split, so a screen's JS is fetched at the moment it's opened.
 * The tab's module graph can point at a file that no longer exists: after a
 * deploy the hashed chunk it remembers is gone, and in dev Vite invalidates a
 * module the tab still holds the old query token for. Every browser words the
 * failure differently, so all of them are matched.
 */
const STALE_CHUNK_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /failed to load module script/i,
  /'?text\/html'? is not a valid javascript mime type/i,
  /chunkloaderror/i,
]

export function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : ''
  return message ? STALE_CHUNK_PATTERNS.some((p) => p.test(message)) : false
}

/** Set once we've reloaded the document ourselves, so we only ever do it once. */
let reloadRequested = false

/**
 * Claim the one automatic reload this page life is allowed.
 *
 * A stale chunk is the rare error a retry genuinely fixes — but only a *document*
 * reload fixes it, since `router.invalidate()` re-imports the same dead URL. So
 * the boundary reloads instead of asking, and the two guards here make a reload
 * loop impossible: once per page life, and never on a document that is itself the
 * result of a reload (if a fresh load still can't fetch the chunk, the file really
 * is gone and the user gets the screen and the button instead of a spin cycle).
 */
export function claimStaleChunkReload(): boolean {
  if (reloadRequested) return false
  const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (nav?.type === 'reload') return false
  reloadRequested = true
  return true
}
