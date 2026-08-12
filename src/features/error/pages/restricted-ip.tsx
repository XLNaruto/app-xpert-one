import { LogOut, RefreshCw, ShieldBan } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

interface RestrictedIpProps {
  /** Big gradient headline. */
  title?: string
  /**
   * Supporting line under the title. Pass the API's own message —
   * `{ code: 'RESTRICTED_IP', message: 'Requests from this IP address are
   * blocked' }` — so the user reads the server's own words.
   */
  description?: string
}

/**
 * Theme-aware full-screen overlay shown when the API refuses this browser's
 * network (`{ code: 'RESTRICTED_IP' }`, a 403). Rendered globally from the root
 * off `useIpBlockStore` and dismissed automatically as soon as any request
 * succeeds again.
 *
 * It is *not* the {@link Forbidden} screen: nothing about the signed-in user's
 * role is wrong, so "request access from your administrator" would send them down
 * the wrong path. What has to change is the company's IP access list — or the
 * network they're on — which is what the copy here points at.
 */
export function RestrictedIp({
  title = 'Network blocked',
  description = 'Requests from this IP address are blocked.',
}: RestrictedIpProps) {
  const logout = useAuthStore((s) => s.logout)

  const signOut = () => {
    logout()
    window.location.assign('/login')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background">
      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        {/* Shield badge with pulsing halo */}
        <div className="cs-rise mx-auto mb-8 grid size-24 place-items-center [animation-delay:.05s]">
          <div className="relative grid size-full place-items-center">
            <span className="absolute inset-0 animate-ping rounded-3xl bg-destructive/20 [animation-duration:2.4s]" />
            <span className="absolute inset-0 rounded-3xl bg-destructive/10" />
            <span className="cs-float grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-destructive to-rose-600 text-white shadow-lg shadow-destructive/30">
              <ShieldBan className="size-9" />
            </span>
          </div>
        </div>

        {/* Status pill */}
        <div className="cs-rise mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur [animation-delay:.15s]">
          IP access restricted
        </div>

        {/* Heading with animated gradient sweep */}
        <h1 className="cs-rise font-heading text-5xl font-bold tracking-tight sm:text-6xl [animation-delay:.25s]">
          <span className="cs-pan bg-gradient-to-r from-destructive via-rose-400 to-destructive bg-clip-text text-transparent">
            {title}
          </span>
        </h1>

        <p className="cs-rise mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base [animation-delay:.35s]">
          {description}
        </p>

        {/* What the user can actually do about it — the block is about the
            network, not the account, so both routes out are named. */}
        <div className="cs-rise mx-auto mt-6 w-full max-w-xl rounded-xl border border-border bg-card/60 px-5 py-4 text-left text-sm leading-relaxed text-muted-foreground backdrop-blur [animation-delay:.4s]">
          <p className="mb-2 font-medium text-foreground">How to get back in</p>
          <ul className="list-outside list-disc space-y-1 pl-5">
            <li>Reconnect from an approved network, such as your office Wi-Fi.</li>
            <li>
              Or ask an administrator to allow this address under{' '}
              <span className="font-medium text-foreground">
                Administration → IP Access Control
              </span>
              .
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="cs-rise mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:.45s]">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
          {/* The overlay covers the whole app, so without this there'd be no way
              to leave the session from a blocked network. */}
          <button
            type="button"
            onClick={signOut}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
