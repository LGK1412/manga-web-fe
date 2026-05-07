import { ROLE_MENU_ACCESS } from "./menu";
import type { MenuItem, Role, SubmenuItem } from "./types";

export function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function normalizeRole(role: string | null | undefined): Role | null {
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

export function getVisibleMenuItems(role: Role | null, items: MenuItem[]) {
  if (!role) return [];
  const allowedIds = new Set(ROLE_MENU_ACCESS[role] || []);
  return items.filter((item) => allowedIds.has(item.id));
}

export function isSubmenuItemActive(
  pathname: string,
  submenu: SubmenuItem,
) {
  if (pathname === submenu.href) return true;

  if (submenu.matchPrefixes?.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return false;
}

export function canAccessMenuPath(item: MenuItem, pathname: string) {
  if (item.kind === "link") {
    return isPathActive(pathname, item.href);
  }

  return item.submenu.some((sub) => {
    if (isPathActive(pathname, sub.href)) {
      return true;
    }

    return !!sub.matchPrefixes?.some((prefix) => pathname.startsWith(prefix));
  });
}

export function getFirstWorkspaceHref(items: MenuItem[]) {
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
