"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/app/admin/adminLayout/page";
import { Card } from "@/components/ui/card";
import { ChapterSummary } from "@/components/admin/moderation/workspace/chapter-summary";
import { FindingsPanel } from "@/components/admin/moderation/workspace/findings-panel";
import { ContentViewer } from "@/components/admin/moderation/workspace/content-viewer";
import type { Decision, ModerationRecord } from "@/lib/typesLogs";
import { fetchModerationRecord, decideModeration, recheckModeration } from "@/lib/moderation";

export default function ModerationWorkspacePage() {
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId") ?? "";
  const [record, setRecord] = useState<ModerationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!chapterId) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetchModerationRecord(chapterId);
      setRecord(r);
    } catch (e: any) {
      setErr(e?.message || "Load record failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [chapterId]);

  const onDecision = async (action: Decision, note?: string) => {
    if (!record) return;
    setActLoading(true);
    try {
      await decideModeration(record.chapterId, action, note);
      await load(); // refresh trạng thái
    } catch (e: any) {
      alert(e?.message || "Action failed");
    } finally {
      setActLoading(false);
    }
  };

  const onRecheck = async () => {
    if (!record) return;
    setActLoading(true);
    try {
      await recheckModeration(record.chapterId);
      await load();
    } catch (e: any) {
      alert(e?.message || "Recheck failed");
    } finally {
      setActLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span><span>/</span><span>Moderation</span><span>/</span><span className="text-foreground">Workspace</span>
        </div>

        <h1 className="text-2xl font-bold">Moderation Workspace</h1>

        {err && <Card className="p-4 text-red-600 text-sm">{err}</Card>}
        {loading && <Card className="p-4 text-sm">Loading…</Card>}

        {!!record && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Summary & Actions */}
            <div className="lg:col-span-1">
              <ChapterSummary record={record} onDecision={onDecision} onRecheck={onRecheck} loading={actLoading} />
            </div>

            {/* Right: Content & Findings */}
            <div className="lg:col-span-2 space-y-6">
              <ContentViewer
                title={record.chapterTitle ?? "Untitled"}
                author={record.authorName ?? "-"}
                html={record.contentHtml ?? "<p><i>(Không có nội dung hiển thị)</i></p>"}
                updatedAt={record.updatedAt}
              />
              <FindingsPanel record={record} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
