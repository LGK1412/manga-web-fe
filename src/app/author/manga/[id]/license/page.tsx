"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
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
import {
  LICENSE_STATUS_META,
  getLatestRejectReason,
  normalizeLicenseStatus,
  normalizeRejectReasonHistory,
  normalizeStoryRightsResponse,
  type StoryRightsResponse,
} from "@/lib/story-rights";

type MangaDetailResponse = {
  _id: string;
  title: string;
  coverImage?: string;
};

function getAssetCandidates(apiBase: string, filePath?: string) {
  if (!filePath) return [];
  if (/^https?:\/\//i.test(filePath)) return [filePath];
  if (filePath.startsWith("/")) return [`${apiBase}${filePath}`];
  if (filePath.includes("assets/licenses")) {
    return [`${apiBase}/${filePath.replace(/^\/+/, "")}`];
  }
  return [`${apiBase}/assets/licenses/${filePath.replace(/^\/+/, "")}`];
}

function formatDateTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getReviewCopy(status: "none" | "pending" | "approved" | "rejected") {
  switch (status) {
    case "approved":
      return {
        title: "Approved",
        description:
          "Your proof images have been approved. Upload is now locked, and re-upload is only available after rejection.",
      };
    case "pending":
      return {
        title: "Under review",
        description:
          "Your proof images are being reviewed. Wait for Review Actions. You can upload again only after rejection.",
      };
    case "rejected":
      return {
        title: "Needs re-upload",
        description:
          "Your previous submission was rejected. Upload clearer proof images and submit again.",
      };
    default:
      return {
        title: "No proof submitted",
        description:
          "Upload proof images for this story to start the review process.",
      };
  }
}

function getFileLabel(index: number) {
  return `File ${index + 1}`;
}

function getUploadLockCopy(status: "none" | "pending" | "approved" | "rejected") {
  switch (status) {
    case "approved":
      return "Upload is locked because this license has already been approved. Re-upload is only available after rejection.";
    case "pending":
      return "Upload is locked while the current submission is waiting for Review Actions. You can upload again only after rejection.";
    default:
      return null;
  }
}

export default function AuthorMangaLicensePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, ""),
    [],
  );

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${apiBase}/api`,
      withCredentials: true,
    });
  }, [apiBase]);

  const [story, setStory] = useState<MangaDetailResponse | null>(null);
  const [rightsPayload, setRightsPayload] = useState<StoryRightsResponse | null>(
    null,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const coverUrl = (coverImage?: string) => {
    if (!coverImage) return "";
    if (/^https?:\/\//i.test(coverImage)) return coverImage;
    if (coverImage.startsWith("/")) return `${apiBase}${coverImage}`;
    return `${apiBase}/assets/coverImages/${coverImage}`;
  };

  const fetchStory = useCallback(async () => {
    const res = await api.get<MangaDetailResponse>(`/manga/author/story/${id}`);
    setStory(res.data);
  }, [api, id]);

  const fetchLicense = useCallback(async () => {
    const res = await api.get<StoryRightsResponse>(`/license/${id}/rights`);
    setRightsPayload(res.data);
  }, [api, id]);

  useEffect(() => {
    if (!id) return;

    const loadAll = async () => {
      try {
        setIsInitialLoading(true);
        setStatusError(null);
        await Promise.all([fetchStory(), fetchLicense()]);
      } catch (err: any) {
        setStatusError(
          err?.response?.data?.message || "Failed to load proof upload page.",
        );
      } finally {
        setIsInitialLoading(false);
      }
    };

    void loadAll();
  }, [fetchLicense, fetchStory, id]);

  const handleUploadProof = async () => {
    const normalizedLicense = normalizeLicenseStatus(rightsPayload?.licenseStatus);
    const uploadLockReason = getUploadLockCopy(normalizedLicense);

    if (uploadLockReason) {
      setStatusError(uploadLockReason);
      return;
    }

    if (!files.length) {
      setStatusError("Please select at least one image.");
      return;
    }

    const invalidFile = files.find((file) => !file.type.startsWith("image/"));
    if (invalidFile) {
      setStatusError("Only image files are allowed.");
      return;
    }

    try {
      setIsUploadingProof(true);
      setStatusError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      await api.post(`/license/${id}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchLicense();
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMessage("Proof images uploaded and submitted for review.");
    } catch (err: any) {
      setStatusError(
        err?.response?.data?.message || "Failed to upload proof images.",
      );
    } finally {
      setIsUploadingProof(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 pb-10 pt-24">
          <div className="flex h-[50vh] items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading proof upload page...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rights = normalizeStoryRightsResponse(rightsPayload);
  const normalizedLicense = normalizeLicenseStatus(rightsPayload?.licenseStatus);
  const licenseMeta =
    LICENSE_STATUS_META[
      normalizedLicense as keyof typeof LICENSE_STATUS_META
    ];
  const reviewCopy = getReviewCopy(normalizedLicense);
  const uploadLockReason = getUploadLockCopy(normalizedLicense);
  const isUploadLocked = Boolean(uploadLockReason);
  const proofFiles = rights.proofFiles || [];
  const canPublish = Boolean(
    rightsPayload?.publishEligibility?.canPublish ?? rightsPayload?.canPublish,
  );
  const publishReason =
    rightsPayload?.publishEligibility?.reason ||
    rightsPayload?.publishReason ||
    (canPublish
      ? "This story currently satisfies the backend publish policy."
      : "Upload proof images and wait for approval before publishing.");
  const selectedFilesSizeMb =
    files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;
  const submittedAt = formatDateTime(rightsPayload?.licenseSubmittedAt);
  const reviewedAt = formatDateTime(rightsPayload?.licenseReviewedAt);
  const rejectReasonSource = {
    licenseRejectReason: rightsPayload?.licenseRejectReason,
    licenseRejectReasons: rightsPayload?.licenseRejectReasons,
    rights: {
      rejectReason: rights.rejectReason,
    },
  };
  const reviewerFeedback =
    getLatestRejectReason(rejectReasonSource) || rights.rejectReason || "";
  const rejectReasonHistory = normalizeRejectReasonHistory(rejectReasonSource);
  const previousRejectReasons =
    rejectReasonHistory.length > 1
      ? rejectReasonHistory.slice(0, rejectReasonHistory.length - 1).reverse()
      : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 pb-12 pt-24">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/author/dashboard">
              <Button
                variant="ghost"
                className="mb-3 gap-2 px-0 text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">Proof Image Upload</h1>
                {rightsPayload?.verifiedBadge ? (
                  <Badge className="gap-1 bg-green-600 text-white">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </Badge>
                ) : null}
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                Upload the images that prove you have permission to publish this
                story. Review status and feedback will appear here.
              </p>
            </div>
          </div>

          <Badge className={`border ${licenseMeta.className}`}>
            Review: {licenseMeta.label}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {statusError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{statusError}</AlertDescription>
              </Alert>
            ) : null}

            {successMessage ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            ) : null}

            {uploadLockReason ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Upload locked</AlertTitle>
                <AlertDescription>{uploadLockReason}</AlertDescription>
              </Alert>
            ) : null}

            {reviewerFeedback ? (
              <Alert
                variant="destructive"
                className="border-red-200 bg-red-50 text-red-900 dark:text-red-100"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Reviewer feedback</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{reviewerFeedback}</p>
                  {previousRejectReasons.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700/80 dark:text-red-200">
                        Earlier review notes
                      </p>
                      <div className="space-y-2">
                        {previousRejectReasons.map((reason, index) => (
                          <div
                            key={`${reason}-${index}`}
                            className="rounded-xl border border-red-200/80 bg-white/50 px-3 py-2 dark:border-red-900/50 dark:bg-black/10"
                          >
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle>Upload Proof Images</CardTitle>
                <CardDescription>
                  Only image files are allowed. Upload screenshots, contracts,
                  chats, or other visual proof that supports your rights. After
                  submission, re-upload is only available if moderators reject
                  the current proof set.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-6">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge className="border border-border/70 bg-background text-muted-foreground">
                    Max 5 files
                  </Badge>
                  <Badge className="border border-border/70 bg-background text-muted-foreground">
                    Up to 10 MB each
                  </Badge>
                  <Badge className="border border-border/70 bg-background text-muted-foreground">
                    JPG, PNG, WEBP, GIF
                  </Badge>
                </div>

                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Choose images</p>
                      <p className="text-sm text-muted-foreground">
                        Pick the proof images you want to submit for review.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadLocked}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Select images
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    disabled={isUploadLocked}
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />

                  {files.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge className="border border-border/70 bg-background text-muted-foreground">
                          {files.length} selected
                        </Badge>
                        <Badge className="border border-border/70 bg-background text-muted-foreground">
                          {selectedFilesSizeMb.toFixed(2)} MB total
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
                          >
                            <span className="truncate pr-3">
                              {getFileLabel(index)}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-border/70 bg-background px-4 py-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <UploadCloud className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="mt-3 font-medium text-foreground">
                        No images selected yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Select one or more images, then submit them for review.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleUploadProof}
                    disabled={isUploadLocked || isUploadingProof || files.length === 0}
                    className="rounded-xl"
                  >
                    {isUploadingProof ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upload Images
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isUploadLocked || isUploadingProof}
                    className="rounded-xl"
                    onClick={() => {
                      setFiles([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Clear selection
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle>Current Proof Images</CardTitle>
                <CardDescription>
                  These are the images currently attached to this story.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                {proofFiles.length > 0 ? (
                  <div className="space-y-2">
                    {proofFiles.map((file, index) => {
                      const url = getAssetCandidates(apiBase, file)[0];

                      return (
                        <a
                          key={`${file}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-3 text-sm transition hover:bg-muted/30"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <ImageIcon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{getFileLabel(index)}</span>
                          </span>

                          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    No proof images uploaded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Story</CardTitle>
                <CardDescription>
                  Check that you are uploading proof for the correct story.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                  {story?.coverImage ? (
                    <img
                      src={coverUrl(story.coverImage)}
                      alt={story.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No cover
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Title
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {story?.title || "Untitled"}
                  </p>
                </div>

                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link href={`/author/story/edit/${id}`}>Back to Edit Story</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Review Status</CardTitle>
                <CardDescription>
                  Keep track of approval progress and publish eligibility.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Badge className={`border ${licenseMeta.className}`}>
                  Review: {licenseMeta.label}
                </Badge>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="font-medium text-foreground">{reviewCopy.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {reviewCopy.description}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    canPublish
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                  }`}
                >
                  <p className="font-medium">
                    {canPublish ? "Eligible to publish" : "Cannot publish yet"}
                  </p>
                  <p className="mt-1">{publishReason}</p>
                </div>

                {(submittedAt || reviewedAt) && (
                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <p className="text-sm font-medium text-foreground">
                      Review timeline
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {submittedAt ? (
                        <div className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>Submitted: {submittedAt}</span>
                        </div>
                      ) : null}

                      {reviewedAt ? (
                        <div className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>Reviewed: {reviewedAt}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
