import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, ExternalLink, PanelLeft, PanelLeftClose, X } from 'lucide-react'
import {
  filterNavByCompany,
  filterNavByPermission,
  navGroups,
  type NavItem,
} from '@/config/navigation'
import { useCan } from '@/features/permissions'
import { useMyCompanies } from '@/features/company'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { SidebarBrand } from '@/components/common/sidebar-brand'

function isActivePath(to: string | undefined, pathname: string) {
  if (!to) return false
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * Wraps a rail control in the shared <Tooltip>. When `enabled` is false the
 * child renders untouched — expanded nav rows already show their own label.
 */
function SidebarTooltip({
  label,
  enabled = true,
  children,
}: {
  label: string
  enabled?: boolean
  children: ReactElement
}) {
  if (!enabled) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Tracks a CSS media query in React state. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function Sidebar() {
  const isDesktop = useMediaQuery('(min-width: 1024px)') // Tailwind lg
  const collapsedRaw = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const mobileOpen = useUiStore((s) => s.sidebarMobileOpen)
  const setMobileSidebar = useUiStore((s) => s.setMobileSidebar)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { can, isLoading: roleLoading } = useCan()

  // Shares the `/user/my/companies` cache with the topbar switcher and the gate.
  const { selectedCompanyId } = useMyCompanies()

  // Only the menu rows this user's role reaches — `GET /user/my-role`. With no
  // company selected the survivors are narrowed again to the company-independent
  // rows, leaving at most the Company master and Billing & Subscription.
  //
  // BOTH gates must pass, and permission runs FIRST on purpose: `companyIndependent`
  // only exempts a row from the company check, never from the role check, so a
  // Company or Billing row the role can't reach can't come back through the
  // company pass. A user with neither permission and no company selected sees an
  // empty sidebar — correct, since every screen would 403 or show the picker.
  const visibleGroups = useMemo(() => {
    const permitted = filterNavByPermission(navGroups, can)
    return selectedCompanyId == null ? filterNavByCompany(permitted) : permitted
  }, [can, selectedCompanyId])

  // Rail-collapse only applies on desktop; the mobile drawer is always full width.
  const collapsed = isDesktop && collapsedRaw
  const closeMobile = () => setMobileSidebar(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileSidebar(false)
  }, [pathname, setMobileSidebar])

  return (
    <>
      {/* Backdrop (mobile/tablet only) */}
      <div
        aria-hidden={!mobileOpen}
        onClick={closeMobile}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          // `sidebar-shell` is the hover target that reveals the nav's
          // scrollbar thumb — see `.sidebar-shell:hover` in globals.css.
          'sidebar-shell z-50 flex h-screen flex-col overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground lg:border-r',
          'transition-[translate,width] duration-300 ease-in-out will-change-[translate,width]',
          // Mobile/tablet: fixed drawer sliding from the left.
          'fixed inset-y-0 left-0 w-72 shadow-xl',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in-flow rail with collapse.
          'lg:relative lg:translate-x-0 lg:shadow-none',
          collapsed ? 'lg:w-16' : 'lg:w-72',
        )}
      >
        {/* Brand + controls */}
        <div
          className={cn(
            'relative flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4',
            collapsed ? 'justify-center' : 'justify-end',
          )}
        >
          {/* Centred on the panel (absolute, so the toggle can't shift it off
              centre). Too wide for the rail, so hidden while collapsed. */}
          {!collapsed && (
            <Link
              to="/dashboard"
              onClick={closeMobile}
              aria-label="XpertOne home"
              className="absolute left-1/2 -translate-x-1/2"
            >
              {/* The active company's logo when it has one, else the wordmark. */}
              <SidebarBrand className="h-11 w-36" />
            </Link>
          )}
          {/* Desktop collapse toggle */}
          <SidebarTooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <button
              onClick={toggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:grid"
            >
              {collapsed ? (
                <PanelLeft className="size-[18px]" />
              ) : (
                <PanelLeftClose className="size-[18px]" />
              )}
            </button>
          </SidebarTooltip>
          {/* Mobile close button */}
          <SidebarTooltip label="Close menu">
            <button
              onClick={closeMobile}
              aria-label="Close menu"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            >
              <X className="size-[18px]" />
            </button>
          </SidebarTooltip>
        </div>

        {/* Navigation: section labels → main menu → submenu */}
        {/* `overflow-x-hidden` hides the rows that are still wider than the rail
            mid-transition instead of showing a horizontal scrollbar. */}
        <nav className="sidebar-scroll flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-2">
          {/* Until the role answers we can't tell which rows this user has, and
              guessing either way flashes the wrong menu — placeholders instead. */}
          {roleLoading && <NavSkeleton collapsed={collapsed} />}
          {!roleLoading &&
            visibleGroups.map((group) => (
              <div
                key={group.title}
                className={cn(
                  'space-y-0.5',
                  // Expanded rows are laid out at their final width (18rem panel
                  // minus the nav's px-2 and the 12px scrollbar gutter) from the first
                  // frame, so labels are revealed by the widening panel instead
                  // of re-wrapping from three lines down to one as it animates.
                  // The scrollbar is part of that width, so a menu long enough
                  // to scroll doesn't narrow the rows it sits next to.
                  !collapsed && 'w-65',
                )}
              >
                <p
                  className={cn(
                    'px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40',
                    collapsed && 'hidden',
                  )}
                >
                  {group.title}
                </p>
                {group.items.map((item) =>
                  item.children?.length ? (
                    <NavParent
                      key={item.label}
                      item={item}
                      collapsed={collapsed}
                      pathname={pathname}
                      onNavigate={closeMobile}
                    />
                  ) : (
                    <NavLeaf
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      onNavigate={closeMobile}
                    />
                  ),
                )}
              </div>
            ))}
        </nav>
      </aside>
    </>
  )
}

/** Placeholder rows shown while `GET /user/my-role` decides what this user sees. */
function NavSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('space-y-0.5', !collapsed && 'w-65')} aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="size-4.5 shrink-0 animate-pulse rounded bg-sidebar-foreground/10" />
          {!collapsed && (
            <span className="h-3.5 flex-1 animate-pulse rounded bg-sidebar-foreground/10" />
          )}
        </div>
      ))}
    </div>
  )
}

const leafClasses = (collapsed: boolean) =>
  cn(
    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    collapsed && 'justify-center px-0',
    'text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
    // Selected: soft sky tint + accent-colored bold text (icon picks up sidebar-primary).
    '[&.active]:bg-sidebar-accent [&.active]:font-semibold [&.active]:text-sidebar-accent-foreground [&.active]:hover:bg-sidebar-accent',
  )

function NavLeaf({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  if (!item.to) return null

  // A `newTab` row is a plain anchor, not a <Link>: the router must not treat
  // it as a navigation, and it must never take the active highlight — whatever
  // opens in the other tab, nothing in this one changed.
  if (item.newTab) {
    return (
      <SidebarTooltip label={item.label} enabled={collapsed}>
        <a
          href={item.to}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={leafClasses(collapsed)}
        >
          <Icon className="size-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && (
            <ExternalLink className="ml-auto size-3.5 shrink-0 opacity-50" />
          )}
        </a>
      </SidebarTooltip>
    )
  }

  return (
    <SidebarTooltip label={item.label} enabled={collapsed}>
      <Link
        to={item.to}
        activeOptions={{ exact: item.exact ?? item.to === '/' }}
        onClick={onNavigate}
        className={leafClasses(collapsed)}
      >
        <Icon className="size-[18px] shrink-0 transition-colors group-[.active]:text-sidebar-primary" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </SidebarTooltip>
  )
}

function NavParent({
  item,
  collapsed,
  pathname,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
  onNavigate?: () => void
}) {
  const children = item.children ?? []
  const childActive = children.some((c) => isActivePath(c.to, pathname))
  const [open, setOpen] = useState(childActive)
  const Icon = item.icon

  // Auto-open when a child becomes the active route.
  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  // Collapsed rail: show the parent's own icon (no submenu), linking to its
  // first child and highlighted when any child route is active.
  if (collapsed) {
    const target = children.find((c) => c.to)?.to
    if (!target) return null
    return (
      <SidebarTooltip label={item.label}>
        <Link
          to={target}
          onClick={onNavigate}
          className={cn(leafClasses(true), childActive && 'active')}
        >
          <Icon className="size-[18px] shrink-0 transition-colors group-[.active]:text-sidebar-primary" />
        </Link>
      </SidebarTooltip>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
          childActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/75',
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul className="mt-0.5 ml-4 space-y-0.5 pl-3">
          {children.map((c) =>
            c.to ? (
              <li key={c.to}>
                <Link
                  to={c.to}
                  activeOptions={{ exact: c.exact ?? false }}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
                    '[&.active]:bg-sidebar-accent [&.active]:font-semibold [&.active]:text-sidebar-accent-foreground [&.active]:hover:bg-sidebar-accent',
                  )}
                >
                  <span className="mt-0.75 grid size-4.5 shrink-0 place-items-center self-start">
                    <span className="size-1.5 rounded-full bg-current opacity-60 transition-opacity group-[.active]:bg-sidebar-primary group-[.active]:opacity-100" />
                  </span>
                  {/* Long labels wrap onto a second line instead of being clipped. */}
                  <span className="min-w-0 leading-snug text-pretty">{c.label}</span>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  )
}
