"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Menu,
  BookOpen,
  Users,
  Megaphone,
  FileWarning,
  BarChart3,
  X,
  Tags,
  Palette,
  Shield,
  MessageSquare,
  Smile,
  CheckCircle2,
  ListTodo,
  Book,
  Banknote,
  FileCheck,
  FileText,
  PanelRight,
  ChevronDown,
  ChevronRight,
  Bell,
  Send,
  Shapes,
  ContactRound,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useTheme } from "next-themes";

/** ===== Types ===== */
type Role =
  | "admin"
  | "content_moderator"
  | "financial_manager"
  | "community_manager"
  | "author"
  | "user";

type BaseItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type LinkItem = BaseItem & {
  kind: "link";
  href: string;
};

type SubmenuItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  matchPrefixes?: string[];
};

type GroupItem = BaseItem & {
  kind: "group";
  submenu: SubmenuItem[];
};

type MenuItem = LinkItem | GroupItem;

/** ===== Data ===== */
const menuItems: MenuItem[] = [
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

/** ===== Role -> Menu Access ===== */
const ROLE_MENU_ACCESS: Record<Role, string[]> = {
  admin: ["dashboard", "notifications", "policies", "audit-logs", "users"],

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

/** ===== Role -> Tool Title ===== */
const ROLE_TOOL_LABEL: Record<Role, string> = {
  admin: "Admin Tool",
  content_moderator: "Content Tool",
  community_manager: "Community Tool",
  financial_manager: "Financial Tool",
  author: "Author Tool",
  user: "User Tool",
};

/** ===== Helpers ===== */
function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function normalizeRole(role: string | null | undefined): Role | null {
  if (!role) return null;

  const value = String(role).toLowerCase().trim();

  if (
    value === "admin" ||
    value === "content_moderator" ||
    value === "financial_manager" ||
    value === "community_manager" ||
    value === "author" ||
    value === "user"
  ) {
    return value;
  }

  return null;
}

function getVisibleMenuItems(role: Role | null, items: MenuItem[]) {
  if (!role) return [];
  const allowedIds = new Set(ROLE_MENU_ACCESS[role] || []);
  return items.filter((item) => allowedIds.has(item.id));
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme } = useTheme();

  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      taxonomy: false,
      notifications: false,
      moderation: false,
    },
  );

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      if (!API_URL) {
        console.warn("Missing NEXT_PUBLIC_API_URL");
        setCurrentRole(null);
        setLoadingRole(false);
        return;
      }

      try {
        const endpoint = `${API_URL}/api/auth/me`;
        const res = await axios.get(endpoint, { withCredentials: true });

        const rawRole = res.data?.role || res.data?.user?.role;
        const parsedRole = normalizeRole(rawRole);

        console.log("[AdminLayout] rawRole =", rawRole);
        console.log("[AdminLayout] parsedRole =", parsedRole);

        setCurrentRole(parsedRole);
      } catch (err: any) {
        console.warn(
          "[AdminLayout] fetchMe failed:",
          err?.response?.data || err?.message,
        );
        setCurrentRole(null);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchMe();
  }, [API_URL]);

  const visibleMenuItems = useMemo(() => {
    return getVisibleMenuItems(currentRole, menuItems);
  }, [currentRole]);

  const toolTitle = currentRole ? ROLE_TOOL_LABEL[currentRole] : "Staff Tool";

  const hoverClass = mounted
    ? theme === "dark"
      ? "hover:bg-gray-100 hover:text-black"
      : "hover:bg-gray-300"
    : "hover:bg-gray-300";

  const isSubmenuActive = useMemo(() => {
    return (submenu: SubmenuItem) => {
      if (pathname === submenu.href) return true;

      if (
        submenu.matchPrefixes?.some((prefix) => pathname.startsWith(prefix))
      ) {
        return true;
      }

      return false;
    };
  }, [pathname]);

  const isGroupActive = useMemo(() => {
    return (group: GroupItem) =>
      group.submenu.some((sub) => isSubmenuActive(sub));
  }, [isSubmenuActive]);

  useEffect(() => {
    const activeGroups = visibleMenuItems
      .filter((item): item is GroupItem => item.kind === "group")
      .reduce<Record<string, boolean>>((acc, group) => {
        if (isGroupActive(group)) acc[group.id] = true;
        return acc;
      }, {});

    if (Object.keys(activeGroups).length > 0) {
      setExpandedGroups((prev) => ({ ...prev, ...activeGroups }));
    }
  }, [pathname, isGroupActive, visibleMenuItems]);

  const toggleGroup = (groupId: string) => {
    if (!open) {
      setOpen(true);
      setExpandedGroups((prev) => ({ ...prev, [groupId]: true }));
      return;
    }

    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex flex-1 pt-16">
        <aside
          className={`shadow-lg border-r transition-all duration-300 ${
            open ? "w-64" : "w-16"
          } flex flex-col`}
        >
          <div className="flex items-center justify-between p-4 border-b">
            {open && (
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                <span className="font-bold text-lg">{toolTitle}</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(!open)}
              className="hover:bg-red-50 hover:text-red-600"
            >
              {open ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {loadingRole ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Loading role...
              </div>
            ) : !currentRole ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No role found
              </div>
            ) : visibleMenuItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No menu available for this role
              </div>
            ) : (
              visibleMenuItems.map((item) => {
                const Icon = item.icon;

                if (item.kind === "group") {
                  const active = isGroupActive(item);
                  const expanded = !!expandedGroups[item.id];

                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.id)}
                        className={`w-full flex items-center ${
                          open ? "gap-3 px-3 justify-start" : "justify-center"
                        } py-2 rounded-lg text-sm font-medium transition-colors ${
                          active ? "bg-blue-100 text-blue-700" : hoverClass
                        }`}
                        title={!open ? item.label : ""}
                      >
                        <Icon
                          className={`${open ? "h-5 w-5" : "h-6 w-6"} shrink-0`}
                        />

                        {open && (
                          <>
                            <span className="flex-1 text-left">
                              {item.label}
                            </span>
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                          </>
                        )}
                      </button>

                      {open && expanded && (
                        <div className="ml-8 space-y-1">
                          {item.submenu.map((sub) => {
                            const subActive = isSubmenuActive(sub);
                            const SubIcon = sub.icon;

                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                  subActive
                                    ? "bg-blue-50 text-blue-700"
                                    : hoverClass
                                }`}
                              >
                                {SubIcon && (
                                  <SubIcon className="h-4 w-4 shrink-0" />
                                )}
                                <span>{sub.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isPathActive(pathname, item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center ${
                      open ? "gap-3 px-3 justify-start" : "justify-center"
                    } py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? "bg-blue-100 text-blue-700" : hoverClass
                    }`}
                    title={!open ? item.label : ""}
                  >
                    <Icon
                      className={`${open ? "h-5 w-5" : "h-6 w-6"} shrink-0`}
                    />
                    {open && <span>{item.label}</span>}
                  </Link>
                );
              })
            )}
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
