"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Trash2, X } from "lucide-react";
import type { Comment } from "./comment-table";

interface CommentModalProps {
  open: boolean;
  comment: Comment | null;
  onClose: () => void;
  onToggleVisibility: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
  /** Optional: khóa nút khi đang xử lý một commentId cụ thể */
  actionLoadingId?: string | null;
}

export function CommentModal({
  open,
  comment,
  onClose,
  onToggleVisibility,
  onDelete,
  actionLoadingId = null,
}: CommentModalProps) {
  if (!comment) return null;

  const isBusy = actionLoadingId === comment.id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Comment ID</p>
              <p className="font-semibold">{comment.commentId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold capitalize">{comment.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="font-semibold">{comment.username}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold">{comment.date}</p>
            </div>
          </div>

          {/* Manga & Chapter */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">Manga</p>
              <p className="font-semibold">{comment.storyTitle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Chapter</p>
              <p className="font-semibold">{comment.chapter || "—"}</p>
            </div>
          </div>

          {/* Full Content */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">Full Content</p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
              {comment.content}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="gap-2 bg-transparent" disabled={isBusy}>
              <X className="h-4 w-4" />
              Close
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                onToggleVisibility(comment.id, comment.status);
                onClose();
              }}
              className="gap-2"
              disabled={isBusy}
              title={comment.status === "visible" ? "Hide" : "Unhide"}
            >
              {comment.status === "visible" ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Unhide
                </>
              )}
            </Button>

            {/* BE hiện chưa có DELETE: vẫn để nút để bạn thêm BE sau; handler phía parent sẽ báo lỗi nếu chưa hỗ trợ */}
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(comment.id);
                onClose();
              }}
              className="gap-2"
              disabled={isBusy}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommentModal;
