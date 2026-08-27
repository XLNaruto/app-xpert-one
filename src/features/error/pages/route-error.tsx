import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getApiErrorMessage, isForbiddenError, isRestrictedIpError } from '@/lib/api-error'
import { isStaleChunkError } from '../lib/stale-chunk'
import { Forbidden } from './forbidden'
import { RestrictedIp } from './restricted-ip'
import { StaleApp } from './stale-app'

/**
 * The router's default error boundary. A forbidden (403) failure — the user
 * lacks permission for this page, thrown either by `requirePermission()` in a
 * route's `beforeLoad` or by a loader's own API call — renders the dedicated
 * {@link Forbidden} screen with the server's message; a route whose code failed
 * to download renders {@link StaleApp}, which reloads the document; anything else
 * falls back to a generic "something went wrong" screen with a retry. Wired via
 * `defaultErrorComponent` so every route is covered.
 */
export function RouteError({ error, reset }: { error: unknown; reset?: () => void }) {
  // A network-level block is normally already on screen via the root overlay;
  // answering it here too keeps a loader failure from falling through to the
  // generic "unexpected error" screen, whose retry can't help.
  if (isRestrictedIpError(error)) {
    return <RestrictedIp description={getApiErrorMessage(error)} />
  }
  if (isForbiddenError(error)) {
    return <Forbidden description={getApiErrorMessage(error)} />
  }
  // The screen's own JS never arrived, so there is nothing here to retry —
  // `reset()` would re-import the same missing file. Only a document reload can
  // fix it, which StaleApp does itself.
  if (isStaleChunkError(error)) {
    return <StaleApp />
  }
  return <GenericError message={getApiErrorMessage(error)} reset={reset} />
}

function GenericError({ message, reset }: { message: string; reset?: () => void }) {
  const router = useRouter()

  return (
    <div className="relative flex min-h-[calc(100vh-7rem)] items-center justify-center overflow-hidden rounded-2xl">
      <div className="relative z-10 mx-auto max-w-xl px-6 text-center">
        <div className="cs-rise mx-auto mb-8 grid size-24 place-items-center [animation-delay:.05s]">
          <div className="relative grid size-full place-items-center">
            <span className="absolute inset-0 rounded-3xl bg-amber-500/10" />
            <span className="cs-float grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
              <TriangleAlert className="size-9" />
            </span>
          </div>
        </div>

        <div className="cs-rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur [animation-delay:.15s]">
          Something went wrong
        </div>

        <h1 className="cs-rise font-heading text-4xl font-bold tracking-tight sm:text-5xl [animation-delay:.25s]">
          <span className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            Unexpected error
          </span>
        </h1>

        <p className="cs-rise mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base [animation-delay:.35s]">
          {message}
        </p>

        <div className="cs-rise mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:.45s]">
          <button
            type="button"
            onClick={() => (reset ? reset() : router.invalidate())}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            <RotateCcw className="size-4" />
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
