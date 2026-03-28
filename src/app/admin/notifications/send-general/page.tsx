"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/app/admin/adminLayout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL!;

function buildGeneralTemplate() {
  return {
    title: "[System Notification] Update from Manga Platform",
    body: `Hello,

This is a general notification from the administration team.

[Please write your message here]

Best regards,
Manga Platform Team`,
  };
}

export default function SendGeneralNotificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const template = useMemo(() => buildGeneralTemplate(), []);

  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const emailToIdMap = useMemo(() => {
    const reversed: Record<string, string> = {};
    for (const [id, email] of Object.entries(usersMap)) {
      reversed[email.toLowerCase()] = id;
    }
    return reversed;
  }, [usersMap]);

  const [receiverId, setReceiverId] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API}/api/user/all`, { credentials: "include" });
        if (!resp.ok) return;

        const users = await resp.json();
        const map: Record<string, string> = {};
        for (const u of users || []) {
          if (u?._id && u?.email) map[u._id] = u.email;
        }
        setUsersMap(map);
      } catch (e) {
        console.error("[Send General Noti] fetch users failed:", e);
      }
    })();
  }, []);

  useEffect(() => {
    const qpReceiverId = searchParams.get("receiverId")?.trim() ?? "";
    const qpReceiverEmail = searchParams.get("receiverEmail")?.trim() ?? "";
    const qpTitle = searchParams.get("title")?.trim() ?? "";
    const qpBody = searchParams.get("body") ?? "";

    setReceiverId(qpReceiverId);
    setReceiverEmail(qpReceiverEmail);
    setTitle(qpTitle || template.title);
    setBody(qpBody || template.body);
  }, [searchParams, template.title, template.body]);

  useEffect(() => {
    if (!receiverEmail && receiverId && usersMap[receiverId]) {
      setReceiverEmail(usersMap[receiverId]);
    }
  }, [receiverId, receiverEmail, usersMap]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Copy ${label.toLowerCase()} failed.`);
    }
  };

  const handleResetTemplate = () => {
    setTitle(template.title);
    setBody(template.body);
  };

  const handleSend = async () => {
    try {
      const normalizedEmail = receiverEmail.trim().toLowerCase();
      const resolvedReceiverId =
        receiverId || (normalizedEmail ? emailToIdMap[normalizedEmail] : "");

      if (!resolvedReceiverId) {
        toast.error("Receiver is required.");
        return;
      }

      if (!title.trim()) {
        toast.error("Notification title is required.");
        return;
      }

      if (!body.trim()) {
        toast.error("Notification body is required.");
        return;
      }

      setSending(true);

      const resp = await fetch(`${API}/api/admin/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiver_id: resolvedReceiverId,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        toast.error(data?.message ?? "Failed to send notification.");
        return;
      }

      toast.success("Notification sent successfully.");
      router.push("/admin/notifications");
    } catch (e) {
      console.error("[Send General Noti] send failed:", e);
      toast.error("Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span>Notifications</span>
          <span>/</span>
          <span className="text-foreground">Send Noti</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Send General Notification</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and send a normal platform notification to a specific user.
            </p>
          </div>

          <Link href="/admin/notifications">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List Sent Noti
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-1">
            <Card className="space-y-4 p-6">
              <h3 className="font-semibold">Notification Context</h3>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">General Notification</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Use cases</p>
                <p className="font-medium">
                  Announcements, reminders, chapter updates, account notices, or operational messages.
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="font-medium">One user by email</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Platform logic</p>
                <p className="font-medium">
                  Suitable for a manga reading platform to notify authors or readers directly in system.
                </p>
              </div>
            </Card>

            <Card className="space-y-3 p-6">
              <h3 className="font-semibold">Quick Actions</h3>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => copyText(title, "Title")}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Title
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => copyText(body, "Body")}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Body
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleResetTemplate}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset to Template
              </Button>
            </Card>
          </div>

          <div className="xl:col-span-2">
            <Card className="space-y-4 p-6">
              <h3 className="font-semibold">Compose Notification</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">Receiver Email</label>
                <Input
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  placeholder="author@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notification Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notification Body</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write notification body..."
                  className="min-h-[420px]"
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                This page sends an in-app notification to the selected user.
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/admin/notifications">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button onClick={handleSend} disabled={sending}>
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? "Sending..." : "Send Notification"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
