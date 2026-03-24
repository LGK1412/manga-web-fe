"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "../adminLayout/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationTable } from "@/components/notifications/notification-table";
import { NotificationFilters } from "@/components/notifications/notification-filters";
import { NotificationModal } from "@/components/notifications/notification-modal";
import {
  Bell,
  BellDot,
  BookmarkCheck,
  CheckCheck,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import type {
  BackendNotification,
  NotificationOverview,
  NotificationVM,
  SavedFilter,
  SortFilter,
  StatusFilter,
} from "@/types/notification";
import { mapToVM } from "@/types/notification";

const API = process.env.NEXT_PUBLIC_API_URL!;
const PAGE_SIZE = 10;

async function safeJson(resp: Response) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

async function logFetchError(tag: string, url: string, resp: Response) {
  const data = await safeJson(resp);

  console.group(`${tag} ERROR FULL`);
  console.log("url:", url);
  console.log("status:", resp.status);
  console.log("statusText:", resp.statusText);
  console.log("data:", data);
  console.log("data (stringify):", JSON.stringify(data, null, 2));
  console.groupEnd();

  return data;
}

function StatsCard({
  title,
  value,
  icon,
  accent,
  hint,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
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

function NotificationsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="animate-pulse">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="mt-4 h-8 w-20 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-36 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="h-11 rounded-xl bg-slate-200 lg:col-span-5" />
            <div className="h-11 rounded-xl bg-slate-200 lg:col-span-2" />
            <div className="h-11 rounded-xl bg-slate-200 lg:col-span-2" />
            <div className="h-11 rounded-xl bg-slate-200 lg:col-span-2" />
            <div className="h-11 rounded-xl bg-slate-200 lg:col-span-1" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="animate-pulse space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-3 rounded-xl border border-slate-100 p-4"
            >
              <div className="col-span-3 h-5 rounded bg-slate-200" />
              <div className="col-span-3 h-5 rounded bg-slate-100" />
              <div className="col-span-2 h-5 rounded bg-slate-100" />
              <div className="col-span-2 h-5 rounded bg-slate-100" />
              <div className="col-span-2 h-5 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationVM[]>([]);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationVM | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationVM | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    status: StatusFilter;
    saved: SavedFilter;
    search: string;
    sort: SortFilter;
  }>({
    status: "All",
    saved: "All",
    search: "",
    sort: "Newest",
  });

  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [overview, setOverview] = useState<NotificationOverview>({
    total: 0,
    read: 0,
    unread: 0,
    saved: 0,
  });

  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  const fetchOverview = useCallback(async () => {
    try {
      const statsUrl = `${API}/api/admin/notifications/stats`;
      const sentUrl = `${API}/api/admin/notifications/sent`;

      const [statsResp, sentResp] = await Promise.all([
        fetch(statsUrl, { credentials: "include" }),
        fetch(sentUrl, { credentials: "include" }),
      ]);

      let total = 0;
      let read = 0;
      let unread = 0;
      let saved = 0;

      if (statsResp.ok) {
        const statsData = await statsResp.json();
        total = Number(statsData?.total ?? 0);
        read = Number(statsData?.read ?? 0);
        unread = Number(statsData?.unread ?? 0);
      } else {
        await logFetchError("[Admin Noti Overview Stats]", statsUrl, statsResp);
      }

      if (sentResp.ok) {
        const sentData: BackendNotification[] = await sentResp.json();
        saved = (sentData ?? []).filter((item) => item.is_save).length;

        if (!statsResp.ok) {
          total = sentData.length;
          unread = sentData.filter((item) => !item.is_read).length;
          read = total - unread;
        }
      } else {
        await logFetchError("[Admin Noti Overview Saved]", sentUrl, sentResp);
      }

      setOverview({ total, read, unread, saved });
    } catch (e) {
      console.error("[Admin Noti Overview] Network error:", e);
    }
  }, []);

  const fetchUsersMap = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/api/user/all`, { credentials: "include" });
      if (!resp.ok) return;

      const users = await resp.json();
      const map: Record<string, string> = {};

      for (const u of users || []) {
        if (u?._id && u?.email) map[u._id] = u.email;
      }

      setUsersMap(map);
    } catch (e) {
      console.error("[Admin UsersMap] Network error:", e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const url = new URL(`${API}/api/admin/notifications/sent`);
      if (filters.status !== "All") url.searchParams.set("status", filters.status);
      if (filters.search) url.searchParams.set("q", filters.search);

      const resp = await fetch(url.toString(), { credentials: "include" });

      if (!resp.ok) {
        const data = await logFetchError(
          "[Admin Fetch Notifications]",
          url.toString(),
          resp
        );
        toast.error(data?.message ?? "Failed to load notifications.");
        setNotifications([]);
        return;
      }

      const data: BackendNotification[] = await resp.json();
      setNotifications((data ?? []).map(mapToVM));
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications (network error).");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status]);

  useEffect(() => {
    fetchUsersMap();
    fetchOverview();
  }, [fetchUsersMap, fetchOverview]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        const nextSearch = searchInput.trim();
        if (prev.search === nextSearch) return prev;
        return { ...prev, search: nextSearch };
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.saved, filters.search, filters.sort]);

  const processedNotifications = useMemo(() => {
    let list = [...notifications];

    if (filters.saved === "Saved") {
      list = list.filter((item) => item.is_save);
    }

    if (filters.saved === "Unsaved") {
      list = list.filter((item) => !item.is_save);
    }

    switch (filters.sort) {
      case "Oldest":
        list.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "Title A-Z":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "Title Z-A":
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "Newest":
      default:
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return list;
  }, [notifications, filters.saved, filters.sort]);

  const totalItems = processedNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedNotifications = processedNotifications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const refetchAll = async () => {
    await Promise.all([fetchNotifications(), fetchOverview(), fetchUsersMap()]);
  };

  const handleViewDetail = (notification: NotificationVM) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const handleMarkAsRead = async (id: string, receiver_id?: string) => {
    const current = notifications.find((n) => n._id === id);
    if (!current || current.status === "Read") return;

    try {
      setBusyId(id);

      const url = `${API}/api/admin/notifications/${id}/mark-as-read`;
      const resp = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ receiver_id }),
      });

      if (!resp.ok) {
        const data = await logFetchError("[Admin Mark Noti As Read]", url, resp);
        toast.error(data?.message ?? "Failed to update notification status.");
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, status: "Read" } : n))
      );

      setSelectedNotification((prev) =>
        prev && prev._id === id ? { ...prev, status: "Read" } : prev
      );

      setOverview((prev) => ({
        ...prev,
        unread: Math.max(prev.unread - 1, 0),
        read: prev.read + 1,
      }));

      toast.success("Notification marked as read.");
    } catch (error) {
      console.error("Failed to update notification:", error);
      toast.error("Failed to update notification (network error).");
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (notification: NotificationVM) => {
    try {
      setBusyId(notification._id);

      const url = `${API}/api/admin/notifications/send`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: notification.title,
          body: notification.body,
          receiver_id: notification.receiver_id,
        }),
      });

      if (!resp.ok) {
        const data = await logFetchError("[Admin Resend Notification]", url, resp);
        toast.error(data?.message ?? "Failed to resend notification.");
        return;
      }

      toast.success("Notification resent successfully.");
      await Promise.all([fetchNotifications(), fetchOverview()]);
    } catch (error) {
      console.error("Failed to resend notification:", error);
      toast.error("Failed to resend notification (network error).");
    } finally {
      setBusyId(null);
    }
  };

  const askDelete = (notification: NotificationVM) => {
    setDeleteTarget(notification);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { _id, receiver_id, status, is_save } = deleteTarget;
    const url = `${API}/api/admin/notifications/${_id}`;

    try {
      setBusyId(_id);

      const resp = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ receiver_id }),
      });

      if (!resp.ok) {
        const data = await logFetchError("[Admin Delete Notification]", url, resp);
        toast.error(data?.message ?? "Failed to delete notification.");
        return;
      }

      toast.success("Notification deleted.");

      setNotifications((prev) => prev.filter((n) => n._id !== _id));

      setOverview((prev) => ({
        total: Math.max(prev.total - 1, 0),
        read: status === "Read" ? Math.max(prev.read - 1, 0) : prev.read,
        unread: status === "Unread" ? Math.max(prev.unread - 1, 0) : prev.unread,
        saved: is_save ? Math.max(prev.saved - 1, 0) : prev.saved,
      }));

      if (selectedNotification?._id === _id) {
        setSelectedNotification(null);
        setIsModalOpen(false);
      }

      setDeleteTarget(null);
    } catch (e) {
      console.error("Delete failed:", e);
      toast.error("Failed to delete notification (network error).");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSave = async (id: string, receiver_id: string) => {
    const current = notifications.find((n) => n._id === id);
    if (!current) return;

    const url = `${API}/api/admin/notifications/${id}/toggle-save`;

    try {
      setBusyId(id);

      const resp = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ receiver_id }),
      });

      if (!resp.ok) {
        const data = await logFetchError("[Admin Toggle Save Noti]", url, resp);
        toast.error(data?.message ?? "Failed to toggle saved state.");
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_save: !n.is_save } : n))
      );

      setSelectedNotification((prev) =>
        prev && prev._id === id ? { ...prev, is_save: !prev.is_save } : prev
      );

      setOverview((prev) => ({
        ...prev,
        saved: current.is_save ? Math.max(prev.saved - 1, 0) : prev.saved + 1,
      }));

      toast.success(current.is_save ? "Removed from saved." : "Saved successfully.");
    } catch (e) {
      console.error("Toggle save failed:", e);
      toast.error("Failed to toggle saved state (network error).");
    } finally {
      setBusyId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setFilters({
      status: "All",
      saved: "All",
      search: "",
      sort: "Newest",
    });
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Admin</span>
          <span>/</span>
          <span>Notifications</span>
          <span>/</span>
          <span className="font-medium text-slate-900">Sent Notifications</span>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <BellDot className="h-3.5 w-3.5" />
                Admin delivery management
              </div>

              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
                  <Bell className="h-6 w-6" />
                </span>
                Sent Notifications
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Review delivery activity, monitor unread notifications, quickly
                resend important messages, and keep high-priority items saved for follow-up.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link href="/admin/notifications/send-general">
                <Button className="h-11 rounded-xl bg-blue-600 px-5 font-medium shadow-sm hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Send Notification
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Total Notifications"
            value={overview.total}
            hint="All sent records"
            accent="bg-slate-100 text-slate-700"
            icon={<Bell className="h-5 w-5" />}
          />
          <StatsCard
            title="Unread"
            value={overview.unread}
            hint="Need attention first"
            accent="bg-blue-50 text-blue-600"
            icon={<BellDot className="h-5 w-5" />}
          />
          <StatsCard
            title="Read"
            value={overview.read}
            hint="Already opened by users"
            accent="bg-emerald-50 text-emerald-600"
            icon={<CheckCheck className="h-5 w-5" />}
          />
          <StatsCard
            title="Saved"
            value={overview.saved}
            hint="Bookmarked by admin"
            accent="bg-amber-50 text-amber-600"
            icon={<BookmarkCheck className="h-5 w-5" />}
          />
        </div>

        <NotificationFilters
          resultCount={totalItems}
          searchValue={searchInput}
          statusValue={filters.status}
          savedValue={filters.saved}
          sortValue={filters.sort}
          onSearchChange={setSearchInput}
          onStatusChange={(status) =>
            setFilters((prev) => ({ ...prev, status }))
          }
          onSavedChange={(saved) =>
            setFilters((prev) => ({ ...prev, saved }))
          }
          onSortChange={(sort) =>
            setFilters((prev) => ({ ...prev, sort }))
          }
          onReset={handleResetFilters}
        />

        {loading ? (
          <NotificationsLoadingSkeleton />
        ) : (
          <NotificationTable
            notifications={paginatedNotifications}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onViewDetail={handleViewDetail}
            onMarkAsRead={handleMarkAsRead}
            onDeleteRequest={askDelete}
            onToggleSave={handleToggleSave}
            onResend={handleResend}
            usersMap={usersMap}
            busyId={busyId}
          />
        )}

        <NotificationModal
          notification={selectedNotification}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onMarkAsRead={handleMarkAsRead}
          onResend={handleResend}
          onToggleSave={handleToggleSave}
          onDeleteRequest={askDelete}
          usersMap={usersMap}
          busyId={busyId}
        />

        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent className="max-w-md rounded-2xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                Delete notification?
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                This action will permanently remove the selected notification from the admin list.
                You cannot undo this action.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">{deleteTarget?.title}</p>
              <p className="mt-1 line-clamp-2 text-red-600">{deleteTarget?.body}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200"
                onClick={() => setDeleteTarget(null)}
                disabled={busyId === deleteTarget?._id}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDelete}
                disabled={busyId === deleteTarget?._id}
              >
                {busyId === deleteTarget?._id ? "Deleting..." : "Delete notification"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}