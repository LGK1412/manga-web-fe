"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskMeter } from "../risk-meter";
import { StatusBadge } from "../status-badge";
import type { ModerationRecord, Decision } from "@/lib/typesLogs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";

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

  const handleDecision = async (action: Decision) => {
    await onDecision(action, note);
    setOpenDialog(null);
    setNote("");
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Chapter Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="font-medium">{record.chapterTitle ?? "Untitled"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Author</p>
            <p className="font-medium">{record.authorName ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Updated</p>
            <p className="font-medium">{new Date(record.updatedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Policy Version</p>
            <p className="font-medium">{record.policy_version}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">AI Analysis Result</h3>
            <StatusBadge status={record.ai_status ?? "AI_PENDING"} />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Risk Score</p>
            <RiskMeter score={record.risk_score} />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Detection Model</p>
            <p className="font-medium">{record.ai_model || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Detected Issues</p>
            <div className="flex flex-wrap gap-2">
              {record.labels.length > 0
                ? record.labels.map((label) => <Badge key={label} variant="secondary">{label}</Badge>)
                : <span className="text-sm text-muted-foreground">No issues detected</span>}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-4">Moderator Action</h3>
        <div className="space-y-3">
          <Button className="w-full justify-start" disabled={loading} onClick={() => setOpenDialog("approve")}>
            Approve & Publish
          </Button>
          <Button variant="destructive" className="w-full justify-start" disabled={loading} onClick={() => setOpenDialog("reject")}>
            Reject
          </Button>
          <Button variant="outline" className="w-full justify-start bg-transparent" disabled={loading} onClick={() => setOpenDialog("request_changes")}>
            Request Changes
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            disabled={isRunningAI || loading}
            onClick={async () => {
              setIsRunningAI(true);
              try { await onRecheck(); } finally { setIsRunningAI(false); }
            }}
          >
            {isRunningAI && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Recheck with AI
          </Button>
        </div>
      </Card>

      <AlertDialog open={!!openDialog} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {openDialog === "approve" && "Approve Chapter"}
              {openDialog === "reject" && "Reject Chapter"}
              {openDialog === "request_changes" && "Request Changes"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {openDialog === "approve" && "This will publish the chapter to users."}
              {openDialog === "reject" && "This will reject the chapter and notify the author."}
              {openDialog === "request_changes" && "Request the author to make changes before publishing."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label className="text-sm font-medium">Note (Optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the author or other moderators..."
              className="w-full mt-2 p-2 border border-border rounded-lg text-sm"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => openDialog && handleDecision(openDialog)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
