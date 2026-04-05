"use client";

import { useState } from "react";
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
import { ChevronDown, ChevronUp, Loader2, RefreshCcw } from "lucide-react";

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
  const [sectionsCollapsed, setSectionsCollapsed] = useState(false);
  const [openDialog, setOpenDialog] = useState<Decision | null>(null);
  const [note, setNote] = useState("");

  const actionConfigs: Array<{
    action: Decision;
    label: string;
    variant: "default" | "outline" | "destructive" | "success";
    className?: string;
  }> =
    record.ai_status === "AI_BLOCK"
      ? [
          {
            action: "reject",
            label: "Reject Chapter",
            variant: "destructive",
          },
          {
            action: "approve",
            label: "Mark Safe",
            variant: "success",
            className:
              "bg-emerald-500 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-600",
          },
        ]
      : record.ai_status === "AI_WARN"
      ? [
          {
            action: "approve",
            label: "Mark Safe",
            variant: "success",
            className:
              "bg-emerald-500 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-600",
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
            label: "Mark Safe",
            variant: "success",
            className:
              "bg-emerald-500 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-600",
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

  const toggleSections = () => {
    setSectionsCollapsed((previous) => !previous);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <Card className="p-6">
        <button
          type="button"
          onClick={toggleSections}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
          aria-expanded={!sectionsCollapsed}
        >
          <div>
            <h3 className="font-semibold text-slate-900">Chapter Information</h3>
            <p className="mt-1 text-xs text-slate-500">
              {sectionsCollapsed ? "Expand section" : "Collapse section"}
            </p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm">
            {sectionsCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </span>
        </button>

        {!sectionsCollapsed && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-4">
              <InfoItem label="Title" value={record.chapterTitle ?? "Untitled"} />
              <InfoItem label="Manga" value={record.mangaTitle ?? "-"} />
            </div>

            <div className="space-y-4">
              <InfoItem label="Author" value={record.authorName ?? "-"} />
              <InfoItem label="Author Email" value={record.authorEmail || "-"} />
            </div>

            <div className="space-y-4">
              <InfoItem
                label="Created"
                value={
                  record.createdAt
                    ? new Date(record.createdAt).toLocaleString()
                    : "-"
                }
              />
              <InfoItem
                label="Updated"
                value={new Date(record.updatedAt).toLocaleString()}
              />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <button
          type="button"
          onClick={toggleSections}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
          aria-expanded={!sectionsCollapsed}
        >
          <div>
            <h3 className="font-semibold text-slate-900">AI Analysis Result</h3>
            <p className="mt-1 text-xs text-slate-500">
              {sectionsCollapsed ? "Expand section" : "Collapse section"}
            </p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm">
            {sectionsCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </span>
        </button>

        {!sectionsCollapsed && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={record.ai_status ?? "AI_PENDING"} />
                <ResolutionBadge status={record.resolution_status ?? "OPEN"} />
              </div>

              <div className="flex items-center gap-2">
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

            {record.resolution_status !== "OPEN" && (
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-medium">Current Moderator Resolution</p>
                  <ResolutionBadge status={record.resolution_status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {record.resolution_status === "APPROVED" &&
                    "This chapter was marked safe by a moderator for the current version. The author's publish choice stays in effect until the content changes again."}
                  {record.resolution_status === "REJECTED" &&
                    "A moderator rejected the current version of this chapter. It stays unpublished until the author updates the content again."}
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

            <div className="border-t pt-4">
              <div className="mb-3">
                <p className="font-medium">Moderator Action</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
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
        )}
      </Card>

      <AlertDialog
        open={!!openDialog}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {openDialog === "approve" && "Mark Chapter Safe"}
              {openDialog === "reject" && "Reject Chapter"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {openDialog === "approve" &&
                "This will record the current version as safe without changing the author's publish choice."}
              {openDialog === "reject" &&
                "This will reject the current version and unpublish the chapter."}
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
                  : "bg-emerald-500 text-white hover:bg-emerald-600"
              }
              onClick={() => openDialog && handleDecision(openDialog)}
            >
              {openDialog === "approve" && "Mark Chapter Safe"}
              {openDialog === "reject" && "Reject Chapter"}
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
