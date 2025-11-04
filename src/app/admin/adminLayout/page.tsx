"use client";

import React, { useState } from "react";
import {
  Menu,
  BookOpen,
  Users,
  Megaphone,
  FileWarning,
  Settings,
  BarChart3,
  X,
  Tags,
  Palette,
  Shield,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, href: "/admin/dashboard" },
    { id: "users", label: "User", icon: Users, href: "/admin/user" },
    { id: "genres", label: "Genre", icon: Tags, href: "/admin/genre" },
    { id: "styles", label: "Style", icon: Palette, href: "/admin/style" },
    { id: "reports", label: "Report", icon: FileWarning, href: "/admin/report",},
    { id: "comments", label: "Comment", icon: MessageSquare, href: "/admin/comments" },
    { id: "announcements", label: "Notification", icon: Megaphone, href: "/admin/notifications",},
    { id: "policies", label: "Policies", icon: BookOpen, href: "/admin/policies" },
    { id: "settings", label: "Setting", icon: Settings, href: "/admin/settings",},
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside
          className={`bg-white shadow-lg border-r transition-all duration-300 ${
            open ? "w-64" : "w-16"
          } flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            {open && (
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                <span className="font-bold text-gray-800 text-lg">Admin Tool</span>
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
            {menuItems.map(({ id, label, icon: Icon, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={id}
                  href={href}
                  className={`flex items-center ${
                    open ? "gap-3 px-3 justify-start" : "justify-center"
                  } py-2 rounded-lg text-sm font-medium transition-colors
                  ${active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
                  title={!open ? label : ""}
                >
                  <Icon className={`${open ? "h-5 w-5" : "h-6 w-6"} shrink-0`} />
                  {open && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
