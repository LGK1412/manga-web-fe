"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreHorizontal, Trash2, Bookmark, BookmarkCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

interface NotificationTableProps {
  notifications: NotificationVM[];
  onViewDetail: (notification: NotificationVM) => void;
  onMarkAsRead: (id: string, status: "Read" | "Unread", receiver_id?: string) => void;
  onDelete?: (id: string, receiver_id: string) => void;
  onToggleSave?: (id: string, receiver_id: string) => void;
  usersMap?: Record<string, string>; // NEW: id -> email
}

export function NotificationTable({
  notifications,
  onViewDetail,
  onMarkAsRead,
  onDelete,
  onToggleSave,
  usersMap = {},
}: NotificationTableProps) {
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

  const showEmailOrId = (id: string) => usersMap[id] || shortId(id);

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
                  {showEmailOrId(n.receiver_id)}
                </p>
              </td>
              <td className="px-6 py-4">
                <p className="text-xs text-gray-700" title={n.sender_id}>
                  {showEmailOrId(n.sender_id)}
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
                        onClick={() => onMarkAsRead(n._id, n.status === "Read" ? "Unread" : "Read", n.receiver_id)}
                      >
                        Mark as {n.status === "Read" ? "Unread" : "Read"}
                      </DropdownMenuItem>
                      {onToggleSave && (
                        <DropdownMenuItem onClick={() => onToggleSave(n._id, n.receiver_id)}>
                          {n.is_save ? (
                            <span className="flex items-center gap-2">
                              <BookmarkCheck className="h-4 w-4" /> Unsave
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Bookmark className="h-4 w-4" /> Save
                            </span>
                          )}
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem onClick={() => onDelete(n._id, n.receiver_id)}>
                          <span className="flex items-center gap-2 text-red-600">
                            <Trash2 className="h-4 w-4" /> Delete
                          </span>
                        </DropdownMenuItem>
                      )}
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
