import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { claimStaleChunkReload } from '../lib/stale-chunk'

/**
 * Shown when a screen's code couldn't be fetched — the tab is holding a module
 * graph that no longer matches what the server has (a deploy replaced the hashed
 * chunks, or in dev Vite invalidated the module while this tab kept the old
 * token).
 *
 * Nothing about the user's data or permissions is wrong, so this is not the
 * generic "unexpected error": the app itself is out of date, and the cure is a
 * document reload — which this screen takes care of on its own the first time,
 * appearing only long enough to say why the page is refreshing. If a reloaded
 * document still can't fetch the file, the reload is left to the user rather than
 * repeated.
 */
export function StaleApp() {
  const [reloading] = useState(claimStaleChunkReload)

  useEffect(() => {
    if (reloading) window.location.reload()
  }, [reloading])

  return (
    <div className="relative flex min-h-[calc(100vh-7rem)] items-center justify-center overflow-hidden rounded-2xl">
      <div className="relative z-10 mx-auto max-w-xl px-6 text-center">
        <div className="cs-rise mx-auto mb-8 grid size-24 place-items-center [animation-delay:.05s]">
          <div className="relative grid size-full place-items-center">
            <span className="absolute inset-0 rounded-3xl bg-primary/10" />
            <span className="cs-float grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-sky-600 text-white shadow-lg shadow-primary/30">
              {reloading ? (
                <Loader2 className="size-9 animate-spin" />
              ) : (
                <RefreshCw className="size-9" />
              )}
            </span>
          </div>
        </div>

        <div className="cs-rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur [animation-delay:.15s]">
          App updated
        </div>

        <h1 className="cs-rise font-heading text-4xl font-bold tracking-tight sm:text-5xl [animation-delay:.25s]">
          <span className="bg-gradient-to-r from-primary via-sky-400 to-primary bg-clip-text text-transparent">
            {reloading ? 'Refreshing…' : 'Reload needed'}
          </span>
        </h1>

        <p className="cs-rise mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base [animation-delay:.35s]">
          {reloading
            ? 'This page is running an older version of the app. Reloading it now — nothing you entered on other screens is affected.'
            : 'This page is running an older version of the app and its files are no longer available. Reload to pick up the latest version.'}
        </p>

        {!reloading && (
          <div className="cs-rise mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:.45s]">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              <RotateCcw className="size-4" />
              Reload the app
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
