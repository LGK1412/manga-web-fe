import type { LucideIcon } from "lucide-react";

export type Role =
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

export type LinkItem = BaseItem & {
  kind: "link";
  href: string;
};

export type SubmenuItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  matchPrefixes?: string[];
};

export type GroupItem = BaseItem & {
  kind: "group";
  submenu: SubmenuItem[];
};

export type MenuItem = LinkItem | GroupItem;
