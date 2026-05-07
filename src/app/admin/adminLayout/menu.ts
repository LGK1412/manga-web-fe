import {
  BarChart3,
  Banknote,
  Bell,
  Book,
  BookOpen,
  CheckCircle2,
  ContactRound,
  FileCheck,
  FileText,
  FileWarning,
  ListTodo,
  Megaphone,
  MessageSquare,
  Palette,
  PanelRight,
  Send,
  Shapes,
  Smile,
  Tags,
  Users,
} from "lucide-react";
import type { MenuItem, Role } from "./types";

export const menuItems: MenuItem[] = [
  {
    kind: "link",
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    href: "/admin/dashboard",
  },
  {
    kind: "link",
    id: "users",
    label: "User",
    icon: Users,
    href: "/admin/user",
  },
  {
    kind: "group",
    id: "taxonomy",
    label: "Taxonomy",
    icon: Shapes,
    submenu: [
      { label: "Genre", href: "/admin/genre", icon: Tags },
      { label: "Style", href: "/admin/style", icon: Palette },
    ],
  },
  {
    kind: "link",
    id: "reports",
    label: "Report",
    icon: FileWarning,
    href: "/admin/report",
  },
  {
    kind: "link",
    id: "payout-profile",
    label: "Payout Profile",
    icon: ContactRound,
    href: "/admin/payout-profile",
  },
  {
    kind: "link",
    id: "withdraw",
    label: "Withdraw",
    icon: Banknote,
    href: "/admin/withdraw",
  },
  {
    kind: "link",
    id: "comments",
    label: "Comment",
    icon: MessageSquare,
    href: "/admin/comments",
  },
  {
    kind: "link",
    id: "emoji-pack",
    label: "Emoji Packs",
    icon: Smile,
    href: "/admin/emoji-pack",
  },
  {
    kind: "group",
    id: "notifications",
    label: "Notification",
    icon: Megaphone,
    submenu: [
      {
        label: "List Sent Notification",
        href: "/admin/notifications",
        icon: Bell,
      },
      {
        label: "Send Notification",
        href: "/admin/notifications/send-general",
        icon: Send,
        matchPrefixes: [
          "/admin/notifications/send-general",
          "/admin/notifications/send-policy",
        ],
      },
    ],
  },
  {
    kind: "link",
    id: "policies",
    label: "Policies",
    icon: BookOpen,
    href: "/admin/policies",
  },
  {
    kind: "link",
    id: "audit-logs",
    label: "Audit Logs",
    icon: FileCheck,
    href: "/admin/audit-logs",
  },
  {
    kind: "link",
    id: "license-management",
    label: "License Management",
    icon: FileText,
    href: "/admin/license-management",
  },
  {
    kind: "group",
    id: "moderation",
    label: "Moderation",
    icon: CheckCircle2,
    submenu: [
      {
        label: "Queue",
        href: "/admin/moderation/queue",
        icon: ListTodo,
      },
      {
        label: "Workspace",
        href: "/admin/moderation/workspace",
        icon: PanelRight,
        matchPrefixes: ["/admin/moderation/workspace"],
      },
    ],
  },
  {
    kind: "link",
    id: "manga",
    label: "Manga Management",
    icon: Book,
    href: "/admin/manga",
  },
];

export const ROLE_MENU_ACCESS: Record<Role, string[]> = {
  admin: [
    "dashboard",
    "notifications",
    "policies",
    "audit-logs",
    "users",
    "emoji-pack",
  ],
  content_moderator: [
    "reports",
    "manga",
    "license-management",
    "moderation",
    "users",
    "notifications",
    "taxonomy",
  ],
  community_manager: ["users", "reports", "comments", "notifications"],
  financial_manager: ["users", "withdraw", "payout-profile"],
  author: [],
  user: [],
};

export const ROLE_TOOL_LABEL: Record<Role, string> = {
  admin: "Admin Tool",
  content_moderator: "Content Tool",
  community_manager: "Community Tool",
  financial_manager: "Financial Tool",
  author: "Author Tool",
  user: "User Tool",
};

export const INITIAL_EXPANDED_GROUPS: Record<string, boolean> = {
  taxonomy: false,
  notifications: false,
  moderation: false,
};
