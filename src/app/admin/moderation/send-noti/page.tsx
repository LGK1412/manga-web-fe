"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/app/admin/adminLayout/page";
import { fetchModerationRecord } from "@/lib/moderation";
import type { ModerationRecord } from "@/lib/typesLogs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, RefreshCcw } from "lucide-react";

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

function buildDraftMail(record: ModerationRecord) {
  const manga = record.mangaTitle || "Untitled Manga";
  const chapter = record.chapterTitle || "Untitled Chapter";
  const author = record.authorName || "Author";
  const risk = Number(record.risk_score ?? 0);
  const status = statusLabel(record.ai_status);
  const labels = record.labels?.length ? record.labels.join(", ") : "N/A";

  let reminderText =
    "Please review this chapter carefully and revise any content that may conflict with our posting policies before taking further action.";

  if (record.ai_status === "AI_BLOCK") {
    reminderText =
      "This chapter has been flagged at a high-risk level. Please prioritize reviewing and revising the content as soon as possible to avoid policy violations.";
  } else if (record.ai_status === "AI_WARN") {
    reminderText =
      "This chapter contains signals that may require your attention. Please review the content carefully and adjust it where necessary.";
  }

  const subject = `[Moderation Draft] ${manga} - ${chapter}`;

  const body = `Dear ${author},

We would like to inform you that your chapter has been flagged during our moderation review.

Manga: ${manga}
Chapter: ${chapter}
Risk Score: ${risk}/100
AI Status: ${status}
Detected Labels: ${labels}

Reminder:
${reminderText}

Please note that this is currently a draft notification prepared for internal review. Our staff will review the content again and may add further notes before deciding whether to send an official email.

Thank you for your understanding and cooperation.

Best regards,
Content Moderation Team`;

  return { subject, body };
}

export default function SendNotificationPage() {
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId") ?? "";

  const [record, setRecord] = useState<ModerationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const generated = useMemo(() => {
    if (!record) return { subject: "", body: "" };
    return buildDraftMail(record);
  }, [record]);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!chapterId) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await fetchModerationRecord(chapterId);
        setRecord(data);
      } catch (e: any) {
        setErr(e?.message || "Load draft data failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [chapterId]);

  useEffect(() => {
    if (!record) return;
    setTo(record.authorEmail || "");
    setSubject(generated.subject);
    setBody(generated.body);
  }, [record, generated.subject, generated.body]);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span>Moderation</span>
          <span>/</span>
          <span className="text-foreground">Send Notification</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Send Notification Draft</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This page only prepares an editable email draft. Staff will review and decide whether to send it manually.
            </p>
          </div>

          <Link href={`/admin/moderation/workspace?chapterId=${chapterId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workspace
            </Button>
          </Link>
        </div>

        {err && <Card className="p-4 text-red-600 text-sm">{err}</Card>}
        {loading && <Card className="p-4 text-sm">Loading...</Card>}

        {!!record && !loading && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold">Moderation Info</h3>

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
                  <p className="text-sm text-muted-foreground">Author Email</p>
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

                <Button variant="outline" className="w-full justify-start" onClick={() => copyText(subject)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Subject
                </Button>

                <Button variant="outline" className="w-full justify-start" onClick={() => copyText(body)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Body
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setSubject(generated.subject);
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
                <h3 className="font-semibold">Editable Mail Draft</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium">To</label>
                  <Input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="author@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Body</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Editable draft email..."
                    className="min-h-[420px]"
                  />
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Staff can review, edit, and manually decide whether to send this email outside the system.
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}