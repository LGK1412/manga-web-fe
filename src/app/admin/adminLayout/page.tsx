"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Bell,
  Send,
  Shapes,
  ContactRound,
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

const REDIRECT_DELAY_MS = 5000;

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

function canAccessMenuPath(item: MenuItem, pathname: string) {
  if (item.kind === "link") {
    return isPathActive(pathname, item.href);
  }

  return item.submenu.some((sub) => {
    if (pathname === sub.href || pathname.startsWith(`${sub.href}/`)) {
      return true;
    }

    return !!sub.matchPrefixes?.some((prefix) => pathname.startsWith(prefix));
  });
}

function getFirstWorkspaceHref(items: MenuItem[]) {
  for (const item of items) {
    if (item.kind === "link") {
      return item.href;
    }

    if (item.submenu.length > 0) {
      return item.submenu[0].href;
    }
  }

  return "/";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, isLogin, user, setLoginStatus } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasRedirectedRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      taxonomy: false,
      notifications: false,
      moderation: false,
    },
  );

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const currentRole = useMemo(() => normalizeRole(user?.role), [user]);
  const loadingRole = !isReady;

  const visibleMenuItems = useMemo(() => {
    return getVisibleMenuItems(currentRole, menuItems);
  }, [currentRole]);
  const hasStaffWorkspace =
    isLogin && !!currentRole && visibleMenuItems.length > 0;
  const canAccessStaffInbox =
    !!currentRole &&
    isStaffInboxRole(currentRole) &&
    pathname === "/admin/my-notifications";
  const canAccessCurrentPath =
    visibleMenuItems.some((item) => canAccessMenuPath(item, pathname)) ||
    canAccessStaffInbox;
  const fallbackWorkspaceHref = useMemo(
    () =>
      visibleMenuItems.length > 0
        ? getFirstWorkspaceHref(visibleMenuItems)
        : canAccessStaffInbox
          ? "/admin/my-notifications"
          : "/",
    [canAccessStaffInbox, visibleMenuItems],
  );

  const toolTitle = currentRole ? ROLE_TOOL_LABEL[currentRole] : "Staff Tool";
  const roleLabel = formatWorkspaceRole(currentRole);
  const workspaceMeta = useMemo(
    () => resolveAdminWorkspaceMeta(pathname),
    [pathname],
  );
  const canShowStaffInboxBell = isStaffInboxRole(currentRole);

  const itemIdleClass =
    "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
  const itemActiveClass =
    "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950";
  const subItemActiveClass =
    "border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";

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

  useEffect(() => {
    if (loadingRole || hasRedirectedRef.current) return;

    if (!isLogin) {
      hasRedirectedRef.current = true;
      setRedirectNotice({
        title: "Redirecting to login",
        description:
          "Please log in with a staff account to access the admin workspace.",
      });
      toast({
        title: "Login required",
        description:
          "Please log in with a staff account to access the staff workspace.",
        variant: "destructive",
      });
      redirectTimerRef.current = setTimeout(() => {
        router.replace("/login");
      }, REDIRECT_DELAY_MS);
      return;
    }

    if (!hasStaffWorkspace) {
      hasRedirectedRef.current = true;
      setRedirectNotice({
        title: "Redirecting to a workspace you can access",
        description: "This admin area is only available to staff accounts.",
      });
      toast({
        title: "Access denied",
        description:
          "Your account does not have permission to access the admin workspace.",
        variant: "destructive",
      });
      redirectTimerRef.current = setTimeout(() => {
        router.replace("/");
      }, REDIRECT_DELAY_MS);
      return;
    }

    if (!canAccessCurrentPath) {
      hasRedirectedRef.current = true;
      setRedirectNotice({
        title: "Redirecting to a workspace you can access",
        description:
          "This role does not have access to the current admin page.",
      });
      toast({
        title: "Access denied",
        description: "Your role cannot access this admin page.",
        variant: "destructive",
      });
      redirectTimerRef.current = setTimeout(() => {
        router.replace(fallbackWorkspaceHref);
      }, REDIRECT_DELAY_MS);
    }
  }, [
    canAccessCurrentPath,
    fallbackWorkspaceHref,
    hasStaffWorkspace,
    isLogin,
    loadingRole,
    router,
    toast,
  ]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

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
          error?.response?.data?.message ||
          error?.message ||
          "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loadingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-300" />
          <div>
            <p className="text-sm font-semibold">Loading admin workspace</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verifying your staff access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (redirectNotice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Shield className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
          <h1 className="mt-4 text-lg font-semibold">{redirectNotice.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {redirectNotice.description}
          </p>
        </div>
      </div>
    );
  }

  if (!hasStaffWorkspace || !canAccessCurrentPath) {
    return null;
  }

  return (
    <div className="h-dvh min-h-screen overflow-hidden bg-slate-100 p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex h-full min-h-0 min-w-0 gap-3">
        <aside
          className={`flex h-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_1px_3px_rgba(15,23,42,0.05)] backdrop-blur transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/95 ${
            open ? "w-72" : "w-20"
          }`}
        >
          <div className="shrink-0 border-b border-slate-200/80 px-4 py-4 dark:border-slate-800">
            {open ? (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-red-300">
                      <Shield className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight tracking-tight text-slate-950 whitespace-normal dark:text-slate-50">
                        {roleLabel}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {workspaceMeta.section}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(!open)}
                  className="h-10 w-10 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 text-red-500 dark:border-slate-800 dark:bg-slate-900 dark:text-red-300">
                  <Shield className="h-5 w-5" />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(!open)}
                  className="h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
                        aria-expanded={expanded}
                        className={`w-full flex items-center ${
                          open ? "justify-start gap-3 px-3" : "justify-center"
                        } rounded-xl py-3 text-sm font-medium transition-all ${
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
                            <span
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                active
                                  ? "border-white/15 bg-white/10 text-inherit dark:border-slate-700 dark:bg-slate-900/20"
                                  : expanded
                                    ? "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                    : "border-slate-200/80 bg-white/80 text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  active
                                    ? "bg-white/80 dark:bg-slate-200"
                                    : expanded
                                      ? "bg-emerald-500 dark:bg-emerald-400"
                                      : "bg-slate-300 dark:bg-slate-600"
                                }`}
                              />
                              <span>{item.submenu.length}</span>
                            </span>
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
                                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
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
                    } rounded-xl py-3 text-sm font-medium transition-all ${
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

          <div className="shrink-0 border-t border-slate-200/80 px-3 py-4 dark:border-slate-800">
            <div className={open ? "flex" : "flex justify-center"}>
              <Button
                type="button"
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`h-11 rounded-xl border border-red-400 bg-red-200 font-semibold text-red-900 transition-colors hover:bg-red-300 hover:text-red-950 dark:border-red-900 dark:bg-red-950/70 dark:text-red-50 dark:hover:bg-red-950/90 ${
                  open ? "w-full justify-center gap-2 px-3" : "w-11 px-0"
                }`}
                title={!open ? "Logout" : ""}
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {open && (
                  <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
                )}
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.2),transparent_36%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.94))] dark:bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.48),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(2,6,23,0.95))]">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3">
            <header className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex items-start justify-between gap-4 px-6 py-5">
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

                  <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 md:flex">
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

            <main className="min-w-0 pb-3">
              <div className="flex flex-col gap-6 px-1 py-1">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
