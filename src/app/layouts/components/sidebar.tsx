import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown, ExternalLink, PanelLeft, PanelLeftClose, Search, SearchX, X } from 'lucide-react'
import {
  filterNavByCompany,
  filterNavByPermission,
  filterNavBySearch,
  navGroups,
  navItemOwnsPath,
  type NavItem,
} from '@/config/navigation'
import { useCan } from '@/features/permissions'
import { useMyCompanies } from '@/features/company'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { SidebarBrand } from '@/components/common/sidebar-brand'
import { HighlightMatch, SidebarSearch } from './sidebar-search'


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
  const setSidebar = useUiStore((s) => s.setSidebar)
  const navigate = useNavigate()
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

  // Menu search — opened from the icon beside the brand or Ctrl/Cmd + K.
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchTerm = searchOpen && !collapsed ? search.trim() : ''
  const shownGroups = useMemo(
    () => filterNavBySearch(visibleGroups, searchTerm),
    [visibleGroups, searchTerm],
  )
  const closeSearch = () => {
    setSearchOpen(false)
    setSearch('')
  }

  // Close the mobile drawer and the search whenever the route changes.
  useEffect(() => {
    setMobileSidebar(false)
    setSearchOpen(false)
    setSearch('')
  }, [pathname, setMobileSidebar])

  // Ctrl/Cmd + K opens the search from anywhere, expanding the rail or the
  // mobile drawer first so the box has somewhere to show.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) return
      e.preventDefault()
      if (isDesktop) setSidebar(false)
      else setMobileSidebar(true)
      setSearchOpen(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDesktop, setSidebar, setMobileSidebar])

  // The rows ↑/↓ step through while searching, in on-screen order — every
  // surviving parent is expanded, so these are exactly the visible links.
  const searchTargets = useMemo(
    () =>
      shownGroups
        .flatMap((g) => g.items)
        .flatMap((item) => (item.children?.length ? item.children : [item]))
        .filter((item) => item.to),
    [shownGroups],
  )
  // The cursor is tied to the term it was moved under, so typing puts it back
  // on the first match without an effect.
  const [cursor, setCursor] = useState({ term: '', index: 0 })
  const cursorIndex = cursor.term === searchTerm ? cursor.index : 0
  const selected = searchTerm ? searchTargets[cursorIndex] : undefined
  const moveCursor = (delta: number) => {
    const count = searchTargets.length
    if (!count) return
    setCursor({ term: searchTerm, index: (cursorIndex + delta + count) % count })
  }

  // Keep the selected row in view as the cursor moves through a long list.
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    navRef.current
      ?.querySelector('[data-search-selected]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  // Enter in the box opens the selected row.
  const openSelected = () => {
    if (!selected?.to) return
    if (selected.newTab) window.open(selected.to, '_blank', 'noopener,noreferrer')
    else navigate({ to: selected.to })
  }

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
            'flex h-16 items-center gap-1 border-b border-sidebar-border px-4',
            collapsed && 'justify-center',
          )}
        >
          {/* Centred in the width the controls leave, so a long name truncates
              before it can run into them. Too wide for the rail, so hidden
              while collapsed. */}
          {!collapsed && (
            <Link
              to="/dashboard"
              onClick={closeMobile}
              aria-label="XpertOne home"
              className="mr-2 flex min-w-0 flex-1 justify-center"
            >
              {/* The active company's logo when it has one, else its name. */}
              <SidebarBrand className="h-11 w-36 max-w-full" />
            </Link>
          )}
          {/* Menu search toggle, beside the collapse toggle — no room for the
              box on the rail. */}
          {!collapsed && (
            <SidebarTooltip label="Search Menu (Ctrl + K)">
              <button
                onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                aria-label="Search menu"
                aria-pressed={searchOpen}
                className={cn(
                  'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  searchOpen && 'bg-sidebar-accent text-sidebar-accent-foreground',
                )}
              >
                <Search className="size-[18px]" />
              </button>
            </SidebarTooltip>
          )}
          {/* Desktop collapse toggle */}
          <SidebarTooltip label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
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
          <SidebarTooltip label="Close Menu">
            <button
              onClick={closeMobile}
              aria-label="Close menu"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            >
              <X className="size-[18px]" />
            </button>
          </SidebarTooltip>
        </div>

        {searchOpen && !collapsed && (
          <SidebarSearch
            value={search}
            onChange={setSearch}
            onClose={closeSearch}
            onMove={moveCursor}
            onSubmit={openSelected}
          />
        )}

        {/* Navigation: section labels → main menu → submenu */}
        {/* `overflow-x-hidden` hides the rows that are still wider than the rail
            mid-transition instead of showing a horizontal scrollbar. */}
        <nav
          ref={navRef}
          className="sidebar-scroll flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-2">
          {/* Until the role answers we can't tell which rows this user has, and
              guessing either way flashes the wrong menu — placeholders instead. */}
          {roleLoading && <NavSkeleton collapsed={collapsed} />}
          {!roleLoading && searchTerm && shownGroups.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sidebar-foreground/50">
              <SearchX className="size-6" />
              <p className="text-sm font-medium">No Menus Found</p>
            </div>
          )}
          {!roleLoading &&
            shownGroups.map((group) => (
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
                  <HighlightMatch text={group.title} term={searchTerm} />
                </p>
                {group.items.map((item) =>
                  item.children?.length ? (
                    <NavParent
                      key={item.label}
                      item={item}
                      collapsed={collapsed}
                      pathname={pathname}
                      searchTerm={searchTerm}
                      selectedTo={selected?.to}
                      onNavigate={closeMobile}
                    />
                  ) : (
                    <NavLeaf
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      searchTerm={searchTerm}
                      selectedTo={selected?.to}
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

/** The search cursor's row: an outline, so it reads apart from the active route's tint. */
const searchSelectedClasses = 'bg-sidebar-accent/40 text-sidebar-foreground ring-1 ring-inset ring-sidebar-primary/50'

/** Spread on a row so the sidebar can scroll the search cursor's row into view. */
const searchSelectedProps = (selected: boolean) =>
  selected ? { 'data-search-selected': '' } : {}

function NavLeaf({
  item,
  collapsed,
  searchTerm = '',
  selectedTo,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  searchTerm?: string
  /** The row the search's ↑/↓ cursor is on. */
  selectedTo?: string
  onNavigate?: () => void
}) {
  const Icon = item.icon
  if (!item.to) return null
  const selected = item.to === selectedTo

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
          {...searchSelectedProps(selected)}
          className={cn(leafClasses(collapsed), selected && searchSelectedClasses)}
        >
          <Icon className="size-[18px] shrink-0" />
          {!collapsed && (
            <span className="truncate">
              <HighlightMatch text={item.label} term={searchTerm} />
            </span>
          )}
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
        {...searchSelectedProps(selected)}
        className={cn(leafClasses(collapsed), selected && searchSelectedClasses)}
      >
        <Icon className="size-[18px] shrink-0 transition-colors group-[.active]:text-sidebar-primary" />
        {!collapsed && (
            <span className="truncate">
              <HighlightMatch text={item.label} term={searchTerm} />
            </span>
          )}
      </Link>
    </SidebarTooltip>
  )
}

function NavParent({
  item,
  collapsed,
  pathname,
  searchTerm = '',
  selectedTo,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
  searchTerm?: string
  /** The row the search's ↑/↓ cursor is on. */
  selectedTo?: string
  onNavigate?: () => void
}) {
  const children = item.children ?? []
  const childActive = children.some((c) => navItemOwnsPath(c, pathname))
  const [open, setOpen] = useState(childActive)
  const Icon = item.icon
  // While searching, every surviving parent shows its matching children.
  const expanded = open || searchTerm !== ''

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
        aria-expanded={expanded}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
          childActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/75',
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        <span className="flex-1 truncate text-left">
          <HighlightMatch text={item.label} term={searchTerm} />
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')}
        />
      </button>
      {expanded && (
        <ul className="mt-0.5 ml-4 space-y-0.5 pl-3">
          {children.map((c) =>
            c.to ? (
              <li key={c.to}>
                <Link
                  to={c.to}
                  activeOptions={{ exact: c.exact ?? false }}
                  onClick={onNavigate}
                  {...searchSelectedProps(c.to === selectedTo)}
                  className={cn(
                    // `active` by hand too, for routes the row claims via `activeFor`.
                    navItemOwnsPath(c, pathname) && 'active',
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
                    '[&.active]:bg-sidebar-accent [&.active]:font-semibold [&.active]:text-sidebar-accent-foreground [&.active]:hover:bg-sidebar-accent',
                    c.to === selectedTo && searchSelectedClasses,
                  )}
                >
                  <span className="mt-0.75 grid size-4.5 shrink-0 place-items-center self-start">
                    <span className="size-1.5 rounded-full bg-current opacity-60 transition-opacity group-[.active]:bg-sidebar-primary group-[.active]:opacity-100" />
                  </span>
                  {/* Long labels wrap onto a second line instead of being clipped. */}
                  <span className="min-w-0 leading-snug text-pretty">
                    <HighlightMatch text={c.label} term={searchTerm} />
                  </span>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  )
}
