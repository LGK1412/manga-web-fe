"use client";

import type React from "react";

import { useState } from "react";
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
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      href: "/admin/dashboard",
    },
    { id: "users", label: "User", icon: Users, href: "/admin/user" },
    { id: "genres", label: "Genre", icon: Tags, href: "/admin/genre" },
    { id: "styles", label: "Style", icon: Palette, href: "/admin/style" },
    {
      id: "reports",
      label: "Report",
      icon: FileWarning,
      href: "/admin/report",
    },
    {
      id: "announcements",
      label: "Notification",
      icon: Megaphone,
      href: "/admin/announcements",
    },
    {
      id: "withdraws",
      label: "Withdraw",
      icon: Banknote,
      href: "/admin/withdraw",
    },
    {
      id: "settings",
      label: "Setting",
      icon: Settings,
      href: "/admin/settings",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-16"
          } bg-white shadow-lg transition-all duration-300 flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center space-x-2">
                  <Shield className="h-8 w-8 text-red-600" />
                  <span className="text-xl font-bold text-gray-800">
                    Admin Tool
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:text-red-600 hover:bg-red-50"
              >
                {sidebarOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      title={!sidebarOpen ? item.label : ""}
                      className={`flex items-center ${
                        sidebarOpen
                          ? "space-x-3 px-3 justify-start"
                          : "justify-center"
                      } py-2 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon
                        className={`${
                          sidebarOpen ? "h-5 w-5" : "h-6 w-6"
                        } shrink-0`}
                      />
                      {sidebarOpen && (
                        <span className="font-medium">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
