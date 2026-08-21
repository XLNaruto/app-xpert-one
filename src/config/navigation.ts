import type { LucideIcon } from "lucide-react";
import { PERMISSIONS, type PermissionSpec } from "@/features/permissions";
import {
  Banknote,
  Boxes,
  Briefcase,
  Building,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  CalendarOff,
  Calculator,
  CreditCard,
  Clock,
  // Used by the commented-out "HR Setup" menu below — uncomment together.
  // CalendarDays,
  // CalendarHeart,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  FileType2,
  Gift,
  HandCoins,
  Headset,
  HeartPulse,
  KeyRound,
  Landmark,
  LifeBuoy,
  LayoutDashboard,
  MapPinned,
  Network,
  Percent,
  ReceiptIndianRupee,
  RefreshCw,
  Settings2,
  ShieldCheck,
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
  /**
   * What the user must hold for this row to appear — a `PERMISSIONS` entry from
   * `features/permissions` (a resource, or an array of candidate spellings).
   * Omit for rows everyone signed in can reach (Dashboard, My Profile). The
   * sidebar filters on it; the matching route guards on the same entry, so a
   * hidden row can't be reached by typing its URL either.
   */
  permission?: PermissionSpec;
  /**
   * Set on the few rows that work without an active company. Everything else is
   * tenant-scoped, so until a company is selected `filterNavByCompany` hides it —
   * the Company master is the one place the user can still go (to create or pick
   * one). A parent survives if any of its children are marked.
   */
  companyIndependent?: boolean;
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
    items: [{
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        permission: PERMISSIONS.dashboard,
      }],
  },
  {
    title: "Human Resource",
    items: [
      {
        label: "Employee Management",
        to: "/hr/employee",
        icon: UserRoundCog,
        permission: PERMISSIONS.employees,
      },
      {
        label: "Attendance Management",
        to: "/hr/attendance",
        icon: CalendarCheck,
        permission: PERMISSIONS.attendance,
      },
      {
        label: "Leave Management",
        to: "/hr/leave",
        icon: CalendarDays,
        permission: PERMISSIONS.leaves,
      },
      {
        label: "Salary Management",
        icon: Wallet,
        children: [
          {
            label: "Bulk Update Wage",
            to: "/hr/bulk-wage",
            icon: HandCoins,
            permission: PERMISSIONS.bulkWage,
          },
          {
            label: "Calculate Salary",
            to: "/hr/salary",
            icon: Calculator,
            permission: PERMISSIONS.calculateSalary,
          },
          {
            label: "View Salary",
            to: "/hr/salary-view",
            icon: FileSpreadsheet,
            permission: PERMISSIONS.salaryView,
          },
          {
            label: "Pay Salary",
            to: "/hr/pay-salary",
            icon: Banknote,
            permission: PERMISSIONS.paySalary,
          },
        ],
      },

      {
        /*
          The statutory and payroll statements, read off months already
          processed. They sit under Human Resource rather than in a section of
          their own because that is where the month they report on was run —
          nothing here writes, and every one of them is a different question
          about the same payroll.

          No `permission` on the parent: it's a disclosure, and each sheet
          carries its own resource, so a user who holds only PF sees Reports with
          one row under it rather than a heading they can't open.
        */
        label: "Reports",
        icon: FileBarChart,
        children: [
          {
            label: "Salary Report",
            to: "/reports/salary-report",
            icon: FileSpreadsheet,
            permission: PERMISSIONS.salaryReport,
          },
          {
            label: "PF Report",
            to: "/reports/pf-report",
            icon: Landmark,
            permission: PERMISSIONS.pfReport,
          },
          {
            label: "ESIC Report",
            to: "/reports/esic-report",
            icon: HeartPulse,
            permission: PERMISSIONS.esicReport,
          },
          {
            label: "PT Report",
            to: "/reports/pt-report",
            icon: ReceiptIndianRupee,
            permission: PERMISSIONS.ptReport,
          },
        ],
      },     
      {
        /*
          Under Salary Management rather than with the Reports below it: the
          estimate is a read, but the screen COMMITS a bonus against the
          months it covers, which is a payroll action and not a statement.
        */
        label: "Bonus Estimation",
        to: "/hr/bonus-estimation",
        icon: Gift,
        permission: PERMISSIONS.bonusEstimation,
      },
    ],
  },
  {
    title: "Master",
    items: [
      {
        label: "Company Setup",
        icon: Settings2,
        children: [
          {
            label: "Company",
            to: "/master/company",
            icon: Building2,
            permission: PERMISSIONS.companies,
            // `/user/companies` isn't tenant-scoped, so this row stays reachable
            // with no company selected — it's how the user gets one.
            companyIndependent: true,
          },
          {
            label: "Branch",
            to: "/master/branch",
            icon: Building,
            permission: PERMISSIONS.branches,
          },
          {
            label: "Department",
            to: "/master/department",
            icon: Building,
            permission: PERMISSIONS.departments,
          },
          {
            label: "Designation",
            to: "/master/designation",
            icon: Briefcase,
            permission: PERMISSIONS.designations,
          },
        ],
      },
      {
        label: "Statutory Setup",
        icon: Landmark,
        children: [
          {
            label: "PF Rate Setting",
            to: "/master/pf-rate",
            icon: Percent,
            permission: PERMISSIONS.pfRates,
          },
          {
            label: "ESIC Rate Setting",
            to: "/master/esic-rate",
            icon: HeartPulse,
            permission: PERMISSIONS.esicRates,
          },
          {
            label: "PT Rate Setting",
            to: "/master/pt-rate",
            icon: ReceiptIndianRupee,
            permission: PERMISSIONS.ptRates,
          },
          {
            label: "LWF Rate Setting",
            to: "/master/lwf-rate",
            icon: HandCoins,
            permission: PERMISSIONS.lwfRates,
          },
          // All five address screens are one resource on the API, so they stand
          // or fall together.
          {
            label: "PF Office Address",
            to: "/master/pf-office-address",
            icon: MapPinned,
            permission: PERMISSIONS.officeAddresses,
          },
          {
            label: "ESIC Office Address",
            to: "/master/esic-office-address",
            icon: MapPinned,
            permission: PERMISSIONS.officeAddresses,
          },
          {
            label: "LWF Office Address",
            to: "/master/lwf-office-address",
            icon: MapPinned,
            permission: PERMISSIONS.officeAddresses,
          },
          {
            label: "Factory / Statutory Office Address",
            to: "/master/factory-office-address",
            icon: MapPinned,
            permission: PERMISSIONS.officeAddresses,
          },
          {
            label: "Employment Exchange Office Address",
            to: "/master/employment-exchange-office-address",
            icon: MapPinned,
            permission: PERMISSIONS.officeAddresses,
          },
        ],
      },
      {
        label: "HR Setup",
        icon: UsersRound,
        children: [
          {
            label: "Leave Types",
            to: "/master/leave-type",
            icon: CalendarDays,
            permission: PERMISSIONS.leaveTypes,
          },
          {
            label: "Holidays",
            to: "/master/holiday",
            icon: CalendarHeart,
            permission: PERMISSIONS.holidays,
          },
          {
            label: "Allowance & Deduction",
            to: "/master/allowance-deduction",
            icon: Wallet,
            permission: PERMISSIONS.payComponents,
          },
        ],
      },
      {
        /*
          Shift Management sits under Master because all three of its records are
          configuration the rest of the app points at. The shifts themselves are
          created on the company's Shift tab (they hang off a company id), so what
          lives here is what has no home of its own: the rotation cycles built from
          those shifts, and the week-off patterns they fall back on.
        */
        label: "Shift Management",
        icon: Clock,
        children: [
          {
            label: "Shift Rotation",
            to: "/master/shift-rotation",
            icon: RefreshCw,
            permission: PERMISSIONS.shiftRotations,
          },
          {
            label: "Week-Off Policy",
            to: "/master/weekoff-policy",
            icon: CalendarOff,
            permission: PERMISSIONS.weekoffPolicies,
          },
        ],
      },
      {
        label: "General Setup",
        icon: SlidersHorizontal,
        children: [
          {
            label: "Assets",
            to: "/master/asset",
            icon: Boxes,
            permission: PERMISSIONS.assets,
          },
          {
            label: "Document Type",
            to: "/master/document-type",
            icon: FileType2,
            permission: PERMISSIONS.documentTypes,
          },
          {
            label: "Documents",
            to: "/master/document",
            icon: FileText,
            permission: PERMISSIONS.documents,
          },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        // The account's web-panel logins. Account-scoped, not tenant-scoped:
        // the list spans every company (and the owners, who belong to none),
        // and a user's company follows from the role they're given.
        label: "Users",
        to: "/administration/admin-user",
        icon: UsersRound,
        permission: PERMISSIONS.users,
        companyIndependent: true,
      },
      {
        label: "Roles & Permissions",
        to: "/administration/role",
        icon: ShieldCheck,
        permission: PERMISSIONS.roles,
      },
      {
        // The company's allow/block lists plus the mode switch that decides
        // which of them the door actually consults.
        label: "IP Access Control",
        to: "/administration/ip-address",
        icon: Network,
        permission: PERMISSIONS.ipAddresses,
      },
      {
        // Billing is the ACCOUNT's plan, not a company's — nothing on it is
        // tenant-scoped, so it stays reachable before a company is picked.
        label: "Billing & Subscription",
        to: "/administration/billing",
        icon: CreditCard,
        permission: PERMISSIONS.billing,
        companyIndependent: true,
      },
    ],
  },
  {
    /*
      Talk is the chat product, and this section is what the PANEL does about
      it — not the chatting itself, which happens in the Talk app. Its own
      section rather than a row under Administration because the API models it
      that way too: `my-role` carries a Talk branch (Open Talk · Monitoring ·
      Credential) beside the admin ones, and the rows land here as they're built.

      ACCOUNT-scoped: a credential names an employee and reaches whichever
      companies it is granted, spanning every company of the account — so the
      screen doesn't wait on one being picked.
    */
    title: "XpertOne Talk",
    items: [
      {
        // The employees' own Talk logins. A back-office user's Talk access is
        // part of their panel login instead, edited on Administration → Users.
        label: "Credential",
        to: "/talk/credential",
        icon: KeyRound,
        permission: PERMISSIONS.talkCredentials,
        companyIndependent: true,
      },
    ],
  },
  {
    /*
      Two help desks, pointing opposite ways. "Raise Support" is us asking the
      XpertOne platform; "Employee Support" is our own people asking us. They
      sit in one section because they are the same shape of work read from
      either end, and separate rows because nothing about them is shared: one
      carries a subscription-priced deadline, the other a queue with none.

      Both are ACCOUNT-scoped — a platform ticket names no company, and the
      employee queue deliberately spans every company of the account — so
      neither waits on a company being picked.
    */
    title: "Help & Support",
    items: [
      {
        label: "Raise Support",
        to: "/support/ticket",
        icon: LifeBuoy,
        permission: PERMISSIONS.support,
        companyIndependent: true,
      },
      {
        // ANY-of: the catalog's exact spelling for this desk isn't confirmed, so
        // the bare `support` resource keeps the row rather than losing it to a
        // name. See `PERMISSIONS.employeeSupport`.
        label: "Employee Support",
        to: "/support/employee-ticket",
        icon: Headset,
        permission: [PERMISSIONS.employeeSupport, PERMISSIONS.support],
        companyIndependent: true,
      },
    ],
  },
];

/**
 * Drop the rows the signed-in user can't reach, keeping order and structure.
 *
 * An item survives when it has no `permission` gate or the user holds it; a
 * submenu parent survives only if it has at least one surviving child (a parent
 * is just a disclosure — an empty one would expand to nothing), and a section
 * with no items left disappears with its heading.
 *
 * Pass `can` from `useCan()`. Breadcrumbs and page titles deliberately keep
 * reading the unfiltered `navGroups`: a route the user reached anyway should
 * still be named properly rather than fall back to title-cased URL segments.
 */
export function filterNavByPermission(
  groups: NavGroup[],
  can: (spec?: PermissionSpec | null) => boolean,
): NavGroup[] {
  const keepItem = (item: NavItem): NavItem | null => {
    if (item.permission && !can(item.permission)) return null;
    if (!item.children?.length) return item;
    const children = item.children
      .map(keepItem)
      .filter((child): child is NavItem => child !== null);
    if (!children.length) return item.to ? { ...item, children } : null;
    return { ...item, children };
  };

  return groups
    .map((group) => ({
      ...group,
      items: group.items.map(keepItem).filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Drop every row that needs an active company, keeping only the ones flagged
 * `companyIndependent` (today: the Company master). Runs *after*
 * `filterNavByPermission`, so a user who can't reach the company master is left
 * with an empty sidebar rather than a row they'd be forbidden on.
 *
 * Applied by the sidebar only while no company is selected — every other screen
 * would just render the "Select a company" picker, so offering the row is noise.
 */
export function filterNavByCompany(groups: NavGroup[]): NavGroup[] {
  const keepItem = (item: NavItem): NavItem | null => {
    if (!item.children?.length) return item.companyIndependent ? item : null;
    const children = item.children
      .map(keepItem)
      .filter((child): child is NavItem => child !== null);
    if (!children.length) return item.companyIndependent && item.to ? { ...item, children } : null;
    return { ...item, children };
  };

  return groups
    .map((group) => ({
      ...group,
      items: group.items.map(keepItem).filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}

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
    routableNavItems.find((item) => item.to !== "/" && pathname.startsWith(item.to))
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
