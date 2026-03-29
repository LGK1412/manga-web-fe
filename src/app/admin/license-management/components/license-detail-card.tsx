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
  type DecisionSummary,
  type LicenseDetail,
} from "../license-management.types";
import { DetailMetric } from "./detail-metric";
import { InfoBlock } from "./info-block";

type LicenseDetailCardProps = {
  selected: LicenseDetail | null;
  detailLoading: boolean;
  selectedLatestRejectReason?: string | null;
  previousSelectedRejectReasons: string[];
  selectedDecisionSummary: DecisionSummary | null;
  reviewPositionLabel: string;
  hasReviewPrevious: boolean;
  hasReviewNext: boolean;
  selectedProofCount: number;
  formattedSubmittedAt: string;
  formattedReviewedAt: string;
  currentFile?: string;
  currentFileUrl?: string;
  currentFileIsPdf: boolean;
  selectedFileIndex: number;
  actionFeedback: ActionFeedback | null;
  rejectionReason: string;
  publishAfterApprove: boolean;
  actionState: ActionState;
  isActionBusy: boolean;
  isReviewBusy: boolean;
  isPublishBusy: boolean;
  onSelectFileIndex: (index: number) => void;
  onRejectionReasonChange: (value: string) => void;
  onPublishAfterApproveChange: (value: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onReviewPrevious?: () => void;
  onReviewNext?: () => void;
  getCoverUrl: (coverImage?: string) => string | undefined;
};

export function LicenseDetailCard({
  selected,
  detailLoading,
  selectedLatestRejectReason,
  previousSelectedRejectReasons,
  selectedDecisionSummary,
  reviewPositionLabel,
  hasReviewPrevious,
  hasReviewNext,
  selectedProofCount,
  formattedSubmittedAt,
  formattedReviewedAt,
  currentFile,
  currentFileUrl,
  currentFileIsPdf,
  selectedFileIndex,
  actionFeedback,
  rejectionReason,
  publishAfterApprove,
  actionState,
  isActionBusy,
  isReviewBusy,
  isPublishBusy,
  onSelectFileIndex,
  onRejectionReasonChange,
  onPublishAfterApproveChange,
  onApprove,
  onReject,
  onReviewPrevious,
  onReviewNext,
  getCoverUrl,
}: LicenseDetailCardProps) {
  if (detailLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Story Rights Detail</CardTitle>
          <CardDescription>
            Review rights metadata, proof files, and publish controls.
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

  if (!selected || !selectedDecisionSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Story Rights Detail</CardTitle>
          <CardDescription>
            Review rights metadata, proof files, and publish controls.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Story Rights Detail</CardTitle>
        <CardDescription>
          Review rights metadata, proof files, and publish controls.
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

              <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock label="Origin" value={selected.originType} />
                <InfoBlock
                  label="Monetization"
                  value={selected.monetizationType}
                />
                <InfoBlock label="Rights basis" value={selected.rightsBasis} />
                <InfoBlock
                  label="Enforcement"
                  value={selected.enforcementStatus || "normal"}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Rights Metadata</h3>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoBlock
                    label="Source title"
                    value={selected.rights?.sourceTitle}
                  />
                  <InfoBlock
                    label="Source URL"
                    value={selected.rights?.sourceUrl}
                    isLink
                  />
                  <InfoBlock
                    label="License name"
                    value={selected.rights?.licenseName}
                  />
                  <InfoBlock
                    label="License URL"
                    value={selected.rights?.licenseUrl}
                    isLink
                  />
                  <InfoBlock
                    label="Claim status"
                    value={selected.rights?.claimStatus || "none"}
                  />
                  <InfoBlock
                    label="Submitted at"
                    value={selected.licenseSubmittedAt}
                    isDate
                  />
                  <InfoBlock
                    label="Reviewed at"
                    value={selected.licenseReviewedAt}
                    isDate
                  />
                  <InfoBlock
                    label="Proof note"
                    value={selected.rights?.proofNote || selected.licenseNote}
                  />
                </div>

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
              </div>

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
                        const fileLabel =
                          file.split("/").pop() || `File ${index + 1}`;

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
                            {currentFile?.split("/").pop()}
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
            </div>

            <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div
                className={`rounded-xl border p-4 ${selectedDecisionSummary.toneClassName}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Decision Summary
                </p>
                <p className="mt-2 text-base font-semibold">
                  {selectedDecisionSummary.title}
                </p>
                <p className="mt-2 text-sm leading-6">
                  {selectedDecisionSummary.description}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <DetailMetric
                    label="Proof Files"
                    value={String(selectedProofCount)}
                    hint={
                      selectedProofCount > 0
                        ? "Open the attachments and confirm they match the claimed rights."
                        : "No evidence uploaded yet."
                    }
                  />
                  <DetailMetric
                    label="Submitted"
                    value={formattedSubmittedAt || "Not submitted"}
                    hint="Use this to prioritize older pending cases first."
                  />
                  <DetailMetric
                    label="Reviewed"
                    value={formattedReviewedAt || "Not reviewed"}
                    hint="Latest moderation timestamp for this story."
                  />
                </div>
              </div>

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
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Review Sequence
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {reviewPositionLabel}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={onReviewPrevious}
                      disabled={!hasReviewPrevious}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={onReviewNext}
                      disabled={!hasReviewNext}
                    >
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Review Actions</CardTitle>
                  <CardDescription>
                    Approve or reject this submission.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-500" />
                      <div>
                        <p className="font-medium">Review carefully</p>
                        <p className="mt-1 text-gray-600">
                          Pending view: save to jump to the next case.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reject reason</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => onRejectionReasonChange(e.target.value)}
                      rows={4}
                      placeholder="Explain why this submission is rejected..."
                      className="rounded-xl"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border p-4">
                    <input
                      type="checkbox"
                      checked={publishAfterApprove}
                      onChange={(e) =>
                        onPublishAfterApproveChange(e.target.checked)
                      }
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium">Publish after approve</p>
                      <p className="text-sm text-gray-600">
                        Use only for immediate go-live.
                      </p>
                    </div>
                  </label>

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
