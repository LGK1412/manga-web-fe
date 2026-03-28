"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BellOff,
  Check,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { NotificationVM } from "@/types/notification";

interface NotificationTableProps {
  notifications: NotificationVM[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetail: (notification: NotificationVM) => void;
  onMarkAsRead: (id: string, receiver_id?: string) => void;
  onDeleteRequest: (notification: NotificationVM) => void;
  onToggleSave: (id: string, receiver_id: string) => void;
  onResend: (notification: NotificationVM) => void;
  usersMap?: Record<string, string>;
  busyId?: string | null;
}

function getStatusBadgeClass(status: "Read" | "Unread") {
  return status === "Read"
    ? "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100"
    : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50";
}

function getSavedBadgeClass(isSave: boolean) {
  return isSave
    ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
    : "border border-slate-200 bg-white text-slate-500 hover:bg-white";
}

function formatDateParts(date: string) {
  const d = new Date(date);

  return {
    date: d.toLocaleDateString("vi-VN"),
    time: d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function shortId(id: string) {
  return id?.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export function NotificationTable({
  notifications,
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onViewDetail,
  onMarkAsRead,
  onDeleteRequest,
  onToggleSave,
  onResend,
  usersMap = {},
  busyId = null,
}: NotificationTableProps) {
  const showEmailOrId = (id: string) => usersMap[id] || shortId(id);

  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  const renderStatus = (n: NotificationVM, mobile = false) => {
    const isBusy = busyId === n._id;
    const isUnread = n.status === "Unread";

    return (
      <div
        className={`flex ${
          mobile ? "flex-wrap items-center gap-2" : "flex-col items-center gap-2"
        }`}
      >
        <Badge className={getStatusBadgeClass(n.status)}>{n.status}</Badge>

        {isUnread && (
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-lg px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-800 ${
              mobile ? "h-8" : "h-7"
            }`}
            onClick={() => onMarkAsRead(n._id, n.receiver_id)}
            disabled={isBusy}
            title="Mark as read"
            aria-label="Mark as read"
          >
            {isBusy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Mark read
          </Button>
        )}
      </div>
    );
  };

  const renderActions = (n: NotificationVM, mobile = false) => {
    const isBusy = busyId === n._id;
    const iconButtonClass =
      "h-8 w-8 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900";

    return (
      <div
        className={`flex items-center gap-2 ${
          mobile
            ? "flex-wrap"
            : "w-full flex-nowrap justify-center"
        }`}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onViewDetail(n)}
          disabled={isBusy}
          title="View details"
          aria-label="View details"
        >
          <Eye className="mr-1.5 h-4 w-4" />
          View
        </Button>

        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className={iconButtonClass}
            onClick={() => onResend(n)}
            disabled={isBusy}
            title="Resend notification"
            aria-label="Resend notification"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-lg ${
              n.is_save
                ? "text-amber-600 hover:bg-white hover:text-amber-700"
                : "text-slate-500 hover:bg-white hover:text-slate-900"
            }`}
            onClick={() => onToggleSave(n._id, n.receiver_id)}
            disabled={isBusy}
            title={n.is_save ? "Remove from saved" : "Save notification"}
            aria-label={n.is_save ? "Remove from saved" : "Save notification"}
          >
            {n.is_save ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-red-600 hover:bg-white hover:text-red-700"
            onClick={() => onDeleteRequest(n)}
            disabled={isBusy}
            title="Delete notification"
            aria-label="Delete notification"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <BellOff className="h-7 w-7" />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800">
              No notifications found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your search, saved state, or status filters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Sent notifications list</p>
          <p className="mt-1 text-sm text-slate-500">
            Showing {from}-{to} of {totalItems} notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-xl border-slate-200"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>

          <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
            Page {currentPage} / {totalPages}
          </div>

          <Button
            variant="outline"
            className="h-9 rounded-xl border-slate-200"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1440px] w-full table-fixed">
            <colgroup>
              <col style={{ width: "240px" }} />
              <col style={{ width: "280px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "220px" }} />
            </colgroup>

            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Preview
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Receiver
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sender
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date sent
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Saved
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {notifications.map((n) => {
                const dateParts = formatDateParts(n.createdAt);
                const receiverText = showEmailOrId(n.receiver_id);
                const senderText = showEmailOrId(n.sender_id);
                const isUnread = n.status === "Unread";

                return (
                  <tr
                    key={n._id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isUnread ? "bg-blue-50/40" : "bg-white"
                    }`}
                  >
                    <td className="relative px-6 py-4 align-top">
                      {isUnread && (
                        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-blue-500" />
                      )}

                      <div className="max-w-[280px]">
                        <div className="flex items-start gap-2">
                          {isUnread && (
                            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className="line-clamp-2 break-words text-sm font-semibold leading-6 text-slate-900"
                                title={n.title}
                              >
                                {n.title}
                              </p>

                              {n.is_save && (
                                <span title="Saved" aria-label="Saved">
                                  <BookmarkCheck className="h-4 w-4 shrink-0 text-amber-600" />
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              ID: {shortId(n._id)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="max-w-[360px]">
                        <p
                          className="line-clamp-2 break-words text-sm leading-6 text-slate-600"
                          title={n.body}
                        >
                          {n.body}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <p
                        className="max-w-[180px] truncate text-sm text-slate-600"
                        title={receiverText}
                      >
                        {receiverText}
                      </p>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <p
                        className="max-w-[180px] truncate text-sm text-slate-600"
                        title={senderText}
                      >
                        {senderText}
                      </p>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="whitespace-nowrap text-sm text-slate-600">
                        <p>{dateParts.date}</p>
                        <p className="text-xs text-slate-500">{dateParts.time}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4 align-top text-center">
                      {renderStatus(n)}
                    </td>

                    <td className="px-6 py-4 align-top text-center">
                      <Badge className={`inline-flex items-center gap-1 ${getSavedBadgeClass(n.is_save)}`}>
                        {n.is_save ? (
                          <BookmarkCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                        {n.is_save ? "Saved" : "Not saved"}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 align-top overflow-hidden">{renderActions(n)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 p-4 lg:hidden">
        {notifications.map((n) => {
          const dateParts = formatDateParts(n.createdAt);
          const receiverText = showEmailOrId(n.receiver_id);
          const senderText = showEmailOrId(n.sender_id);
          const isUnread = n.status === "Unread";

          return (
            <div
              key={n._id}
              className={`rounded-2xl border p-4 shadow-sm ${
                isUnread
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isUnread && (
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    )}

                    <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900">
                      {n.title}
                    </p>

                    {n.is_save && (
                      <span title="Saved" aria-label="Saved">
                        <BookmarkCheck className="h-4 w-4 shrink-0 text-amber-600" />
                      </span>
                    )}
                  </div>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {n.body}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className={`inline-flex items-center gap-1 ${getSavedBadgeClass(n.is_save)}`}>
                  {n.is_save ? (
                    <BookmarkCheck className="h-3.5 w-3.5" />
                  ) : (
                    <Bookmark className="h-3.5 w-3.5" />
                  )}
                  {n.is_save ? "Saved" : "Not saved"}
                </Badge>
                {renderStatus(n, true)}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Receiver
                  </p>
                  <p className="mt-1 break-all">{receiverText}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Sender
                  </p>
                  <p className="mt-1 break-all">{senderText}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Date
                  </p>
                  <p className="mt-1">
                    {dateParts.date} · {dateParts.time}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Notification ID
                  </p>
                  <p className="mt-1">{shortId(n._id)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">{renderActions(n, true)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
