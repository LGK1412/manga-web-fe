"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "../adminLayout/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationTable } from "@/components/notifications/notification-table";
import { NotificationFilters } from "@/components/notifications/notification-filters";
import { NotificationModal } from "@/components/notifications/notification-modal";
import { NotificationCreateForm } from "@/components/notifications/notification-create-form";
import { Bell, Plus } from "lucide-react";
import { toast } from "sonner";

export interface BackendNotification {
  _id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  body: string;
  is_read: boolean;
  is_save: boolean;
  createdAt: string;
}

export interface NotificationVM {
  _id: string;
  title: string;
  body: string;
  status: "Unread" | "Read";
  createdAt: string;
  receiver_id: string;
  sender_id: string;
  is_save?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL!;

function mapToVM(n: BackendNotification): NotificationVM {
  return {
    _id: n._id,
    title: n.title,
    body: n.body,
    status: n.is_read ? "Read" : "Unread",
    createdAt: n.createdAt,
    receiver_id: n.receiver_id,
    sender_id: n.sender_id,
    is_save: n.is_save,
  };
}

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

export default function AdminNotificationsPage() {
  const searchParams = useSearchParams();

  const [notifications, setNotifications] = useState<NotificationVM[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationVM[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationVM | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ status: "All", search: "" });
  const [stats, setStats] = useState<{ total: number; read: number; unread: number } | null>(null);

  // ✅ id -> email map (for display)
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // ✅ NEW: email prefill from query
  const [prefillEmail, setPrefillEmail] = useState<string>("");

  // ✅ email -> id map (for sending notification)
  const emailToIdMap = useMemo(() => {
    const reversed: Record<string, string> = {};
    for (const [id, email] of Object.entries(usersMap)) {
      reversed[email.toLowerCase()] = id;
    }
    return reversed;
  }, [usersMap]);

  // ✅ NEW: check query receiverEmail => open create form + prefill
  useEffect(() => {
    const receiverEmail = searchParams.get("receiverEmail")?.trim() ?? "";
    if (receiverEmail) {
      console.log("[Admin Notifications] Prefill receiverEmail from query", receiverEmail);
      setPrefillEmail(receiverEmail);
      setIsFormOpen(true);
    }
  }, [searchParams]);

  const fetchStats = useCallback(async () => {
    try {
      const sResp = await fetch(`${API}/api/admin/notifications/stats`, {
        credentials: "include",
      });

      if (!sResp.ok) {
        await logFetchError("[Admin Noti Stats]", `${API}/api/admin/notifications/stats`, sResp);
        return;
      }

      const s = await sResp.json();
      setStats(s);
    } catch (e) {
      console.error("[Admin Noti Stats] Network error:", e);
    }
  }, []);

  const fetchUsersMap = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/api/user/all`, { credentials: "include" });
      if (!resp.ok) return;

      const users = await resp.json(); // [{ _id, email, ... }]
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
      if (filters.status !== "All") url.searchParams.set("status", filters.status as "Read" | "Unread");
      if (filters.search) url.searchParams.set("q", filters.search);

      const resp = await fetch(url.toString(), { credentials: "include" });

      if (!resp.ok) {
        const data = await logFetchError("[Admin Fetch Notifications]", url.toString(), resp);
        toast.error(data?.message ?? "Failed to load notifications.");
        setNotifications([]);
        setFilteredNotifications([]);
        return;
      }

      const data: BackendNotification[] = await resp.json();
      const mapped = (data ?? []).map(mapToVM);

      setNotifications(mapped);
      setFilteredNotifications(mapped);
    } catch (error) {
      console.error("❌ Failed to fetch notifications:", error);
      toast.error("Failed to load notifications (network error).");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsersMap();
    fetchStats();
  }, [fetchUsersMap, fetchStats]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const refetchAll = async () => {
    await Promise.all([fetchNotifications(), fetchStats(), fetchUsersMap()]);
  };

  const handleViewDetail = (notification: NotificationVM) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const handleMarkAsRead = async (id: string, status: "Read" | "Unread", receiver_id?: string) => {
    try {
      if (status !== "Read") return;

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

      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, status } : n)));
      setFilteredNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, status } : n)));

      if (selectedNotification?._id === id) setSelectedNotification({ ...selectedNotification, status });

      fetchStats();
    } catch (error) {
      console.error("❌ Failed to update notification:", error);
      toast.error("Failed to update notification (network error).");
    }
  };

  const handleResend = async (notification: NotificationVM) => {
    try {
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
      await refetchAll();
    } catch (error) {
      console.error("❌ Failed to resend notification:", error);
      toast.error("Failed to resend notification (network error).");
    }
  };

  const handleCreateNotification = async (formData: { receiver_email: string; title: string; body: string }) => {
    const url = `${API}/api/admin/notifications/send`;

    try {
      const receiverEmail = formData.receiver_email?.trim().toLowerCase();
      const receiverId = emailToIdMap[receiverEmail];

      if (!receiverEmail) {
        toast.error("Receiver email is required.");
        return;
      }

      if (!receiverId) {
        toast.error("Receiver email not found in users list.");
        console.warn("[Admin Create Noti] Email not found:", receiverEmail);
        return;
      }

      const payload = {
        receiver_id: receiverId,
        title: formData.title,
        body: formData.body,
      };

      console.log("[Admin Create Noti] REQUEST", { url, payload });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await logFetchError("[Admin Create Notification]", url, response);
        toast.error(data?.message ?? "Failed to send notification.");
        return;
      }

      toast.success("Notification sent successfully.");
      setIsFormOpen(false);
      setPrefillEmail(""); // ✅ reset after success
      await refetchAll();
    } catch (error) {
      console.error("❌ Failed to create notification:", error);
      toast.error("Failed to send notification (network error).");
    }
  };

  const handleDelete = async (id: string, receiver_id: string) => {
    const url = `${API}/api/admin/notifications/${id}`;

    try {
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
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setFilteredNotifications((prev) => prev.filter((n) => n._id !== id));

      if (selectedNotification?._id === id) setIsModalOpen(false);
      fetchStats();
    } catch (e) {
      console.error("❌ Delete failed:", e);
      toast.error("Failed to delete notification (network error).");
    }
  };

  const handleToggleSave = async (id: string, receiver_id: string) => {
    const url = `${API}/api/admin/notifications/${id}/toggle-save`;

    try {
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
      setFilteredNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_save: !n.is_save } : n))
      );
    } catch (e) {
      console.error("❌ Toggle save failed:", e);
      toast.error("Failed to toggle saved state (network error).");
    }
  };

  const unreadCount = notifications.filter((n) => n.status === "Unread").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Admin / Notifications</p>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-8 w-8 text-blue-600" />
              Notifications Management
            </h1>
            <p className="text-gray-600 mt-1">Manage and send notifications</p>
          </div>

          <Button
            onClick={() => {
              setPrefillEmail(""); // ✅ new click => empty prefill
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New Notification
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.total ?? notifications.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unread</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats?.unread ?? unreadCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Read</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-600">
                {stats?.read ?? notifications.length - unreadCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <NotificationFilters
          onTypeChange={() => {}}
          onRoleChange={() => {}}
          onStatusChange={(status) => setFilters((f) => ({ ...f, status }))}
          onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        />

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading notifications...</div>
        ) : (
          <NotificationTable
            notifications={filteredNotifications}
            onViewDetail={handleViewDetail}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            onToggleSave={handleToggleSave}
            usersMap={usersMap}
          />
        )}

        {/* Modal */}
        <NotificationModal
          notification={selectedNotification}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onMarkAsRead={handleMarkAsRead}
          onResend={handleResend}
          usersMap={usersMap}
        />

        {/* ✅ Create Form (updated with prefillEmail) */}
        <NotificationCreateForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setPrefillEmail(""); // ✅ reset when close
          }}
          onSubmit={handleCreateNotification}
          defaultReceiverEmail={prefillEmail}
        />
      </div>
    </AdminLayout>
  );
}
