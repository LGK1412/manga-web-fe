"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/app/admin/adminLayout/page";
import { fetchModerationRecord } from "@/lib/moderation";
import type { ModerationRecord } from "@/lib/typesLogs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL!;

function statusLabel(status?: string) {
  switch (status) {
    case "AI_BLOCK":
      return "Blocked";
    case "AI_WARN":
      return "Warning";
    case "AI_PASSED":
      return "Passed";
    default:
      return "Pending";
  }
}

function buildPolicyTemplate(record: ModerationRecord) {
  const manga = record.mangaTitle || "Untitled Manga";
  const chapter = record.chapterTitle || "Untitled Chapter";
  const author = record.authorName || "Author";
  const risk = Number(record.risk_score ?? 0);
  const status = statusLabel(record.ai_status);
  const labels = record.labels?.length ? record.labels.join(", ") : "N/A";

  let reminderText =
    "Please review this chapter carefully and revise any content that may conflict with our platform posting policies.";

  if (record.ai_status === "AI_BLOCK") {
    reminderText =
      "This chapter has been flagged at a high-risk level. Please revise the content as soon as possible before resubmission.";
  } else if (record.ai_status === "AI_WARN") {
    reminderText =
      "This chapter contains content that may require revision. Please review and adjust it carefully before the next moderation check.";
  }

  return {
    title: `[Policy Review] ${manga} - ${chapter}`,
    body: `Hello ${author},

Your chapter has been flagged during our moderation review.

Manga: ${manga}
Chapter: ${chapter}
Risk Score: ${risk}/100
AI Status: ${status}
Detected Labels: ${labels}

Reminder:
${reminderText}

After editing the content, you may resubmit the chapter for review.

Best regards,
Content Moderation Team`,
  };
}

export default function SendPolicyNotificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId") ?? "";

  const [record, setRecord] = useState<ModerationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const emailToIdMap = useMemo(() => {
    const reversed: Record<string, string> = {};
    for (const [id, email] of Object.entries(usersMap)) {
      reversed[email.toLowerCase()] = id;
    }
    return reversed;
  }, [usersMap]);

  const generated = useMemo(() => {
    if (!record) return { title: "", body: "" };
    return buildPolicyTemplate(record);
  }, [record]);

  const [receiverEmail, setReceiverEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

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
        console.error("[Send Policy Noti] fetch users failed:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!chapterId) return;

    (async () => {
      setLoading(true);
      try {
        const data = await fetchModerationRecord(chapterId);
        setRecord(data);
      } catch (e) {
        console.error("[Send Policy Noti] load moderation record failed:", e);
        toast.error("Failed to load moderation data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [chapterId]);

  useEffect(() => {
    if (!record) return;
    setReceiverEmail(record.authorEmail || "");
    setTitle(generated.title);
    setBody(generated.body);
  }, [record, generated.title, generated.body]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Copy ${label.toLowerCase()} failed.`);
    }
  };

  const handleSend = async () => {
    try {
      const normalizedEmail = receiverEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        toast.error("Receiver email is required.");
        return;
      }

      const receiverId = emailToIdMap[normalizedEmail];
      if (!receiverId) {
        toast.error("Receiver email not found in users list.");
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
          receiver_id: receiverId,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        toast.error(data?.message ?? "Failed to send notification.");
        return;
      }

      toast.success("Policy notification sent successfully.");
      router.push("/admin/notifications");
    } catch (e) {
      console.error("[Send Policy Noti] send failed:", e);
      toast.error("Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span>Notifications</span>
          <span>/</span>
          <span className="text-foreground">Policy Send Noti</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Send Chapter Policy Notification</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send an in-app notification to the author for a chapter flagged by moderation.
            </p>
          </div>

          <Link href={chapterId ? `/admin/moderation/workspace?chapterId=${chapterId}` : "/admin/notifications"}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {loading && <Card className="p-4 text-sm">Loading...</Card>}

        {!!record && !loading && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold">Chapter Moderation Info</h3>

                <div>
                  <p className="text-sm text-muted-foreground">Manga</p>
                  <p className="font-medium">{record.mangaTitle || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Chapter</p>
                  <p className="font-medium">{record.chapterTitle || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Author</p>
                  <p className="font-medium">{record.authorName || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Receiver Email</p>
                  <p className="font-medium break-all">{record.authorEmail || "(empty)"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="font-medium">{record.risk_score}/100</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">AI Status</p>
                  <Badge variant="outline">{statusLabel(record.ai_status)}</Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Labels</p>
                  <div className="flex flex-wrap gap-2">
                    {record.labels.length > 0 ? (
                      record.labels.map((label) => (
                        <Badge key={label} variant="secondary">
                          {label}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No labels</span>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-3">
                <h3 className="font-semibold">Quick Actions</h3>

                <Button variant="outline" className="w-full justify-start" onClick={() => copyText(title, "Title")}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Title
                </Button>

                <Button variant="outline" className="w-full justify-start" onClick={() => copyText(body, "Body")}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Body
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setTitle(generated.title);
                    setBody(generated.body);
                  }}
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Reset to Template
                </Button>
              </Card>
            </div>

            <div className="xl:col-span-2">
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold">Compose Policy Notification</h3>

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
                  This notification is intended for authors whose chapters were flagged during moderation review.
                </div>

                <div className="flex justify-end gap-2">
                  <Link href="/admin/notifications">
                    <Button variant="outline">Cancel</Button>
                  </Link>
                  <Button onClick={handleSend} disabled={sending}>
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? "Sending..." : "Send Notification"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}