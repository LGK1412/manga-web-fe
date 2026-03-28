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
  Loader2,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { removeCookie } from "@/lib/cookie-func";
import { useToast } from "@/hooks/use-toast";
import {
  formatWorkspaceRole,
  isStaffInboxRole,
  resolveAdminWorkspaceMeta,
} from "@/lib/admin-workspace";
import { StaffNotificationBell } from "@/components/admin/staff-notification-bell";

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

const ROLE_TOOL_SUBTITLE: Record<Role, string> = {
  admin: "Platform oversight and system control",
  content_moderator: "Review and policy workflow",
  community_manager: "Conversation and trust workflow",
  financial_manager: "Payout and account operations",
  author: "Publishing and chapter workflow",
  user: "Personal workspace",
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
  const router = useRouter();
  const { setLoginStatus } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(true);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      taxonomy: false,
      notifications: false,
      moderation: false,
    },
  );

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
  const toolSubtitle = currentRole
    ? ROLE_TOOL_SUBTITLE[currentRole]
    : "Shared operations workspace";
  const roleLabel = formatWorkspaceRole(currentRole);
  const workspaceMeta = useMemo(
    () => resolveAdminWorkspaceMeta(pathname),
    [pathname],
  );
  const canShowStaffInboxBell = isStaffInboxRole(currentRole);

  const itemIdleClass =
    "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
  const itemActiveClass =
    "bg-slate-900 text-white shadow-sm shadow-slate-200 dark:bg-slate-100 dark:text-slate-950";
  const subItemActiveClass =
    "border border-blue-100 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";

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

  const handleLogout = async () => {
    if (isLoggingOut || !API_URL) return;

    setIsLoggingOut(true);

    try {
      const res = await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { withCredentials: true },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Unexpected error");
      }

      await removeCookie();
      setLoginStatus(false);
      router.push("/login");
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description:
          error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-w-0 flex-1">
        <aside
          className={`flex shrink-0 flex-col border-r border-slate-200/80 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/95 ${
            open ? "w-72" : "w-20"
          }`}
        >
          <div className="border-b border-slate-200/80 px-4 py-5 dark:border-slate-800">
            {open ? (
              <div className="flex items-start gap-3">
                <div className="relative min-w-0 flex-1 overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-red-50/70 px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-red-950/20">
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-red-300/90 to-transparent dark:via-red-700/70" />

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] border border-red-100/90 bg-white/90 text-red-600 shadow-sm ring-1 ring-red-100/80 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-300 dark:ring-red-900/50">
                      <Shield className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="inline-flex max-w-full items-center rounded-full border border-red-100/90 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700 shadow-sm dark:border-red-900/50 dark:bg-slate-950/80 dark:text-red-200">
                        <span className="truncate">{workspaceMeta.section}</span>
                      </div>
                      <p className="mt-2 truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-950 dark:text-slate-50">
                        {toolTitle}
                      </p>
                      <p className="mt-1 max-w-[11rem] text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {toolSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(!open)}
                    className="h-10 w-10 rounded-[18px] text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-red-50/70 text-red-600 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-red-950/20 dark:text-red-300">
                  <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-red-300/90 to-transparent dark:via-red-700/70" />
                  <Shield className="h-5 w-5" />
                </div>

                <div className="rounded-[20px] border border-slate-200/80 bg-white/90 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(!open)}
                    className="h-10 w-10 rounded-[16px] text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {open && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Signed in as
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {roleLabel}
                </p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {loadingRole ? (
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                Loading role...
              </div>
            ) : !currentRole ? (
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                No role found
              </div>
            ) : visibleMenuItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
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
                          open ? "justify-start gap-3 px-3" : "justify-center"
                        } rounded-2xl py-3 text-sm font-medium transition-all ${
                          active ? itemActiveClass : itemIdleClass
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
                        <div className="ml-6 space-y-1 border-l border-slate-200/80 pl-4 dark:border-slate-800">
                          {item.submenu.map((sub) => {
                            const subActive = isSubmenuActive(sub);
                            const SubIcon = sub.icon;

                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                                  subActive ? subItemActiveClass : itemIdleClass
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
                      open ? "justify-start gap-3 px-3" : "justify-center"
                    } rounded-2xl py-3 text-sm font-medium transition-all ${
                      active ? itemActiveClass : itemIdleClass
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

          <div className="border-t border-slate-200/80 px-3 py-3 dark:border-slate-800">
            <div className={open ? "flex" : "flex justify-center"}>
              <Button
                type="button"
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`h-11 rounded-2xl border border-red-400 bg-red-200 font-semibold text-red-900 shadow-sm transition-colors hover:bg-red-300 hover:text-red-950 dark:border-red-900 dark:bg-red-950/70 dark:text-red-50 dark:hover:bg-red-950/90 ${
                  open ? "w-full justify-center gap-2 px-3" : "w-11 px-0"
                }`}
                title={!open ? "Logout" : ""}
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {open && <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>}
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.28),transparent_36%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92))] dark:bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.55),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(2,6,23,0.94))]">
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto flex w-full max-w-[1440px] items-start justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {toolTitle}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>{workspaceMeta.section}</span>
                </div>

                <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  {workspaceMeta.title}
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {workspaceMeta.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {canShowStaffInboxBell && <StaffNotificationBell />}

                <div className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 md:flex">
                  <span className="mr-2 text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Role
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
