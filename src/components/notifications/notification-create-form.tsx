"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NotificationCreateForm({
  isOpen,
  onClose,
  onSubmit,
  defaultReceiverEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { receiver_email: string; title: string; body: string }) => void;
  defaultReceiverEmail?: string;
}) {
  const [receiver_email, setReceiverEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // ✅ Prefill Receiver Email when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    setReceiverEmail(defaultReceiverEmail?.trim() ?? "");
    // optional: keep title/body empty
    setTitle("");
    setBody("");
  }, [isOpen, defaultReceiverEmail]);

  const handleSubmit = () => {
    if (!receiver_email.trim()) {
      toast.error("Receiver email is required.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!body.trim()) {
      toast.error("Body is required.");
      return;
    }

    onSubmit({
      receiver_email: receiver_email.trim(),
      title: title.trim(),
      body: body.trim(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Notification</DialogTitle>
          <DialogDescription>Create and send a notification to a user.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Receiver Email</Label>
            <Input
              placeholder="example@email.com"
              value={receiver_email}
              onChange={(e) => setReceiverEmail(e.target.value)}
            />
          </div>

          <div>
            <Label>Title</Label>
            <Input
              placeholder="Notification title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Body</Label>
            <Textarea
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
