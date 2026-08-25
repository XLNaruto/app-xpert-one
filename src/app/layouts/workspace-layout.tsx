import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { pageIconForPath, pageNameForPath } from '@/config/navigation'
import { BrandLogo } from '@/components/common/brand-logo'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppConfig } from '@/features/config'
import { usePermissions } from '@/features/permissions'
import { useIpAccessModeGlobal } from '@/features/administration/ip-address'
import { useUiStore } from '@/stores/ui-store'
import { asset } from '@/lib/asset'
import { cn } from '@/lib/utils'

/**
 * The shell for a FULL-SCREEN workspace — a screen that owns the whole viewport
 * instead of sitting inside the panel's sidebar-and-topbar chrome.
 *
 * Chat Monitoring is the first: three panes that each scroll independently, read
 * for long stretches, and are meant to be left open in their own tab beside the
 * panel. Giving that the shell's 6rem of chrome and a footer would cost the
 * thread most of its height for navigation nobody uses while reading.
 *
 * It still runs the three GLOBAL loads the dashboard layout owns, because a
 * screen opened directly in a fresh tab starts with none of them warm:
 * `useAppConfig` for the media base URL every avatar resolves through,
 * `usePermissions` for the gates, and the IP access mode so a barred network is
 * met here the same way it is inside the panel.
 *
 * It shows NO company chrome — no mark, no switcher — and mounts no
 * `CompanySelectGate`, all for one reason: a workspace here is ACCOUNT-scoped.
 * It spans every company and no request it makes carries a `company_id`, so
 * naming a tenant would answer a question the screen never asks, offering to
 * switch one would imply it filters what's below, and blocking on a selection
 * would be waiting on an answer nothing uses.
 */
export function WorkspaceLayout() {
  useAppConfig()
  usePermissions()
  useIpAccessModeGlobal()

  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  /*
    The screen's own title, resolved from the sidebar config rather than passed
    down or hardcoded — the same source `__root` titles the browser tab from, so
    the bar and the tab can't disagree. A workspace gives its whole viewport to
    the screen, so a separate page-header row underneath would cost it a band of
    height to repeat what this bar can say on the line it already occupies.
  */
  const pathname = useRouterState({
    select: (state) => state.resolvedLocation?.pathname ?? state.location.pathname,
  })
  const pageName = pageNameForPath(pathname)
  // The sidebar row's own icon, so the workspace is marked with the same glyph
  // the menu it was opened from uses.
  const PageIcon = pageIconForPath(pathname)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b bg-card px-3 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            {/*
              Back to the panel, not `history.back()`: the tab was usually opened
              fresh from the sidebar, so there is nothing behind it to go back to.
            */}
            <Link
              to="/dashboard"
              className="inline-flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-muted"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Back to dashboard</TooltipContent>
        </Tooltip>

        {/*
          The screen's name, and nothing else. No company mark and no switcher:
          a workspace here is ACCOUNT-scoped — it spans every company and no
          request it makes takes a `company_id` — so a tenant shown beside the
          title would be answering a question the screen never asks, and a
          switcher would imply it filters what's below. Switching tenant belongs
          to the panel this tab was opened from.
        */}
        {pageName && (
          <span className="flex min-w-0 items-center gap-2">
            {PageIcon && (
              <PageIcon aria-hidden className="size-4 shrink-0 text-primary" />
            )}
            <h1 className="min-w-0 truncate font-heading text-base font-semibold tracking-tight">
              {pageName}
            </h1>
          </span>
        )}

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-muted',
              )}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>
      </header>

      {/* The workspace owns everything between the bars and scrolls internally. */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/*
        One slim line, unlike the panel's stacked footer: every pixel here comes
        out of the conversation being read, so it says the same things on a
        single row and hides the attribution on narrow screens.
      */}
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          <span className="text-base leading-none">©</span>
          <span>{new Date().getFullYear()}</span>
          <BrandLogo className="h-4 w-14" />
          <span className="hidden sm:inline">. All Rights Reserved.</span>
        </p>
        <a
          href="https://www.xpertlab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-2 font-semibold transition-opacity hover:opacity-80 sm:flex"
        >
          <span className="text-foreground">Designed &amp; Developed By</span>
          <img
            alt="XpertLab"
            className="h-4 w-auto object-contain"
            src={asset('media/logos/xpertlab-logo.webp')}
          />
        </a>
      </footer>
    </div>
  )
}
