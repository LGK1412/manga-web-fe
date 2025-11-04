"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Dùng cùng type với page.tsx
export interface NotificationVM {
  _id: string;
  title: string;
  body: string;
  status: "Unread" | "Read";
  createdAt: string;
  receiver_id: string;
  sender_id: string;
}

interface NotificationTableProps {
  notifications: NotificationVM[];
  onViewDetail: (notification: NotificationVM) => void;
  onMarkAsRead: (id: string, status: "Read" | "Unread") => void;
}

export function NotificationTable({ notifications, onViewDetail, onMarkAsRead }: NotificationTableProps) {
  const getStatusColor = (status: "Read" | "Unread") =>
    status === "Read" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700";

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const shortId = (id: string) => (id?.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Body</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Receiver</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Sender</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {notifications.map((n) => (
            <tr key={n._id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-gray-700 line-clamp-2">{n.body}</p>
              </td>
              <td className="px-6 py-4">
                <p className="text-xs text-gray-700" title={n.receiver_id}>
                  {shortId(n.receiver_id)}
                </p>
              </td>
              <td className="px-6 py-4">
                <p className="text-xs text-gray-700" title={n.sender_id}>
                  {shortId(n.sender_id)}
                </p>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-gray-600">{formatDate(n.createdAt)}</p>
              </td>
              <td className="px-6 py-4">
                <Badge className={getStatusColor(n.status)}>{n.status}</Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail(n)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onMarkAsRead(n._id, n.status === "Read" ? "Unread" : "Read")}
                      >
                        Mark as {n.status === "Read" ? "Unread" : "Read"}
                      </DropdownMenuItem>
                      {/* Bạn có thể thêm nút Delete ở đây nếu có API xóa */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
          {notifications.length === 0 && (
            <tr>
              <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={7}>
                No notifications found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
