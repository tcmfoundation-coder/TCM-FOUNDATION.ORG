import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Newspaper,
  BookOpen,
  Sparkles,
  Briefcase,
  Users,
  Handshake,
  Share2,
  Quote,
  HelpCircle,
  ImageIcon,
  FileDown,
  ClipboardList,
  MessageSquare,
  MailPlus,
  Mail,
  Wrench,
  UserCog,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

export type NavGroupKey = "overview" | "content" | "operations" | "administration";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Empty = visible to any authenticated user with at least one active role. */
  roles: string[];
  /** Breadcrumb trail shown in the header, e.g. ["Content", "Programs"]. */
  breadcrumb: string[];
}

const CONTENT_ROLES = ["CONTENT_EDITOR", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"];
const MANAGEMENT_ROLES = ["ADMINISTRATOR", "SUPER_ADMINISTRATOR"];
const SUPER_ADMIN_ONLY = ["SUPER_ADMINISTRATOR"];

export const NAV_GROUPS: { key: NavGroupKey; label: string; items: AdminNavItem[] }[] = [
  {
    key: "overview",
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [], breadcrumb: ["Dashboard"] },
    ],
  },
  {
    key: "content",
    label: "Content",
    items: [
      { href: "/admin/content/programs", label: "Programs", icon: FolderKanban, roles: CONTENT_ROLES, breadcrumb: ["Content", "Programs"] },
      { href: "/admin/content/blog", label: "Blog", icon: Newspaper, roles: CONTENT_ROLES, breadcrumb: ["Content", "Blog"] },
      { href: "/admin/content/articles", label: "Articles", icon: BookOpen, roles: CONTENT_ROLES, breadcrumb: ["Content", "Articles"] },
      { href: "/admin/content/spotlights", label: "Spotlights", icon: Sparkles, roles: CONTENT_ROLES, breadcrumb: ["Content", "Spotlights"] },
      { href: "/admin/content/opportunities", label: "Opportunities", icon: Briefcase, roles: CONTENT_ROLES, breadcrumb: ["Content", "Opportunities"] },
      { href: "/admin/content/team", label: "Team", icon: Users, roles: CONTENT_ROLES, breadcrumb: ["Content", "Team"] },
      { href: "/admin/content/partners", label: "Partners", icon: Handshake, roles: CONTENT_ROLES, breadcrumb: ["Content", "Partners"] },
      { href: "/admin/content/social-links", label: "Social Links", icon: Share2, roles: CONTENT_ROLES, breadcrumb: ["Content", "Social Links"] },
      { href: "/admin/content/testimonials", label: "Testimonials", icon: Quote, roles: CONTENT_ROLES, breadcrumb: ["Content", "Testimonials"] },
      { href: "/admin/content/faq", label: "FAQ", icon: HelpCircle, roles: CONTENT_ROLES, breadcrumb: ["Content", "FAQ"] },
      { href: "/admin/content/downloads", label: "Downloadable Resources", icon: FileDown, roles: CONTENT_ROLES, breadcrumb: ["Content", "Downloadable Resources"] },
      { href: "/admin/media", label: "Media", icon: ImageIcon, roles: CONTENT_ROLES, breadcrumb: ["Content", "Media"] },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    items: [
      { href: "/admin/applications", label: "Applications", icon: ClipboardList, roles: MANAGEMENT_ROLES, breadcrumb: ["Operations", "Applications"] },
      { href: "/admin/support-requests", label: "Support Requests", icon: MessageSquare, roles: MANAGEMENT_ROLES, breadcrumb: ["Operations", "Support Requests"] },
      { href: "/admin/support-services", label: "Support Services", icon: Wrench, roles: MANAGEMENT_ROLES, breadcrumb: ["Operations", "Support Services"] },
      { href: "/admin/contact-submissions", label: "Contact Submissions", icon: Mail, roles: MANAGEMENT_ROLES, breadcrumb: ["Operations", "Contact Submissions"] },
      { href: "/admin/newsletter", label: "Newsletter Subscribers", icon: MailPlus, roles: MANAGEMENT_ROLES, breadcrumb: ["Operations", "Newsletter Subscribers"] },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    items: [
      { href: "/admin/users-roles", label: "Users & Roles", icon: UserCog, roles: MANAGEMENT_ROLES, breadcrumb: ["Administration", "Users & Roles"] },
      { href: "/admin/settings", label: "Settings", icon: Settings, roles: MANAGEMENT_ROLES, breadcrumb: ["Administration", "Settings"] },
      { href: "/admin/audit-log", label: "Audit Log", icon: ShieldCheck, roles: SUPER_ADMIN_ONLY, breadcrumb: ["Administration", "Audit Log"] },
    ],
  },
];

// Reachable from the header's profile dropdown, not the sidebar — kept out
// of NAV_GROUPS so it never renders as a sidebar link, but still included
// below so the header shows the right page title/breadcrumb there.
const EXTRA_PAGES: AdminNavItem[] = [
  { href: "/admin/profile", label: "My Profile", icon: UserCircle, roles: [], breadcrumb: ["My Profile"] },
];

export const ALL_NAV_ITEMS: AdminNavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), ...EXTRA_PAGES];

/** Finds the nav item whose href is the longest prefix match for a pathname. */
export function findNavItemForPath(pathname: string): AdminNavItem | undefined {
  let best: AdminNavItem | undefined;
  for (const item of ALL_NAV_ITEMS) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best;
}

export function hasAnyRole(activeRoleNames: Set<string>, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  return allowed.some((role) => activeRoleNames.has(role));
}
