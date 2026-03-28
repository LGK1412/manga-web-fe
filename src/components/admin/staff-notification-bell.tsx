"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";
import { Bell, Loader2 } from "lucide-react";
import { onMessage } from "firebase/messaging";

import { messaging } from "@/lib/firebase";
import { isStaffInboxRole } from "@/lib/admin-workspace";
import { Button } from "@/components/ui/button";

type StaffUser = {
  user_id?: string;
  role?: string;
};

type NotificationSummary = {
  _id: string;
  is_read: boolean;
};

export function StaffNotificationBell() {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const decoded = decodeURIComponent(raw);
      setUser(JSON.parse(decoded));
    } catch {
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.user_id || !isStaffInboxRole(user.role)) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchUnread = async () => {
      try {
        setLoading(true);
        const response = await axios.get<NotificationSummary[]>(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notification/me`,
          { withCredentials: true },
        );

        const unread = (response.data ?? []).filter((item) => !item.is_read).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnread();

    const handleFocus = () => {
      fetchUnread();
    };

    const unsubscribe =
      messaging && user?.user_id
        ? onMessage(messaging, () => {
            fetchUnread();
          })
        : undefined;

    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe?.();
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.role, user?.user_id]);

  if (!isStaffInboxRole(user?.role)) {
    return null;
  }

  return (
    <Button
      asChild
      variant="ghost"
      className="relative h-11 rounded-2xl border border-slate-200 bg-white px-3 text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
    >
      <Link href="/admin/my-notifications" className="flex items-center gap-2">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>

        <span className="hidden text-sm font-medium sm:inline">Inbox</span>
      </Link>
    </Button>
  );
}
