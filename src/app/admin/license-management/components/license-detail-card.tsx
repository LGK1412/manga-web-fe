import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  LICENSE_STATUS_META,
  RIGHTS_STATUS_META,
} from "@/lib/story-rights";

import {
  type ActionFeedback,
  type ActionState,
  type LicenseDetail,
} from "../license-management.types";
import { TheoryLookupCard } from "./theory-lookup-card";

type LicenseDetailCardProps = {
  selected: LicenseDetail | null;
  detailLoading: boolean;
  selectedLatestRejectReason?: string | null;
  previousSelectedRejectReasons: string[];
  selectedProofCount: number;
  currentFile?: string;
  currentFileUrl?: string;
  currentFileIsPdf: boolean;
  selectedFileIndex: number;
  actionFeedback: ActionFeedback | null;
  rejectionReason: string;
  actionState: ActionState;
  isActionBusy: boolean;
  isReviewBusy: boolean;
  onSelectFileIndex: (index: number) => void;
  onRejectionReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  getCoverUrl: (coverImage?: string) => string | undefined;
};

export function LicenseDetailCard({
  selected,
  detailLoading,
  selectedLatestRejectReason,
  previousSelectedRejectReasons,
  selectedProofCount,
  currentFile,
  currentFileUrl,
  currentFileIsPdf,
  selectedFileIndex,
  actionFeedback,
  rejectionReason,
  actionState,
  isActionBusy,
  isReviewBusy,
  onSelectFileIndex,
  onRejectionReasonChange,
  onApprove,
  onReject,
  getCoverUrl,
}: LicenseDetailCardProps) {
  if (detailLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Story Rights Detail</CardTitle>
          <CardDescription>
            Review proof files and moderate the current submission.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex h-80 items-center justify-center">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading detail...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Story Rights Detail</CardTitle>
          <CardDescription>
            Review proof files and moderate the current submission.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Select a story from the queue.
          </div>
        </CardContent>
      </Card>
    );
  }

  const coverUrl = getCoverUrl(selected.coverImage);
  const currentFileLabel = currentFile
    ? `File ${selectedFileIndex + 1}`
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Story Rights Detail</CardTitle>
        <CardDescription>
          Review proof files and moderate the current submission.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="h-48 w-36 shrink-0 overflow-hidden rounded-xl border bg-gray-100">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={selected.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{selected.title}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Author: {selected.authorId?.username || "Unknown"}{" "}
                  {selected.authorId?.email ? `(${selected.authorId.email})` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  className={`border ${LICENSE_STATUS_META[selected.licenseStatus].className}`}
                >
                  License: {LICENSE_STATUS_META[selected.licenseStatus].label}
                </Badge>
                <Badge
                  className={`border ${RIGHTS_STATUS_META[selected.rightsStatus].className}`}
                >
                  Rights: {RIGHTS_STATUS_META[selected.rightsStatus].label}
                </Badge>
                <Badge
                  className={`border ${
                    selected.isPublish
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-gray-100 text-gray-700"
                  }`}
                >
                  {selected.isPublish ? "Published" : "Draft"}
                </Badge>
                {selected.verifiedBadge ? (
                  <Badge className="border border-green-200 bg-green-50 text-green-700">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    Verified
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <Separator />

          {selectedLatestRejectReason ||
          previousSelectedRejectReasons.length > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">
                {selected.licenseStatus === "rejected"
                  ? "Latest reject reason"
                  : "Reject history"}
              </p>
              {selectedLatestRejectReason ? (
                <p className="mt-1">{selectedLatestRejectReason}</p>
              ) : null}
              {previousSelectedRejectReasons.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700/80">
                    Earlier review notes
                  </p>
                  <div className="space-y-2">
                    {previousSelectedRejectReasons.map((reason, index) => (
                      <div
                        key={`${reason}-${index}`}
                        className="rounded-lg border border-red-200/80 bg-white/70 px-3 py-2"
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Proof Files</h3>
              <span className="text-sm text-gray-500">
                {selectedProofCount} attached
              </span>
            </div>

            {selected.licenseFiles && selected.licenseFiles.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selected.licenseFiles.map((file, index) => {
                    const active = index === selectedFileIndex;
                    const fileLabel = `File ${index + 1}`;

                    return (
                      <button
                        key={`${file}-${index}`}
                        onClick={() => onSelectFileIndex(index)}
                        className={[
                          "max-w-full rounded-full border px-3 py-1.5 text-sm",
                          active
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                        title={fileLabel}
                      >
                        <span className="block max-w-[240px] truncate">
                          {fileLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {currentFileUrl ? (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2">
                      <div className="truncate text-sm font-medium">
                        {currentFileLabel}
                      </div>
                      <a
                        href={currentFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        Open
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="h-[560px] bg-white">
                      {currentFileIsPdf ? (
                        <iframe
                          src={currentFileUrl}
                          className="h-full w-full"
                          title="Proof document"
                        />
                      ) : (
                        <img
                          src={currentFileUrl}
                          alt="Proof document"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                No proof files uploaded.
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
            <TheoryLookupCard />

            <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              {actionFeedback ? (
                <Alert
                  variant={
                    actionFeedback.tone === "error" ? "destructive" : "default"
                  }
                >
                  {actionFeedback.tone === "error" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertTitle>{actionFeedback.title}</AlertTitle>
                  <AlertDescription>{actionFeedback.message}</AlertDescription>
                </Alert>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Review Actions</CardTitle>
                  <CardDescription>
                    Approve or reject this submission after reviewing the proof
                    files above.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reject reason</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => onRejectionReasonChange(e.target.value)}
                      rows={5}
                      placeholder="Explain what is missing, unreadable, or still unclear in the proof files..."
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid gap-3">
                    <Button
                      onClick={onApprove}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isActionBusy}
                    >
                      {actionState === "approve" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Approve Submission
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={onReject}
                      disabled={isActionBusy}
                    >
                      {actionState === "reject" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Reject Submission
                    </Button>
                  </div>

                  {isReviewBusy ? (
                    <p className="text-xs text-gray-500">
                      Saving moderation result...
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
