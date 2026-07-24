import { Outlet } from '@tanstack/react-router'
import { asset } from '@/lib/asset'
import {
  CalendarCheck,
  Cloud,
  CreditCard,
  HardHat,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  Zap,
} from 'lucide-react'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/** Modules surfaced in the "Built for every team" grid. */
const MODULES = [
  {
    Icon: Users,
    label: 'HR',
    icon: 'text-sky-600 dark:text-sky-400',
    tile: 'bg-sky-500/15',
    glow: 'bg-sky-400/30',
    bar: 'bg-sky-500',
  },
  {
    Icon: CreditCard,
    label: 'Finance',
    icon: 'text-emerald-600 dark:text-emerald-400',
    tile: 'bg-emerald-500/15',
    glow: 'bg-emerald-400/30',
    bar: 'bg-emerald-500',
  },
  {
    Icon: HardHat,
    label: 'Workforce',
    icon: 'text-orange-600 dark:text-orange-400',
    tile: 'bg-orange-500/15',
    glow: 'bg-orange-400/30',
    bar: 'bg-orange-500',
  },
  {
    Icon: CalendarCheck,
    label: 'Attendance',
    icon: 'text-teal-600 dark:text-teal-400',
    tile: 'bg-teal-500/15',
    glow: 'bg-teal-400/30',
    bar: 'bg-teal-500',
  },
]

/** Trust badges under the module grid. */
const HIGHLIGHTS = [
  { Icon: ShieldCheck, title: 'Enterprise Security', body: 'Your data is safe with us.' },
  { Icon: Zap, title: 'High Performance', body: 'Fast, reliable and always available.' },
  { Icon: Cloud, title: 'Cloud Ready', body: 'Access your workspace from anywhere.' },
  { Icon: Users, title: 'Role Based Access', body: 'Right access for the right people.' },
]

/** Text wordmark used in place of a logo asset. */
function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-primary-hover font-heading text-2xl font-black leading-none text-white shadow-lg shadow-primary/25">
        X
      </div>
      <div className="leading-tight">
        <p className="font-heading text-xl font-bold text-foreground">
          Xpert<span className="text-primary">One</span>
        </p>
        <p className="text-xs text-muted-foreground">Enterprise Admin Suite</p>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
          className="grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors hover:bg-accent"
        >
          {theme === 'light' ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
      </TooltipContent>
    </Tooltip>
  )
}

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Full-screen background image — theme-aware */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center dark:hidden"
        style={{ backgroundImage: `url('${asset('media/auth/bg-auth-light.png')}')` }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-cover bg-center dark:block"
        style={{ backgroundImage: `url('${asset('media/auth/bg-auth-dark.png')}')` }}
      />
      {/* Scrim so content stays readable over the image */}
      <div className="pointer-events-none absolute inset-0 bg-background/55 dark:bg-background/65" />

      {/* Soft accent glow */}
      <div className="animate-auth-float-sl pointer-events-none absolute -left-24 top-1/3 hidden h-72 w-72 rounded-full bg-primary/15 blur-[120px] lg:block" />
      <div className="pointer-events-none absolute -right-24 -top-24 hidden h-80 w-80 rounded-full bg-primary/10 blur-[120px] lg:block" />

      {/* ============================================================= */}
      {/* Top bar — brand + theme / language controls                    */}
      {/* ============================================================= */}
      <header className="relative z-10 flex items-center justify-end px-6 py-6 sm:px-10 lg:justify-between lg:px-12">
        <div className="hidden lg:block">
          <BrandMark />
        </div>
        <ThemeToggle />
      </header>

      {/* ============================================================= */}
      {/* Body — marketing panel + sign-in card                          */}
      {/* ============================================================= */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-8 px-6 py-8 sm:px-10 lg:flex-row lg:items-center lg:gap-10 lg:px-12">
        {/* Marketing panel */}
        <div className="hidden lg:block lg:min-w-0 lg:flex-1">
          <h2 className="animate-auth-rise font-heading text-3xl font-bold leading-[1.1] text-foreground xl:text-5xl">
            One Platform.
            <br />
            Every <span className="text-primary">Role.</span>
            <br />
            Unlimited Possibilities.
          </h2>
          <div className="mt-4 h-1 w-14 rounded-full bg-primary xl:mt-5 xl:w-16" />

          <p
            className="animate-auth-rise mt-4 max-w-md text-sm leading-relaxed text-muted-foreground xl:mt-6 xl:text-base"
            style={{ animationDelay: '.1s' }}
          >
            Manage your entire organization from one secure workspace. Connect
            people, departments, approvals, and operations through a single
            enterprise platform.
          </p>

          {/* Module grid */}
          <p className="mt-6 text-sm font-semibold text-foreground xl:mt-8">
            Built for every team
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:gap-3">
            {MODULES.map(({ Icon, label, icon, tile, glow, bar }, i) => (
              <div
                key={label}
                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
                className="animate-auth-rise group relative overflow-hidden rounded-xl border border-white/50 bg-card/60 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur-md transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg xl:p-4 dark:border-white/10 dark:bg-white/5 dark:ring-white/5"
              >
                {/* Colored corner glow */}
                <span
                  className={cn(
                    'pointer-events-none absolute -right-5 -top-5 size-16 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100',
                    glow,
                  )}
                />
                <span
                  className={cn(
                    'relative grid size-9 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110 xl:size-10',
                    tile,
                    icon,
                  )}
                >
                  <Icon className="size-4.5 xl:size-5" />
                </span>
                <p className="relative mt-2 text-sm font-semibold text-foreground xl:mt-3">
                  {label}
                </p>
                {/* Animated accent bar */}
                <span
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100',
                    bar,
                  )}
                />
              </div>
            ))}
          </div>

          {/* Highlights */}
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-4 xl:mt-8 xl:pt-6">
            {HIGHLIGHTS.map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign-in card */}
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/60 bg-sky-50/70 p-6 shadow-[0_24px_60px_-15px_rgba(2,132,199,0.30)] ring-1 ring-black/5 backdrop-blur-2xl sm:p-7 lg:max-w-sm xl:max-w-md xl:p-9 dark:border-white/10 dark:bg-card/50 dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)] dark:ring-white/5">
            {/* Wordmark inside card on small screens */}
            <div className="mb-6 flex justify-center lg:hidden">
              <BrandMark />
            </div>
            <Outlet />
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Footer                                                         */}
      {/* ============================================================= */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-2 px-6 pb-6 text-sm text-muted-foreground sm:flex-row sm:px-10 lg:px-12">
        <p>
          © {new Date().getFullYear()}{' '}
          <span className="font-semibold text-foreground">XpertOne</span>. All
          rights reserved.
        </p>
        <a
          href="https://www.xpertlab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-medium transition-opacity hover:opacity-80"
        >
          <span className="text-foreground">Designed &amp; Developed By</span>
          <img
            alt="XpertLab"
            className="h-6 w-auto object-contain"
            src={asset('media/logos/xpertlab-logo.webp')}
          />
        </a>
      </footer>
    </div>
  )
}
