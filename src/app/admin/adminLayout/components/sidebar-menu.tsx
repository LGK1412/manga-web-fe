"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { GroupItem, MenuItem, SubmenuItem } from "../types";
import { isPathActive } from "../utils";

type SidebarMenuProps = {
  currentRoleFound: boolean;
  expandedGroups: Record<string, boolean>;
  isGroupActive: (group: GroupItem) => boolean;
  isOpen: boolean;
  isSubmenuActive: (submenu: SubmenuItem) => boolean;
  loadingRole: boolean;
  pathname: string;
  toggleGroup: (groupId: string) => void;
  visibleMenuItems: MenuItem[];
};

const itemIdleClass =
  "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
const itemActiveClass =
  "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950";
const subItemActiveClass =
  "border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";

export function SidebarMenu({
  currentRoleFound,
  expandedGroups,
  isGroupActive,
  isOpen,
  isSubmenuActive,
  loadingRole,
  pathname,
  toggleGroup,
  visibleMenuItems,
}: SidebarMenuProps) {
  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <SidebarMenuState
        currentRoleFound={currentRoleFound}
        loadingRole={loadingRole}
        visibleMenuItems={visibleMenuItems}
      />

      {!loadingRole &&
        currentRoleFound &&
        visibleMenuItems.map((item) => (
          <SidebarMenuItem
            key={item.id}
            expandedGroups={expandedGroups}
            isGroupActive={isGroupActive}
            isOpen={isOpen}
            isSubmenuActive={isSubmenuActive}
            item={item}
            pathname={pathname}
            toggleGroup={toggleGroup}
          />
        ))}
    </nav>
  );
}

function SidebarMenuState({
  currentRoleFound,
  loadingRole,
  visibleMenuItems,
}: {
  currentRoleFound: boolean;
  loadingRole: boolean;
  visibleMenuItems: MenuItem[];
}) {
  if (loadingRole) return <SidebarMessage>Loading role...</SidebarMessage>;
  if (!currentRoleFound) return <SidebarMessage>No role found</SidebarMessage>;

  if (visibleMenuItems.length === 0) {
    return <SidebarMessage>No menu available for this role</SidebarMessage>;
  }

  return null;
}

function SidebarMessage({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
      {children}
    </div>
  );
}

function SidebarMenuItem({
  expandedGroups,
  isGroupActive,
  isOpen,
  isSubmenuActive,
  item,
  pathname,
  toggleGroup,
}: {
  expandedGroups: Record<string, boolean>;
  isGroupActive: (group: GroupItem) => boolean;
  isOpen: boolean;
  isSubmenuActive: (submenu: SubmenuItem) => boolean;
  item: MenuItem;
  pathname: string;
  toggleGroup: (groupId: string) => void;
}) {
  if (item.kind === "group") {
    return (
      <SidebarGroupItem
        expanded={!!expandedGroups[item.id]}
        isActive={isGroupActive(item)}
        isOpen={isOpen}
        isSubmenuActive={isSubmenuActive}
        item={item}
        toggleGroup={toggleGroup}
      />
    );
  }

  const Icon = item.icon;
  const active = isPathActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={`flex items-center ${
        isOpen ? "justify-start gap-3 px-3" : "justify-center"
      } rounded-xl py-3 text-sm font-medium transition-all ${
        active ? itemActiveClass : itemIdleClass
      }`}
      title={!isOpen ? item.label : ""}
    >
      <Icon className={`${isOpen ? "h-5 w-5" : "h-6 w-6"} shrink-0`} />
      {isOpen && <span>{item.label}</span>}
    </Link>
  );
}

function SidebarGroupItem({
  expanded,
  isActive,
  isOpen,
  isSubmenuActive,
  item,
  toggleGroup,
}: {
  expanded: boolean;
  isActive: boolean;
  isOpen: boolean;
  isSubmenuActive: (submenu: SubmenuItem) => boolean;
  item: GroupItem;
  toggleGroup: (groupId: string) => void;
}) {
  const Icon = item.icon;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => toggleGroup(item.id)}
        aria-expanded={expanded}
        className={`w-full flex items-center ${
          isOpen ? "justify-start gap-3 px-3" : "justify-center"
        } rounded-xl py-3 text-sm font-medium transition-all ${
          isActive ? itemActiveClass : itemIdleClass
        }`}
        title={!isOpen ? item.label : ""}
      >
        <Icon className={`${isOpen ? "h-5 w-5" : "h-6 w-6"} shrink-0`} />

        {isOpen && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <GroupCountBadge
              active={isActive}
              count={item.submenu.length}
              expanded={expanded}
            />
          </>
        )}
      </button>

      {isOpen && expanded && (
        <div className="ml-6 space-y-1 border-l border-slate-200/80 pl-4 dark:border-slate-800">
          {item.submenu.map((sub) => (
            <SidebarSubmenuLink
              key={sub.href}
              isActive={isSubmenuActive(sub)}
              submenu={sub}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCountBadge({
  active,
  count,
  expanded,
}: {
  active: boolean;
  count: number;
  expanded: boolean;
}) {
  return (
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
      <span>{count}</span>
    </span>
  );
}

function SidebarSubmenuLink({
  isActive,
  submenu,
}: {
  isActive: boolean;
  submenu: SubmenuItem;
}) {
  const SubIcon = submenu.icon;

  return (
    <Link
      href={submenu.href}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        isActive ? subItemActiveClass : itemIdleClass
      }`}
    >
      {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
      <span>{submenu.label}</span>
    </Link>
  );
}
