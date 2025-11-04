// components/notifications/notification-create-form.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send } from "lucide-react";

interface NotificationCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { receiver_email: string; title: string; body: string }) => void;
  prefilledData?: Partial<{ receiver_email: string; title: string; body: string }>;
}

export function NotificationCreateForm({
  isOpen,
  onClose,
  onSubmit,
  prefilledData,
}: NotificationCreateFormProps) {
  const [formData, setFormData] = useState({
    receiver_email: prefilledData?.receiver_email ?? "",
    title: prefilledData?.title ?? "",
    body: prefilledData?.body ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.receiver_email.trim() || !formData.title.trim() || !formData.body.trim()) return;

    onSubmit({
      receiver_email: formData.receiver_email.trim(),
      title: formData.title.trim(),
      body: formData.body.trim(),
    });

    setFormData({ receiver_email: "", title: "", body: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Notification</DialogTitle>
          <DialogDescription>Send a new notification</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Receiver Email</label>
              <Input
                type="email"
                placeholder="vd: author@example.com"
                value={formData.receiver_email}
                onChange={(e) => setFormData({ ...formData, receiver_email: e.target.value })}
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                *Nhập email người nhận. Backend sẽ tự tìm user_id tương ứng.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                placeholder="Notification title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Body</label>
              <Textarea
                placeholder="Notification body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="mt-1"
                rows={4}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send Notification
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="ml-auto bg-transparent">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
