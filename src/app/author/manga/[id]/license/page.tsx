"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StoryRightsSection } from "@/components/story-rights/story-rights-section";
import {
  buildRightsPayload,
  evaluateClientPublishReadiness,
  getDefaultRights,
  LICENSE_STATUS_META,
  RIGHTS_STATUS_META,
  type StoryRights,
  type StoryRightsResponse,
} from "@/lib/story-rights";

type MangaDetailResponse = {
  _id: string;
  title: string;
  coverImage?: string;
};

function getAssetCandidates(
  apiBase: string,
  filePath?: string,
  folder = "assets/licenses",
) {
  if (!filePath) return [];
  if (/^https?:\/\//i.test(filePath)) return [filePath];
  if (filePath.startsWith("/")) return [`${apiBase}${filePath}`];
  if (filePath.includes(folder)) {
    return [`${apiBase}/${filePath.replace(/^\/+/, "")}`];
  }
  return [`${apiBase}/${folder}/${filePath.replace(/^\/+/, "")}`];
}

function normalizeLicenseStatus(input?: string) {
  const value = String(input || "none").toLowerCase();
  if (value === "pending") return "pending";
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "none";
}

function normalizeRightsResponse(payload: StoryRightsResponse | null | undefined): StoryRights {
  return {
    ...getDefaultRights(),
    ...(payload?.rights || {}),
  };
}

export default function AuthorStoryLicensePage() {
  const params = useParams();
  const id = Array.isArray((params as any)?.id)
    ? (params as any).id[0]
    : (params as any)?.id;

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
  const [rightsPayload, setRightsPayload] = useState<StoryRightsResponse | null>(null);
  const [rights, setRights] = useState<StoryRights>(getDefaultRights());

  const [files, setFiles] = useState<File[]>([]);
  const [uploadNote, setUploadNote] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSavingRights, setIsSavingRights] = useState(false);
  const [isSavingDeclaration, setIsSavingDeclaration] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const coverUrl = (coverImage?: string) => {
    if (!coverImage) return "";
    if (/^https?:\/\//i.test(coverImage)) return coverImage;
    if (coverImage.startsWith("/")) return `${apiBase}${coverImage}`;
    return `${apiBase}/assets/coverImages/${coverImage}`;
  };

  const fetchStory = async () => {
    const res = await api.get<MangaDetailResponse>(`/manga/author/story/${id}`);
    setStory(res.data);
  };

  const fetchRights = async () => {
    const res = await api.get<StoryRightsResponse>(`/manga/${id}/rights`);
    setRightsPayload(res.data);
    const normalized = normalizeRightsResponse(res.data);
    setRights(normalized);
    setUploadNote(normalized.proofNote || "");
  };

  const loadAll = async () => {
    try {
      setIsInitialLoading(true);
      setStatusError(null);
      await Promise.all([fetchStory(), fetchRights()]);
    } catch (err: any) {
      setStatusError(err?.response?.data?.message || "Failed to load story rights.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  const handleSaveRights = async () => {
    try {
      setIsSavingRights(true);
      setStatusError(null);
      setSuccessMessage(null);

      const res = await api.patch<StoryRightsResponse>(
        `/manga/${id}/rights`,
        buildRightsPayload(rights),
      );

      setRightsPayload(res.data);
      setRights(normalizeRightsResponse(res.data));
      setSuccessMessage("Story rights information updated.");
    } catch (err: any) {
      setStatusError(err?.response?.data?.message || "Failed to save story rights.");
    } finally {
      setIsSavingRights(false);
    }
  };

  const handleSaveDeclaration = async () => {
    try {
      setIsSavingDeclaration(true);
      setStatusError(null);
      setSuccessMessage(null);

      const res = await api.patch<StoryRightsResponse>(
        `/manga/${id}/rights/declaration`,
        {
          accepted: rights.declarationAccepted,
          declarationVersion: rights.declarationVersion || "v1",
        },
      );

      setRightsPayload(res.data);
      setRights(normalizeRightsResponse(res.data));
      setSuccessMessage("Declaration updated.");
    } catch (err: any) {
      setStatusError(err?.response?.data?.message || "Failed to save declaration.");
    } finally {
      setIsSavingDeclaration(false);
    }
  };

  const handleUploadProof = async () => {
    if (!files.length) {
      setStatusError("Please select at least one proof file.");
      return;
    }

    try {
      setIsUploadingProof(true);
      setStatusError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("note", uploadNote);

      await api.post(`/manga/${id}/license`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchRights();
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMessage("Proof documents uploaded and submitted for review.");
    } catch (err: any) {
      setStatusError(err?.response?.data?.message || "Failed to upload proof files.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-6xl px-4 pb-10 pt-24">
          <div className="flex h-[50vh] items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading story rights...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const safeRights = rights;
  const rightsMeta =
    RIGHTS_STATUS_META[safeRights.reviewStatus || "not_required"];
  const licenseMeta =
    LICENSE_STATUS_META[
      normalizeLicenseStatus(rightsPayload?.licenseStatus) as keyof typeof LICENSE_STATUS_META
    ];
  const readiness =
    rightsPayload?.publishEligibility ||
    evaluateClientPublishReadiness(safeRights);
  const proofFiles = safeRights.proofFiles || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-6xl px-4 pb-12 pt-24">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/author/dashboard">
              <Button variant="ghost" className="mb-3 gap-2 px-0 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">Story Rights</h1>
                {rightsPayload?.verifiedBadge ? (
                  <Badge className="gap-1 bg-green-600 text-white">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground md:text-base">
                Manage ownership declaration, source/license references, and proof
                documents for this story.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={`border ${rightsMeta.className}`}>
              Rights: {rightsMeta.label}
            </Badge>
            <Badge className={`border ${licenseMeta.className}`}>
              Review: {licenseMeta.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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

            <StoryRightsSection
              value={rights}
              onChange={setRights}
              publishError={readiness.canPublish ? null : readiness.reason}
            />

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle>Save Rights Setup</CardTitle>
                <CardDescription>
                  Save your rights metadata before uploading proof documents.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={handleSaveRights}
                    disabled={isSavingRights}
                    className="rounded-xl"
                  >
                    {isSavingRights ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save Rights Metadata
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleSaveDeclaration}
                    disabled={isSavingDeclaration}
                    className="rounded-xl"
                  >
                    {isSavingDeclaration ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save Declaration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle>Proof Documents</CardTitle>
                <CardDescription>
                  Upload proof files for translated, adapted, repost, or other
                  moderator-reviewed cases.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-6">
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Choose files</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, images, contracts, permission screenshots, or other
                        supporting documents.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Select files
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />

                  {files.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Submission note</label>
                  <Textarea
                    rows={4}
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                    placeholder="Explain what these documents prove."
                    className="rounded-xl"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleUploadProof}
                    disabled={isUploadingProof || files.length === 0}
                    className="rounded-xl"
                  >
                    {isUploadingProof ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upload Proof
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isUploadingProof}
                    className="rounded-xl"
                    onClick={() => {
                      setFiles([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Clear selection
                  </Button>
                </div>

                {proofFiles.length > 0 ? (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Current proof files</p>
                      <div className="space-y-2">
                        {proofFiles.map((file, index) => {
                          const url = getAssetCandidates(apiBase, file)[0];
                          const isPdf = file.toLowerCase().endsWith(".pdf");

                          return (
                            <a
                              key={`${file}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-3 text-sm transition hover:bg-muted/30"
                            >
                              <span className="flex items-center gap-2 truncate">
                                {isPdf ? (
                                  <FileText className="h-4 w-4 shrink-0" />
                                ) : (
                                  <ImageIcon className="h-4 w-4 shrink-0" />
                                )}
                                <span className="truncate">
                                  {file.split("/").pop()}
                                </span>
                              </span>

                              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Story</CardTitle>
                <CardDescription>
                  Check that you are editing the correct story.
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
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Publish Eligibility</CardTitle>
                <CardDescription>
                  Synced from backend publish policy.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Badge
                  className={`border ${
                    rightsPayload?.publishEligibility?.canPublish
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-orange-200 bg-orange-50 text-orange-700"
                  }`}
                >
                  {rightsPayload?.publishEligibility?.canPublish
                    ? "Can publish"
                    : "Cannot publish yet"}
                </Badge>

                <p className="text-sm text-muted-foreground">
                  {rightsPayload?.publishEligibility?.reason ||
                    "This story currently satisfies the backend publish policy."}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {rightsPayload?.licenseSubmittedAt ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Submitted:{" "}
                      {new Date(rightsPayload.licenseSubmittedAt).toLocaleString()}
                    </div>
                  ) : null}

                  {rightsPayload?.licenseReviewedAt ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Reviewed:{" "}
                      {new Date(rightsPayload.licenseReviewedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>

                {rightsPayload?.licenseRejectReason ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-medium">Reviewer feedback</p>
                    <p className="mt-1">{rightsPayload.licenseRejectReason}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}