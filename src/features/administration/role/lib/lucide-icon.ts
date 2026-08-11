import {
  Ban,
  Boxes,
  Calculator,
  CalendarCheck,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Key,
  LayoutDashboard,
  List,
  MapPinned,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  UserRoundCog,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/**
 * The catalog names its icons as Lucide component names (`List`, `Eye`, `Plus`,
 * `Pencil`, `Trash2` for the five uniform CRUD actions, something bespoke for a
 * non-CRUD one). An allowlist rather than a namespace import: pulling all of
 * `lucide-react` in to resolve a name at runtime would ship the whole icon set.
 *
 * A name that isn't here resolves to `undefined` and the row renders label-only,
 * which the API documents as the right fallback — never a stand-in glyph that
 * would imply the wrong action.
 */
const ICONS: Record<string, LucideIcon> = {
  Ban,
  Boxes,
  Calculator,
  CalendarCheck,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Key,
  LayoutDashboard,
  List,
  MapPinned,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  UserRoundCog,
  Users,
  UsersRound,
  Wallet,
}

/** The Lucide component a catalog `icon` name refers to, if the app carries it. */
export function lucideIcon(name?: string): LucideIcon | undefined {
  return name ? ICONS[name] : undefined
}
