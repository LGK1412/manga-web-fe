"use client";

import React, { useEffect, useState } from "react";
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
  DotSquare as LogSquare,
  CheckCircle2,
  ListTodo,
  PanelRight,
  Banknote,
  FileCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useTheme } from "next-themes";

/** ===== Types ===== */
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
    kind: "link",
    id: "genres",
    label: "Genre",
    icon: Tags,
    href: "/admin/genre",
  },
  {
    kind: "link",
    id: "styles",
    label: "Style",
    icon: Palette,
    href: "/admin/style",
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
    kind: "link",
    id: "announcements",
    label: "Notification",
    icon: Megaphone,
    href: "/admin/notifications",
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
  // {
  //   kind: "link",
  //   id: "logs",
  //   label: "Logs",
  //   icon: LogSquare,
  //   href: "/admin/logs",
  // },
  {
    kind: "group",
    id: "moderation",
    label: "Moderation",
    icon: CheckCircle2,
    submenu: [
      { label: "Queue", href: "/admin/moderation/queue", icon: ListTodo },
      // {
      //   label: "Workspace",
      //   href: "/admin/moderation/workspace",
      //   icon: PanelRight,
      // },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const { theme } = useTheme();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // safe hover class (no mismatch)
  const hoverClass = mounted
    ? theme === "dark"
      ? "hover:bg-gray-100 hover:text-black"
      : "hover:bg-gray-300"
    : "hover:bg-gray-300"; // stable SSR fallback

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside
          className={`shadow-lg border-r transition-all duration-300 ${
            open ? "w-64" : "w-16"
          } flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            {open && (
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                <span className="font-bold text-lg">Admin Tool</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(!open)}
              className="hover:bg-red-50 hover:text-red-600"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              if (item.kind === "group") {
                return (
                  <div key={item.id} className="space-y-1">
                    <div
                      className={`flex items-center ${
                        open ? "gap-3 px-3 justify-start" : "justify-center"
                      } py-2 rounded-lg text-sm font-medium`}
                      title={!open ? item.label : ""}
                    >
                      <Icon
                        className={`${open ? "h-5 w-5" : "h-6 w-6"} shrink-0`}
                      />
                      {open && <span>{item.label}</span>}
                    </div>

                    {open && (
                      <div className="ml-8 space-y-1">
                        {item.submenu.map((s) => {
                          const active = pathname === s.href;
                          const SubIcon = s.icon;

                          return (
                            <Link
                              key={s.href}
                              href={s.href}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm 
                                ${
                                  active
                                    ? "bg-blue-50 text-blue-700"
                                    : hoverClass
                                }`}
                            >
                              {SubIcon && (
                                <SubIcon className="h-4 w-4 shrink-0" />
                              )}
                              <span>{s.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // link item
              const active = pathname === item.href;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center ${
                    open ? "gap-3 px-3 justify-start" : "justify-center"
                  } py-2 rounded-lg text-sm font-medium transition-colors
                    ${active ? "bg-blue-100 text-blue-700" : hoverClass}`}
                  title={!open ? item.label : ""}
                >
                  <Icon
                    className={`${open ? "h-5 w-5" : "h-6 w-6"} shrink-0`}
                  />
                  {open && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
