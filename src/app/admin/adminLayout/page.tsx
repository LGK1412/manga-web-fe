"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  formatWorkspaceRole,
  isStaffInboxRole,
  resolveAdminWorkspaceMeta,
} from "@/lib/admin-workspace";
import { useAuth } from "@/lib/auth-context";
import { removeCookie } from "@/lib/cookie-func";
import { AdminContentShell } from "./components/admin-content-shell";
import { AdminSidebar } from "./components/admin-sidebar";
import {
  INITIAL_EXPANDED_GROUPS,
  ROLE_TOOL_LABEL,
  menuItems,
} from "./menu";
import type { GroupItem, SubmenuItem } from "./types";
import {
  canAccessMenuPath,
  getFirstWorkspaceHref,
  getVisibleMenuItems,
  isSubmenuItemActive,
  normalizeRole,
} from "./utils";

const REDIRECT_DELAY_MS = 100;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, isLogin, user, setLoginStatus } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    INITIAL_EXPANDED_GROUPS,
  );
  const hasRedirectedRef = useRef(false);
  const intentionalLogoutRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const currentRole = useMemo(() => normalizeRole(user?.role), [user]);
  const loadingRole = !isReady;
  const visibleMenuItems = useMemo(
    () => getVisibleMenuItems(currentRole, menuItems),
    [currentRole],
  );

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

  const hasStaffWorkspace =
    isLogin && !!currentRole && visibleMenuItems.length > 0;
  const toolTitle = currentRole ? ROLE_TOOL_LABEL[currentRole] : "Staff Tool";
  const roleLabel = formatWorkspaceRole(currentRole);
  const workspaceMeta = useMemo(
    () => resolveAdminWorkspaceMeta(pathname),
    [pathname],
  );
  const canShowStaffInboxBell = isStaffInboxRole(currentRole);

  const isSubmenuActive = useCallback(
    (submenu: SubmenuItem) => isSubmenuItemActive(pathname, submenu),
    [pathname],
  );

  const isGroupActive = useCallback(
    (group: GroupItem) => group.submenu.some((sub) => isSubmenuActive(sub)),
    [isSubmenuActive],
  );

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
  }, [isGroupActive, visibleMenuItems]);

  useEffect(() => {
    if (loadingRole || hasRedirectedRef.current || intentionalLogoutRef.current) {
      return;
    }

    if (!isLogin) {
      hasRedirectedRef.current = true;
      redirectTimerRef.current = setTimeout(() => {
        router.replace("/login");
      }, REDIRECT_DELAY_MS);
      return;
    }

    if (!canAccessCurrentPath) {
      hasRedirectedRef.current = true;
      redirectTimerRef.current = setTimeout(() => {
        router.replace(fallbackWorkspaceHref);
      }, REDIRECT_DELAY_MS);
    }
  }, [
    canAccessCurrentPath,
    fallbackWorkspaceHref,
    isLogin,
    loadingRole,
    router,
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
    if (isLoggingOut || !apiUrl) return;

    setIsLoggingOut(true);

    try {
      const res = await axios.post(
        `${apiUrl}/api/auth/logout`,
        {},
        { withCredentials: true },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Unexpected error");
      }

      intentionalLogoutRef.current = true;
      clearPendingRedirect();
      await removeCookie();
      setLoginStatus(false);
      router.replace("/login");
    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? error.response?.data?.message || error.message
          : error instanceof Error
            ? error.message
            : "Unexpected error";

      toast({
        title: "Logout failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const clearPendingRedirect = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  };

  if (!hasStaffWorkspace || !canAccessCurrentPath) {
    return null;
  }

  return (
    <div className="h-dvh min-h-screen overflow-hidden bg-slate-100 p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex h-full min-h-0 min-w-0 gap-3">
        <AdminSidebar
          currentRoleFound={!!currentRole}
          expandedGroups={expandedGroups}
          isGroupActive={isGroupActive}
          isLoggingOut={isLoggingOut}
          isOpen={open}
          isSubmenuActive={isSubmenuActive}
          loadingRole={loadingRole}
          onLogout={handleLogout}
          pathname={pathname}
          roleLabel={roleLabel}
          sectionLabel={workspaceMeta.section}
          toggleGroup={toggleGroup}
          toggleSidebar={() => setOpen((current) => !current)}
          visibleMenuItems={visibleMenuItems}
        />

        <AdminContentShell
          canShowStaffInboxBell={canShowStaffInboxBell}
          roleLabel={roleLabel}
          toolTitle={toolTitle}
          workspaceMeta={workspaceMeta}
        >
          {children}
        </AdminContentShell>
      </div>
    </div>
  );
}
