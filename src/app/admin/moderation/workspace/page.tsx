"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/app/admin/adminLayout/page";
import { Card } from "@/components/ui/card";
import { ChapterSummary } from "@/components/admin/moderation/workspace/chapter-summary";
import { FindingsPanel } from "@/components/admin/moderation/workspace/findings-panel";
import { ContentViewer } from "@/components/admin/moderation/workspace/content-viewer";
import type { Decision, ModerationRecord } from "@/lib/typesLogs";
import {
  fetchModerationRecord,
  decideModeration,
  recheckModeration,
} from "@/lib/moderation";
import { deriveFindings } from "@/lib/moderation-findings";

type WorkspaceNotice = {
  tone: "info" | "error" | "success";
  message: string;
} | null;

export default function ModerationWorkspacePage() {
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId") ?? "";

  const [record, setRecord] = useState<ModerationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<WorkspaceNotice>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  const findings = useMemo(
    () => deriveFindings(record?.ai_findings || []),
    [record?.ai_findings]
  );

  const activeFinding =
    findings.find((item) => item.highlightId === activeFindingId) || null;

  const load = async () => {
    if (!chapterId) return;

    setLoading(true);
    setErr(null);

    try {
      const r = await fetchModerationRecord(chapterId);
      setRecord(r);
    } catch (e: any) {
      setErr(e?.message || "Load record failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  useEffect(() => {
    if (!findings.length) {
      setActiveFindingId(null);
      return;
    }

    setActiveFindingId((prev) => {
      if (prev && findings.some((item) => item.highlightId === prev)) {
        return prev;
      }

      const preferred = findings.find((item) => item.verdict !== "pass") || findings[0];
      return preferred.highlightId;
    });
  }, [findings]);

  const onDecision = async (action: Decision, note?: string) => {
    if (!record) return;

    setActLoading(true);
    setNotice(null);

    try {
      await decideModeration(record.chapterId, action, note);
      setNotice({
        tone: "success",
        message:
          action === "approve"
            ? "Chapter approved and published successfully."
            : action === "reject"
            ? "Chapter rejected successfully."
            : "Change request has been saved successfully.",
      });
      await load();
    } catch (e: any) {
      setNotice({
        tone: "error",
        message: e?.message || "Action failed",
      });
    } finally {
      setActLoading(false);
    }
  };

  const onRecheck = async () => {
    if (!record) return;

    setActLoading(true);
    setNotice(null);

    try {
      await recheckModeration(record.chapterId);
      await load();
      setNotice({
        tone: "info",
        message:
          "AI recheck started. The record may show Pending first while the latest analysis is being generated.",
      });
    } catch (e: any) {
      setNotice({
        tone: "error",
        message: e?.message || "Recheck failed",
      });
    } finally {
      setActLoading(false);
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
          <span className="text-foreground">Workspace</span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Moderation Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Review AI findings, inspect flagged content, and decide whether this chapter is ready
            for publication.
          </p>
        </div>

        {err && (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </Card>
        )}

        {notice && (
          <Card
            className={`p-4 text-sm ${
              notice.tone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {notice.message}
          </Card>
        )}

        {loading && <Card className="p-4 text-sm">Loading workspace...</Card>}

        {!!record && !loading && (
          <>
            <ChapterSummary
              record={record}
              onDecision={onDecision}
              onRecheck={onRecheck}
              loading={actLoading}
            />

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
              <ContentViewer
                title={record.chapterTitle ?? "Untitled"}
                author={record.authorName ?? "-"}
                html={record.contentHtml ?? "<p><i>(No content available)</i></p>"}
                updatedAt={record.updatedAt}
                activeFinding={activeFinding}
              />

              <FindingsPanel
                findings={findings}
                activeFindingId={activeFindingId}
                onSelectFinding={setActiveFindingId}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
