import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Building,
  Building2,
  LayoutDashboard,
  Map,
  MapPinned,
  Settings2,
  SlidersHorizontal,
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
    title: "Master",
    items: [
      {
        label: "Company Setup",
        icon: Settings2,
        children: [
          { label: "Company", to: "/company", icon: Building2 },
          { label: "Branch", to: "/branch", icon: Building },
          { label: "Department", to: "/department", icon: Building },
        ],
      },
      {
        label: "General Setup",
        icon: SlidersHorizontal,
        children: [
          { label: "State", to: "/state", icon: MapPinned },
          { label: "District", to: "/district", icon: Map },
          { label: "Assets", to: "/assets", icon: Boxes },
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

/** Human-readable page name for a pathname, or undefined if unknown. */
export function pageNameForPath(pathname: string): string | undefined {
  const navMatch =
    routableNavItems.find((item) => item.to === pathname) ??
    routableNavItems.find(
      (item) => item.to !== "/" && pathname.startsWith(item.to),
    );
  return navMatch?.label ?? extraTitles[pathname];
}
