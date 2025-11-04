"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw } from "lucide-react";

// Khớp với NotificationVM của page.tsx
export interface NotificationVM {
  _id: string;
  title: string;
  body: string;
  status: "Unread" | "Read";
  createdAt: string;
  receiver_id: string;
  sender_id: string;
}

interface NotificationModalProps {
  notification: NotificationVM | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string, status: "Read" | "Unread") => void;
  onResend: (notification: NotificationVM) => void;
}

export function NotificationModal({ notification, isOpen, onClose, onMarkAsRead, onResend }: NotificationModalProps) {
  if (!notification) return null;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusColor = (status: "Read" | "Unread") =>
    status === "Read" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700";

  const shortId = (id: string) => (id?.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notification Details</DialogTitle>
          <DialogDescription>View and manage notification information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Details */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Title</p>
              <p className="text-gray-900 font-semibold mt-1">{notification.title}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Body</p>
              <p className="text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">{notification.body}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge className={`mt-1 ${getStatusColor(notification.status)}`}>{notification.status}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Date Sent</p>
                <p className="text-gray-700 mt-1 text-sm">{formatDate(notification.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Receiver ID</p>
                <p className="text-gray-700 mt-1 text-sm" title={notification.receiver_id}>
                  {shortId(notification.receiver_id)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sender ID</p>
                <p className="text-gray-700 mt-1 text-sm" title={notification.sender_id}>
                  {shortId(notification.sender_id)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => onMarkAsRead(notification._id, notification.status === "Read" ? "Unread" : "Read")}
            >
              Mark as {notification.status === "Read" ? "Unread" : "Read"}
            </Button>
            <Button variant="outline" onClick={() => onResend(notification)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Resend
            </Button>
            <Button variant="ghost" onClick={onClose} className="ml-auto">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
