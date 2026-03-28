"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskMeter } from "../risk-meter";
import { StatusBadge } from "../status-badge";
import { ResolutionBadge } from "../resolution-badge";
import type { ModerationRecord, Decision } from "@/lib/typesLogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCcw, ShieldAlert, ShieldCheck, ShieldMinus } from "lucide-react";

export function ChapterSummary({
  record,
  onDecision,
  onRecheck,
  loading,
}: {
  record: ModerationRecord;
  onDecision: (action: Decision, note?: string) => Promise<void> | void;
  onRecheck: () => Promise<void> | void;
  loading?: boolean;
}) {
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [openDialog, setOpenDialog] = useState<Decision | null>(null);
  const [note, setNote] = useState("");

  const moderationHint = useMemo(() => {
    if (record.ai_status === "AI_BLOCK") {
      return {
        icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
        title: "High-risk result",
        description:
          "The current AI result suggests direct policy risk. Reject or request changes is safer than publishing.",
      };
    }

    if (record.ai_status === "AI_WARN") {
      return {
        icon: <ShieldMinus className="h-4 w-4 text-yellow-500" />,
        title: "Needs closer review",
        description:
          "The content may still be publishable, but it should usually be revised or manually verified before approval.",
      };
    }

    return {
      icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
      title: "Lower-risk result",
      description:
        "The AI result looks safer, but moderator review is still recommended before publishing.",
    };
  }, [record.ai_status]);

  const actionConfigs: Array<{
    action: Decision;
    label: string;
    variant: "default" | "outline" | "destructive";
    className?: string;
  }> =
    record.ai_status === "AI_BLOCK"
      ? [
          {
            action: "request_changes",
            label: "Request Changes",
            variant: "default",
            className: "bg-amber-600 hover:bg-amber-700 text-white",
          },
          {
            action: "reject",
            label: "Reject Chapter",
            variant: "destructive",
          },
          {
            action: "approve",
            label: "Approve & Publish",
            variant: "outline",
          },
        ]
      : record.ai_status === "AI_WARN"
      ? [
          {
            action: "request_changes",
            label: "Request Changes",
            variant: "default",
            className: "bg-amber-600 hover:bg-amber-700 text-white",
          },
          {
            action: "approve",
            label: "Approve & Publish",
            variant: "outline",
          },
          {
            action: "reject",
            label: "Reject Chapter",
            variant: "destructive",
          },
        ]
      : [
          {
            action: "approve",
            label: "Approve & Publish",
            variant: "default",
          },
          {
            action: "request_changes",
            label: "Request Changes",
            variant: "outline",
          },
          {
            action: "reject",
            label: "Reject Chapter",
            variant: "destructive",
          },
        ];

  const handleDecision = async (action: Decision) => {
    await onDecision(action, note);
    setOpenDialog(null);
    setNote("");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold">Chapter Information</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Key metadata for the moderator before reviewing the chapter content.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Title" value={record.chapterTitle ?? "Untitled"} />
          <InfoItem label="Series" value={record.mangaTitle ?? "-"} />
          <InfoItem label="Author" value={record.authorName ?? "-"} />
          <InfoItem label="Author Email" value={record.authorEmail || "-"} />
          <InfoItem
            label="Updated"
            value={new Date(record.updatedAt).toLocaleString()}
          />
          <InfoItem label="Policy Version" value={record.policy_version || "-"} />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-semibold">AI Analysis Result</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the AI outcome, then choose the moderator decision below.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={record.ai_status ?? "AI_PENDING"} />
              <ResolutionBadge status={record.resolution_status ?? "OPEN"} />
              <Button
                variant="outline"
                size="sm"
                disabled={isRunningAI || loading}
                onClick={async () => {
                  setIsRunningAI(true);
                  try {
                    await onRecheck();
                  } finally {
                    setIsRunningAI(false);
                  }
                }}
              >
                {isRunningAI ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Recheck with AI
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              {moderationHint.icon}
              <p className="text-sm font-medium">{moderationHint.title}</p>
            </div>
            <p className="text-sm text-muted-foreground">{moderationHint.description}</p>
          </div>

          {record.resolution_status !== "OPEN" && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-sm font-medium">Current Moderator Resolution</p>
                <ResolutionBadge status={record.resolution_status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {record.resolution_status === "APPROVED" &&
                  "This chapter was approved by a moderator and can remain published until the content changes again."}
                {record.resolution_status === "CHANGES_REQUESTED" &&
                  "A moderator requested revisions. The chapter should stay unpublished until the author updates it and moderation runs again."}
                {record.resolution_status === "REJECTED" &&
                  "A moderator rejected the chapter for publication under the current content."}
              </p>
              {record.resolution_note && (
                <p className="mt-3 rounded-lg border bg-background/80 p-3 text-sm text-foreground/85">
                  {record.resolution_note}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm text-muted-foreground">Risk Score</p>
            <RiskMeter score={record.risk_score} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Detection Model
              </p>
              <p className="mt-1 text-sm font-medium">{record.ai_model || "-"}</p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Detected Issues
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {record.labels.length > 0 ? (
                  record.labels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No issues detected</span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="mb-3">
              <p className="font-medium">Moderator Action</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the next step based on the AI result and the reviewed content.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {actionConfigs.map((config) => (
                <Button
                  key={config.action}
                  variant={config.variant}
                  className={`w-full ${config.className || ""}`}
                  disabled={loading}
                  onClick={() => setOpenDialog(config.action)}
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog
        open={!!openDialog}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {openDialog === "approve" && "Approve Chapter"}
              {openDialog === "reject" && "Reject Chapter"}
              {openDialog === "request_changes" && "Request Changes"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {openDialog === "approve" && "This will publish the chapter to users."}
              {openDialog === "reject" &&
                "This will reject the chapter and keep it unpublished."}
              {openDialog === "request_changes" &&
                "This will mark the chapter for revision before publication."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div>
            <label className="text-sm font-medium">Note (Optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the author or other moderators..."
              className="mt-2 w-full rounded-lg border border-border p-3 text-sm"
              rows={4}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                openDialog === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : openDialog === "request_changes"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : ""
              }
              onClick={() => openDialog && handleDecision(openDialog)}
            >
              {openDialog === "approve" && "Approve Chapter"}
              {openDialog === "reject" && "Reject Chapter"}
              {openDialog === "request_changes" && "Send Change Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  );
}
