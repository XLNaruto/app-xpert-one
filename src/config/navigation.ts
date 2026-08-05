import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  CalendarHeart,
  // Used by the commented-out "HR Setup" menu below — uncomment together.
  // CalendarDays,
  // CalendarHeart,
  FileText,
  FileType2,
  HandCoins,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  MapPinned,
  Percent,
  ReceiptIndianRupee,
  Settings2,
  SlidersHorizontal,
  UserRoundCog,
  UsersRound,
  Wallet,
  // UsersRound,
  // Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  /** Omit for parent items that only expand a submenu. */
  to?: string;
  icon: LucideIcon;
  children?: NavItem[];
  /** Match the active highlight only on an exact path (use when a sibling route extends this one). */
  exact?: boolean;
}

export interface NavGroup {
  /** Section heading — hidden when the rail is collapsed. */
  title: string;
  items: NavItem[];
}

/** Sidebar navigation: section labels → main menu → optional submenu. */
export const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  }, 
  {
    title: "Human Resource",
    items: [
      { label: "Employee Management", to: "/hr/employee", icon: UserRoundCog },
    ],
  },
  {
    title: "Master",
    items: [
      {
        label: "Company Setup",
        icon: Settings2,
        children: [
          { label: "Company", to: "/master/company", icon: Building2 },
          { label: "Branch", to: "/master/branch", icon: Building },
          { label: "Department", to: "/master/department", icon: Building },
          { label: "Designation", to: "/master/designation", icon: Briefcase },
        ],
      },
      {
        label: "Statutory Setup",
        icon: Landmark,
        children: [
          { label: "PF Rate Setting", to: "/master/pf-rate", icon: Percent },
          { label: "ESIC Rate Setting", to: "/master/esic-rate", icon: HeartPulse },
          { label: "PT Rate Setting", to: "/master/pt-rate", icon: ReceiptIndianRupee },
          { label: "LWF Rate Setting", to: "/master/lwf-rate", icon: HandCoins },
          {
            label: "PF Office Address",
            to: "/master/pf-office-address",
            icon: MapPinned,
          },
          {
            label: "ESIC Office Address",
            to: "/master/esic-office-address",
            icon: MapPinned,
          },
          {
            label: "LWF Office Address",
            to: "/master/lwf-office-address",
            icon: MapPinned,
          },
          {
            label: "Factory / Statutory Office Address",
            to: "/master/factory-office-address",
            icon: MapPinned,
          },
          {
            label: "Employment Exchange Office Address",
            to: "/master/employment-exchange-office-address",
            icon: MapPinned,
          },
        ],
      },
      {
        label: "HR Setup",
        icon: UsersRound,
        children: [
          { label: "Leave Types", to: "/master/leave-type", icon: CalendarDays },
          { label: "Holidays", to: "/master/holiday", icon: CalendarHeart },
          {
            label: "Allowance & Deduction",
            to: "/master/allowance-deduction",
            icon: Wallet,
          },
        ],
      },
      {
        label: "General Setup",
        icon: SlidersHorizontal,
        children: [
          { label: "Assets", to: "/master/asset", icon: Boxes },
          { label: "Document Type", to: "/master/document-type", icon: FileType2 },
          { label: "Documents", to: "/master/document", icon: FileText },
        ],
      },
    ],
  },
 
];

/** Page names for routes that don't appear in the sidebar (auth, errors, etc.). */
const extraTitles: Record<string, string> = {
  "/profile": "My Profile",
  "/login": "Login",
};

/** Flattened nav items (parents + children) that have a `to`, longest path first. */
const routableNavItems = navGroups
  .flatMap((group) => group.items)
  .flatMap((item) => [item, ...(item.children ?? [])])
  .filter((item): item is NavItem & { to: string } => Boolean(item.to))
  .sort((a, b) => b.to.length - a.to.length);

/** Nav item matching a pathname (exact first, then longest prefix). */
function navItemForPath(pathname: string): (NavItem & { to: string }) | undefined {
  return (
    routableNavItems.find((item) => item.to === pathname) ??
    routableNavItems.find(
      (item) => item.to !== "/" && pathname.startsWith(item.to),
    )
  );
}

/** Human-readable page name for a pathname, or undefined if unknown. */
export function pageNameForPath(pathname: string): string | undefined {
  return navItemForPath(pathname)?.label ?? extraTitles[pathname];
}

export interface BreadcrumbCrumb {
  label: string;
  /** Omitted for structural crumbs (section headings, submenu parents). */
  to?: string;
}

function titleCase(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Breadcrumb trail for a pathname, derived from the sidebar structure:
 * section title → submenu parent → nav item → any extra path segments
 * (`create`, `detail`, …). Falls back to title-cased path segments for
 * routes that aren't in the nav at all.
 */
export function breadcrumbsForPath(pathname: string): BreadcrumbCrumb[] {
  const match = navItemForPath(pathname);

  if (!match) {
    const extra = extraTitles[pathname];
    if (extra) return [{ label: extra }];
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => ({ label: titleCase(segment) }));
  }

  const crumbs: BreadcrumbCrumb[] = [];

  for (const group of navGroups) {
    for (const item of group.items) {
      const isParentOfMatch = item.children?.some((child) => child.to === match.to);
      if (item.to !== match.to && !isParentOfMatch) continue;

      // Section heading + submenu parent only matter for nested items.
      if (isParentOfMatch) {
        crumbs.push({ label: group.title });
        crumbs.push({ label: item.label, to: item.to });
      }
      break;
    }
    if (crumbs.length) break;
  }

  crumbs.push({ label: match.label, to: match.to });

  const rest = pathname.slice(match.to.length).split("/").filter(Boolean);
  for (const segment of rest) crumbs.push({ label: titleCase(segment) });

  return crumbs;
}
