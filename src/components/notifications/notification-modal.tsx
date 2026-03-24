"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Mail,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NotificationVM } from "@/types/notification";

interface NotificationModalProps {
  notification: NotificationVM | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string, receiver_id?: string) => void;
  onResend: (notification: NotificationVM) => void;
  onToggleSave: (id: string, receiver_id: string) => void;
  onDeleteRequest: (notification: NotificationVM) => void;
  usersMap?: Record<string, string>;
  busyId?: string | null;
}

function shortId(id: string) {
  return id?.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: "Read" | "Unread") {
  return status === "Read"
    ? "border border-slate-200 bg-slate-100 text-slate-700"
    : "border border-blue-200 bg-blue-50 text-blue-700";
}

function getSavedColor(isSave: boolean) {
  return isSave
    ? "border border-amber-200 bg-amber-50 text-amber-700"
    : "border border-slate-200 bg-slate-50 text-slate-500";
}

export function NotificationModal({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onResend,
  onToggleSave,
  onDeleteRequest,
  usersMap = {},
  busyId = null,
}: NotificationModalProps) {
  if (!notification) return null;

  const showEmailOrId = (id: string) => usersMap[id] || shortId(id);
  const isBusy = busyId === notification._id;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border-slate-200 p-0">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
          <DialogHeader>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={getStatusColor(notification.status)}>
                {notification.status}
              </Badge>
              <Badge className={getSavedColor(notification.is_save)}>
                {notification.is_save ? "Saved" : "Unsaved"}
              </Badge>
            </div>

            <DialogTitle className="text-2xl font-semibold text-slate-900">
              Notification details
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Review content, recipient information, and perform follow-up actions from one place.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-500">Title</p>
            <p className="break-words text-lg font-semibold leading-8 text-slate-900">
              {notification.title}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-500">Message body</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
              {notification.body}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <CalendarDays className="h-4 w-4" />
                Date sent
              </div>
              <p className="text-sm text-slate-700">{formatDate(notification.createdAt)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <Mail className="h-4 w-4" />
                Notification ID
              </div>
              <p className="text-sm text-slate-700">{shortId(notification._id)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <Mail className="h-4 w-4" />
                Receiver
              </div>
              <p className="break-all text-sm text-slate-700" title={notification.receiver_id}>
                {showEmailOrId(notification.receiver_id)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <Mail className="h-4 w-4" />
                Sender
              </div>
              <p className="break-all text-sm text-slate-700" title={notification.sender_id}>
                {showEmailOrId(notification.sender_id)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-500">Quick actions</p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {notification.status === "Unread" && (
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200"
                  onClick={() => onMarkAsRead(notification._id, notification.receiver_id)}
                  disabled={isBusy}
                >
                  Mark as read
                </Button>
              )}

              <Button
                variant="outline"
                className="rounded-xl border-slate-200"
                onClick={() => onToggleSave(notification._id, notification.receiver_id)}
                disabled={isBusy}
              >
                {notification.is_save ? (
                  <>
                    <BookmarkCheck className="mr-2 h-4 w-4 text-amber-600" />
                    Unsave
                  </>
                ) : (
                  <>
                    <Bookmark className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>

              <Button
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
                onClick={() => onResend(notification)}
                disabled={isBusy}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Resend
              </Button>

              <Button
                variant="outline"
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onDeleteRequest(notification)}
                disabled={isBusy}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>

              <Button
                variant="ghost"
                className="rounded-xl sm:ml-auto"
                onClick={onClose}
              >
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}