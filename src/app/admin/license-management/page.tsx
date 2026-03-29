"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertTriangle, Loader2 } from "lucide-react";

import AdminLayout from "../adminLayout/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getLatestRejectReason,
  normalizeRejectReasonHistory,
} from "@/lib/story-rights";

import { LicenseDetailCard } from "./components/license-detail-card";
import { ModerationQueueCard } from "./components/moderation-queue-card";
import { PublishingControlsCard } from "./components/publishing-controls-card";
import { QuickFactsCard } from "./components/quick-facts-card";
import { QueueMetricCard } from "./components/queue-metric-card";
import {
  type ActionFeedback,
  type ActionState,
  type FetchQueueOptions,
  type LicenseDetail,
  type LicenseQueueResponse,
  type MangaLicenseStatus,
  type QueueItem,
} from "./license-management.types";
import {
  formatDateTime,
  getAssetCandidates,
  getDecisionSummary,
} from "./license-management.utils";

export default function AdminStoryRightsModerationPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<LicenseDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    MangaLicenseStatus | "all"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({
    none: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(
    null,
  );

  const [rejectionReason, setRejectionReason] = useState("");
  const [publishAfterApprove, setPublishAfterApprove] = useState(true);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  const apiBase = useMemo(() => {
    return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  }, []);

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${apiBase}/api`,
      withCredentials: true,
    });
  }, [apiBase]);

  const getFileUrl = (filePath?: string) =>
    getAssetCandidates(apiBase, filePath, "assets/licenses")[0];
  const getCoverUrl = (coverImage?: string) =>
    getAssetCandidates(apiBase, coverImage, "assets/coverImages")[0];

  const fetchDetail = async (mangaId: string) => {
    try {
      setDetailLoading(true);
      setActionFeedback(null);

      const res = await api.get<LicenseDetail>(`/license/${mangaId}`);
      setSelected(res.data);
      setSelectedFileIndex(0);
      setRejectionReason("");
      setPublishAfterApprove(true);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load story detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchQueue = async (
    nextPage = page,
    options: FetchQueueOptions = {},
  ) => {
    try {
      setLoading(true);

      const res = await api.get<LicenseQueueResponse>("/license/queue", {
        params: {
          status: statusFilter,
          q: searchQuery.trim(),
          page: nextPage,
          limit,
        },
      });

      if (res.data.data.length === 0 && res.data.total > 0 && nextPage > 1) {
        await fetchQueue(nextPage - 1, options);
        return;
      }

      setItems(res.data.data);
      setStats(res.data.stats);
      setPage(res.data.page);
      setTotal(res.data.total);
      setError(null);

      const preferredSelectedId =
        options.preferredSelectedId === undefined
          ? (selected?._id ?? null)
          : options.preferredSelectedId;
      const nextSelectedId =
        preferredSelectedId &&
        res.data.data.some((item) => item._id === preferredSelectedId)
          ? preferredSelectedId
          : (res.data.data[0]?._id ?? null);

      if (!nextSelectedId) {
        setSelected(null);
        return;
      }

      if (
        !selected ||
        selected._id !== nextSelectedId ||
        options.forceDetailRefresh
      ) {
        await fetchDetail(nextSelectedId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load moderation queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQueue(1);
    }, 300);

    return () => clearTimeout(timer);
    // This effect intentionally reacts only to search/filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  const currentFile =
    selected &&
    selected.licenseFiles &&
    selected.licenseFiles.length > 0 &&
    selectedFileIndex < selected.licenseFiles.length
      ? selected.licenseFiles[selectedFileIndex]
      : undefined;

  const currentFileUrl = currentFile ? getFileUrl(currentFile) : undefined;
  const currentFileIsPdf =
    typeof currentFile === "string" && currentFile.toLowerCase().endsWith(".pdf");
  const selectedRejectReasonHistory = useMemo(
    () => normalizeRejectReasonHistory(selected),
    [selected],
  );
  const selectedLatestRejectReason = useMemo(
    () => getLatestRejectReason(selected),
    [selected],
  );
  const previousSelectedRejectReasons = useMemo(
    () =>
      selectedRejectReasonHistory.length > 1
        ? selectedRejectReasonHistory
            .slice(0, selectedRejectReasonHistory.length - 1)
            .reverse()
        : [],
    [selectedRejectReasonHistory],
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const queueStart = items.length === 0 ? 0 : (page - 1) * limit + 1;
  const queueEnd = items.length === 0 ? 0 : queueStart + items.length - 1;
  const selectedDecisionSummary = selected
    ? getDecisionSummary(selected, selectedLatestRejectReason)
    : null;
  const selectedQueueIndex = selected
    ? items.findIndex((item) => item._id === selected._id)
    : -1;
  const hasReviewPrevious = selectedQueueIndex > 0;
  const hasReviewNext =
    selectedQueueIndex >= 0 && selectedQueueIndex < items.length - 1;
  const reviewPositionLabel =
    selectedQueueIndex >= 0
      ? `Review ${selectedQueueIndex + 1} of ${items.length} on this page`
      : "Select a story to start reviewing";
  const selectedProofCount = selected?.licenseFiles?.length || 0;
  const formattedSubmittedAt = formatDateTime(selected?.licenseSubmittedAt);
  const formattedReviewedAt = formatDateTime(selected?.licenseReviewedAt);
  const isActionBusy = actionState !== null;
  const isReviewBusy = actionState === "approve" || actionState === "reject";
  const isPublishBusy = actionState === "publish" || actionState === "unpublish";

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selected) return;

    if (status === "rejected" && !rejectionReason.trim()) {
      setActionFeedback({
        tone: "error",
        title: "Reject reason required",
        message:
          "Explain what proof is missing, inconsistent, or still unclear before rejecting the submission.",
      });
      return;
    }

    try {
      setActionState(status === "approved" ? "approve" : "reject");
      setActionFeedback(null);
      setError(null);

      await api.patch(`/license/${selected._id}/review`, {
        status,
        rejectReason: status === "rejected" ? rejectionReason.trim() : "",
        publishAfterApprove: status === "approved" ? publishAfterApprove : false,
      });

      await fetchQueue(page, {
        preferredSelectedId: selected._id,
        forceDetailRefresh: true,
      });

      setActionFeedback({
        tone: "success",
        title:
          status === "approved"
            ? "Submission approved"
            : "Submission rejected",
        message:
          statusFilter === "pending"
            ? "Queue refreshed. The next pending story is ready for review."
            : "The moderation result was saved and the detail panel was refreshed.",
      });
    } catch (err: any) {
      setActionFeedback({
        tone: "error",
        title: "Review failed",
        message: err?.response?.data?.message || "Failed to save moderation result.",
      });
    } finally {
      setActionState(null);
    }
  };

  const handleTogglePublish = async (nextPublish: boolean) => {
    if (!selected) return;

    try {
      setActionState(nextPublish ? "publish" : "unpublish");
      setActionFeedback(null);
      setError(null);

      await api.patch(`/manga/admin/story/${selected._id}/publish`, {
        isPublish: nextPublish,
      });

      await fetchQueue(page, {
        preferredSelectedId: selected._id,
        forceDetailRefresh: true,
      });

      setActionFeedback({
        tone: "success",
        title: nextPublish ? "Story published" : "Story unpublished",
        message: nextPublish
          ? "Publishing was enabled successfully."
          : "Publishing was turned off successfully.",
      });
    } catch (err: any) {
      setActionFeedback({
        tone: "error",
        title: "Publish update failed",
        message:
          err?.response?.data?.message || "Failed to update publish status.",
      });
    } finally {
      setActionState(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Story Rights Moderation</h1>
            <p className="text-sm text-gray-600">
              Review proof documents, inspect rights metadata, and control
              publishing with a clearer moderation flow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(["pending", "approved", "rejected", "none"] as const).map((key) => (
              <QueueMetricCard
                key={key}
                label={key}
                value={stats[key] || 0}
              />
            ))}
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading moderation queue...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
            <div className="space-y-6">
              <ModerationQueueCard
                items={items}
                total={total}
                queueStart={queueStart}
                queueEnd={queueEnd}
                page={page}
                totalPages={totalPages}
                selectedId={selected?._id ?? null}
                statusFilter={statusFilter}
                searchQuery={searchQuery}
                loading={loading}
                onStatusFilterChange={(value) => {
                  setStatusFilter(value);
                  setActionFeedback(null);
                }}
                onSearchQueryChange={(value) => {
                  setSearchQuery(value);
                  setActionFeedback(null);
                }}
                onSelectItem={fetchDetail}
                onPreviousPage={() =>
                  fetchQueue(page - 1, {
                    preferredSelectedId: selected?._id ?? null,
                  })
                }
                onNextPage={() =>
                  fetchQueue(page + 1, {
                    preferredSelectedId: selected?._id ?? null,
                  })
                }
                getCoverUrl={getCoverUrl}
              />

              <QuickFactsCard />

              <PublishingControlsCard
                isPublished={selected?.isPublish}
                isActionBusy={isActionBusy}
                isPublishBusy={isPublishBusy}
                onTogglePublish={() => handleTogglePublish(!selected?.isPublish)}
              />
            </div>

            <LicenseDetailCard
              selected={selected}
              detailLoading={detailLoading}
              selectedLatestRejectReason={selectedLatestRejectReason}
              previousSelectedRejectReasons={previousSelectedRejectReasons}
              selectedDecisionSummary={selectedDecisionSummary}
              reviewPositionLabel={reviewPositionLabel}
              hasReviewPrevious={hasReviewPrevious}
              hasReviewNext={hasReviewNext}
              selectedProofCount={selectedProofCount}
              formattedSubmittedAt={formattedSubmittedAt}
              formattedReviewedAt={formattedReviewedAt}
              currentFile={currentFile}
              currentFileUrl={currentFileUrl}
              currentFileIsPdf={currentFileIsPdf}
              selectedFileIndex={selectedFileIndex}
              actionFeedback={actionFeedback}
              rejectionReason={rejectionReason}
              publishAfterApprove={publishAfterApprove}
              actionState={actionState}
              isActionBusy={isActionBusy}
              isReviewBusy={isReviewBusy}
              isPublishBusy={isPublishBusy}
              onSelectFileIndex={setSelectedFileIndex}
              onRejectionReasonChange={setRejectionReason}
              onPublishAfterApproveChange={setPublishAfterApprove}
              onApprove={() => handleReview("approved")}
              onReject={() => handleReview("rejected")}
              onReviewPrevious={
                hasReviewPrevious
                  ? () => fetchDetail(items[selectedQueueIndex - 1]._id)
                  : undefined
              }
              onReviewNext={
                hasReviewNext
                  ? () => fetchDetail(items[selectedQueueIndex + 1]._id)
                  : undefined
              }
              getCoverUrl={getCoverUrl}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
