"use client";

import { SidebarBrand } from "./sidebar-brand";
import { SidebarLogout } from "./sidebar-logout";
import { SidebarMenu } from "./sidebar-menu";
import type { GroupItem, MenuItem, SubmenuItem } from "../types";

type AdminSidebarProps = {
  currentRoleFound: boolean;
  expandedGroups: Record<string, boolean>;
  isGroupActive: (group: GroupItem) => boolean;
  isLoggingOut: boolean;
  isOpen: boolean;
  isSubmenuActive: (submenu: SubmenuItem) => boolean;
  loadingRole: boolean;
  onLogout: () => void;
  pathname: string;
  roleLabel: string;
  sectionLabel: string;
  toggleGroup: (groupId: string) => void;
  toggleSidebar: () => void;
  visibleMenuItems: MenuItem[];
};

export function AdminSidebar({
  currentRoleFound,
  expandedGroups,
  isGroupActive,
  isLoggingOut,
  isOpen,
  isSubmenuActive,
  loadingRole,
  onLogout,
  pathname,
  roleLabel,
  sectionLabel,
  toggleGroup,
  toggleSidebar,
  visibleMenuItems,
}: AdminSidebarProps) {
  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_1px_3px_rgba(15,23,42,0.05)] backdrop-blur transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/95 ${
        isOpen ? "w-72" : "w-20"
      }`}
    >
      <SidebarBrand
        isOpen={isOpen}
        roleLabel={roleLabel}
        sectionLabel={sectionLabel}
        toggleSidebar={toggleSidebar}
      />

      <SidebarMenu
        currentRoleFound={currentRoleFound}
        expandedGroups={expandedGroups}
        isGroupActive={isGroupActive}
        isOpen={isOpen}
        isSubmenuActive={isSubmenuActive}
        loadingRole={loadingRole}
        pathname={pathname}
        toggleGroup={toggleGroup}
        visibleMenuItems={visibleMenuItems}
      />

      <SidebarLogout
        isLoggingOut={isLoggingOut}
        isOpen={isOpen}
        onLogout={onLogout}
      />
    </aside>
  );
}
