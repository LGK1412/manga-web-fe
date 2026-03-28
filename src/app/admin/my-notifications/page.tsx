"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Bell,
  BellDot,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  CheckCheck,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";

import AdminLayout from "../adminLayout/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type NotificationItem = {
  _id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  body: string;
  is_read: boolean;
  is_save: boolean;
  createdAt: string;
  updatedAt: string;
};

type Me = {
  user_id?: string;
  username?: string;
  role?: string;
};

type InboxFilter = "all" | "unread" | "saved";

function StatsCard({
  title,
  value,
  hint,
  accent,
  icon,
}: {
  title: string;
  value: number;
  hint: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          </div>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white text-blue-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function AdminMyNotificationsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [me, setMe] = useState<Me | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) {
      setMe(null);
      setLoading(false);
      setError("Unable to identify the current staff account.");
      return;
    }

    try {
      const decoded = decodeURIComponent(raw);
      setMe(JSON.parse(decoded));
    } catch {
      setMe(null);
      setLoading(false);
      setError("Unable to read current staff information.");
    }
  }, []);

  useEffect(() => {
    if (!API || !me?.user_id) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get<NotificationItem[]>(
          `${API}/api/notification/get-all-noti-for-user/${me.user_id}`,
          { withCredentials: true },
        );

        const sorted = [...(response.data ?? [])].sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        );

        setNotifications(sorted);
      } catch (error: any) {
        const message =
          error?.response?.data?.message || "Failed to load notifications.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [API, me?.user_id]);

  const overview = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((item) => !item.is_read).length;
    const saved = notifications.filter((item) => item.is_save).length;
    const read = total - unread;

    return { total, unread, saved, read };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.body.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "unread" && !item.is_read) ||
        (activeFilter === "saved" && item.is_save);

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, notifications, search]);

  const markAsRead = async (notificationId: string) => {
    if (!API) return;

    try {
      setBusyAction(`read:${notificationId}`);
      await axios.patch(
        `${API}/api/notification/mark-noti-as-read/${notificationId}`,
        {},
        { withCredentials: true },
      );

      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
    } catch {
      toast.error("Failed to mark notification as read.");
    } finally {
      setBusyAction(null);
    }
  };

  const markAllAsRead = async () => {
    if (!API || overview.unread === 0) return;

    try {
      setBusyAction("mark-all");
      await axios.patch(
        `${API}/api/notification/mark-all-noti-as-read/`,
        {},
        { withCredentials: true },
      );

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      );
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all notifications as read.");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleSave = async (notificationId: string) => {
    if (!API) return;

    try {
      setBusyAction(`save:${notificationId}`);
      await axios.patch(
        `${API}/api/notification/save-noti/${notificationId}`,
        {},
        { withCredentials: true },
      );

      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, is_save: !item.is_save, is_read: true }
            : item,
        ),
      );
    } catch {
      toast.error("Failed to update saved state.");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!API) return;

    try {
      setBusyAction(`delete:${notificationId}`);
      await axios.delete(
        `${API}/api/notification/delete-noti/${notificationId}`,
        { withCredentials: true },
      );

      setNotifications((current) =>
        current.filter((item) => item._id !== notificationId),
      );
      toast.success("Notification deleted.");
    } catch {
      toast.error("Failed to delete notification.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400" />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <BellDot className="h-3.5 w-3.5" />
                Personal staff notifications
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Inbox for {me?.username || "your staff account"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Review admin updates sent directly to you, keep important items saved,
                and clear unread work before it stacks up.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-slate-200 px-5"
                disabled={busyAction === "mark-all" || overview.unread === 0}
                onClick={markAllAsRead}
              >
                {busyAction === "mark-all" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                Mark all as read
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Total Notifications"
            value={overview.total}
            hint="Everything sent to you"
            accent="bg-slate-100 text-slate-700"
            icon={<Bell className="h-5 w-5" />}
          />
          <StatsCard
            title="Unread"
            value={overview.unread}
            hint="Needs your attention"
            accent="bg-blue-50 text-blue-600"
            icon={<BellDot className="h-5 w-5" />}
          />
          <StatsCard
            title="Read"
            value={overview.read}
            hint="Already reviewed"
            accent="bg-emerald-50 text-emerald-600"
            icon={<CheckCheck className="h-5 w-5" />}
          />
          <StatsCard
            title="Saved"
            value={overview.saved}
            hint="Bookmarked for follow-up"
            accent="bg-amber-50 text-amber-600"
            icon={<BookmarkCheck className="h-5 w-5" />}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={activeFilter === "all"}
                label="All"
                count={overview.total}
                onClick={() => setActiveFilter("all")}
              />
              <FilterChip
                active={activeFilter === "unread"}
                label="Unread"
                count={overview.unread}
                onClick={() => setActiveFilter("unread")}
              />
              <FilterChip
                active={activeFilter === "saved"}
                label="Saved"
                count={overview.saved}
                onClick={() => setActiveFilter("saved")}
              />
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or message..."
                className="h-11 rounded-xl border-slate-200 pl-9"
              />
            </div>
          </div>
        </div>

        {error ? (
          <Card className="rounded-3xl border-red-200 bg-red-50/70 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Loading notifications...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <p className="text-sm font-medium text-slate-600">
                Showing {filteredNotifications.length} notification
                {filteredNotifications.length === 1 ? "" : "s"}
              </p>
            </div>

            {filteredNotifications.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Bell className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No notifications found
                </h2>
                <p className="max-w-md text-sm text-slate-500">
                  Try another search term or filter. When new staff alerts arrive,
                  they will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredNotifications.map((notification) => {
                  const isBusy =
                    busyAction === `read:${notification._id}` ||
                    busyAction === `save:${notification._id}` ||
                    busyAction === `delete:${notification._id}`;

                  return (
                    <div
                      key={notification._id}
                      className={`px-6 py-5 transition-colors ${
                        notification.is_read
                          ? "bg-white"
                          : "bg-blue-50/40"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {!notification.is_read && (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                                Unread
                              </span>
                            )}
                            {notification.is_save && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                                Saved
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>

                          <h2 className="mt-3 text-lg font-semibold text-slate-900">
                            {notification.title}
                          </h2>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {notification.body}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          {!notification.is_read && (
                            <Button
                              variant="outline"
                              className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              disabled={isBusy}
                              onClick={() => markAsRead(notification._id)}
                            >
                              {busyAction === `read:${notification._id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="mr-2 h-4 w-4" />
                              )}
                              Mark as read
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                            disabled={isBusy}
                            onClick={() => toggleSave(notification._id)}
                          >
                            {busyAction === `save:${notification._id}` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : notification.is_save ? (
                              <Bookmark className="mr-2 h-4 w-4" />
                            ) : (
                              <BookmarkPlus className="mr-2 h-4 w-4" />
                            )}
                            {notification.is_save ? "Saved" : "Save"}
                          </Button>

                          <Button
                            variant="outline"
                            className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            disabled={isBusy}
                            onClick={() => deleteNotification(notification._id)}
                          >
                            {busyAction === `delete:${notification._id}` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
