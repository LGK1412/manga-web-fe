// app/admin/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import AdminLayout from "../adminLayout/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationTable } from "@/components/notifications/notification-table";
import { NotificationFilters } from "@/components/notifications/notification-filters";
import { NotificationModal } from "@/components/notifications/notification-modal";
import { NotificationCreateForm } from "@/components/notifications/notification-create-form";
import { Bell, Plus } from "lucide-react";
import Cookies from "js-cookie";

// ==== BÁM THEO schema từ notifications microservice ====
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

interface NotificationVM {
  _id: string;
  title: string;
  body: string;
  status: "Unread" | "Read";
  createdAt: string;
  receiver_id: string;
  sender_id: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

function mapToVM(n: BackendNotification): NotificationVM {
  return {
    _id: n._id,
    title: n.title,
    body: n.body,
    status: n.is_read ? "Read" : "Unread",
    createdAt: n.createdAt,
    receiver_id: n.receiver_id,
    sender_id: n.sender_id,
  };
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationVM[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationVM[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationVM | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ status: "All", search: "" });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        setCurrentUserId(parsed?.user_id ?? null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUserId) return;
      try {
        setLoading(true);
        const resp = await fetch(
          `${API}/api/notifications/get-all-for-user?user_id=${currentUserId}`,
          { credentials: "include" }
        );
        const data = await resp.json();
        const arr: BackendNotification[] = Array.isArray(data) ? data : [];
        const mapped = arr.map(mapToVM);

        let list = mapped;
        if (filters.status !== "All") list = list.filter((n) => n.status === filters.status);
        if (filters.search) {
          const q = filters.search.toLowerCase();
          list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
        }

        setNotifications(mapped);
        setFilteredNotifications(list);
      } catch (error) {
        console.error("❌ Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUserId, filters]);

  const handleViewDetail = (notification: NotificationVM) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const handleMarkAsRead = async (id: string, status: "Read" | "Unread") => {
    if (!currentUserId) return;
    try {
      if (status === "Read") {
        await fetch(`${API}/api/notifications/mark-as-read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, user_id: currentUserId }),
        });
      } else {
        return; // chưa hỗ trợ mark-as-unread ở BE
      }

      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, status } : n)));
      setFilteredNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, status } : n)));
      if (selectedNotification?._id === id) setSelectedNotification({ ...selectedNotification, status });
    } catch (error) {
      console.error("❌ Failed to update notification:", error);
    }
  };

  // Re-send: dùng receiver_id sẵn có (controller hỗ trợ cả receiver_id & receiver_email)
  const handleResend = async (notification: NotificationVM) => {
    try {
      await fetch(`${API}/api/admin/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: notification.title,
          body: notification.body,
          receiver_id: notification.receiver_id,
        }),
      });

      if (currentUserId) {
        const resp = await fetch(
          `${API}/api/notifications/get-all-for-user?user_id=${currentUserId}`,
          { credentials: "include" }
        );
        const data: BackendNotification[] = await resp.json();
        const mapped = data.map(mapToVM);
        setNotifications(mapped);
        setFilteredNotifications(mapped);
      }
    } catch (error) {
      console.error("❌ Failed to resend notification:", error);
    }
  };

  // Create mới: gửi theo email
  const handleCreateNotification = async (formData: { receiver_email: string; title: string; body: string }) => {
    try {
      const response = await fetch(`${API}/api/admin/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || "Gửi thông báo thất bại");
      }

      if (currentUserId) {
        const resp = await fetch(
          `${API}/api/notifications/get-all-for-user?user_id=${currentUserId}`,
          { credentials: "include" }
        );
        const data: BackendNotification[] = await resp.json();
        const mapped = data.map(mapToVM);
        setNotifications(mapped);
        setFilteredNotifications(mapped);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error("❌ Failed to create notification:", error);
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

          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Notification
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle>Total Notifications</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{notifications.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Unread</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-blue-600">{unreadCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Read</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-gray-600">{notifications.length - unreadCount}</p></CardContent>
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
            notifications={filteredNotifications as any} // (giữ type cũ của bảng nếu bạn chưa chỉnh)
            onViewDetail={handleViewDetail as any}
            onMarkAsRead={handleMarkAsRead as any}
          />
        )}

        {/* Modal */}
        <NotificationModal
          notification={selectedNotification as any}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onMarkAsRead={handleMarkAsRead as any}
          onResend={handleResend as any}
        />

        {/* Create Form (gửi email) */}
        <NotificationCreateForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateNotification}
        />
      </div>
    </AdminLayout>
  );
}
