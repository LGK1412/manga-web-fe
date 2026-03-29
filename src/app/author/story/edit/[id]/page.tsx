"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios, { AxiosInstance } from "axios";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  Lock,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import {
  evaluateClientPublishReadiness,
  getLatestRejectReason,
  getDefaultRights,
  normalizeRejectReasonHistory,
  type StoryRights,
  type StoryRightsResponse,
} from "@/lib/story-rights";

type OptionItem = {
  _id: string;
  name: string;
};

type StoryDetailResponse = {
  _id: string;
  title: string;
  summary: string;
  status: "ongoing" | "completed" | "hiatus";
  isPublish: boolean;
  isDraft?: boolean;
  coverImage?: string;
  styles?: Array<string | { _id?: string; id?: string }>;
  genres?: Array<string | { _id?: string; id?: string }>;
};

type StoryFormSnapshot = {
  title: string;
  summary: string;
  status: "ongoing" | "completed" | "hiatus";
  isPublish: boolean;
  styleId: string;
  genreIds: string[];
  coverImage: string;
  coverPreview: string;
};

type EditMode = "draft" | "publish";

type PublishErrors = {
  title?: string;
  summary?: string;
  cover?: string;
  genres?: string;
  style?: string;
  visibility?: string;
};

type NormalizedLicenseStatus = "none" | "pending" | "approved" | "rejected";

type LicenseMetaState = {
  licenseStatus: NormalizedLicenseStatus;
  canPublish: boolean | null;
  publishReason: string | null;
  verifiedBadge: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string;
  rejectReasons: string[];
};

const statusOptions = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
] as const;

function RequiredMark() {
  return <span className="ml-1 text-red-500">*</span>;
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <CardTitle className="text-lg">{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-red-500">{children}</p>;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function firstNonEmptyArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

function unwrapEntity<T = any>(raw: any): T {
  if (raw?.data && typeof raw.data === "object") return raw.data as T;
  if (raw?.result && typeof raw.result === "object") return raw.result as T;
  return raw as T;
}

function mapOptions(raw: any): OptionItem[] {
  return firstNonEmptyArray(raw)
    .map((item) => ({
      _id: String(item?._id || item?.id || ""),
      name: String(item?.name || item?.title || ""),
    }))
    .filter((item) => item._id && item.name);
}

function toIdArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item?._id) return String(item._id);
      if (item?.id) return String(item.id);
      return "";
    })
    .filter(Boolean);
}

function toCoverUrl(apiBase: string, coverImage?: string) {
  if (!coverImage) return "";
  if (/^https?:\/\//i.test(coverImage)) return coverImage;
  if (coverImage.startsWith("/")) return `${apiBase}${coverImage}`;
  return `${apiBase}/assets/coverImages/${coverImage}`;
}

function normalizeStory(raw: any): StoryDetailResponse {
  const story = unwrapEntity<any>(raw);

  const status =
    story?.status === "completed" || story?.status === "hiatus"
      ? story.status
      : "ongoing";

  return {
    _id: String(story?._id || story?.id || ""),
    title: String(story?.title || story?.name || ""),
    summary: String(story?.summary || story?.description || ""),
    status,
    isPublish: Boolean(story?.isPublish ?? !story?.isDraft),
    isDraft: Boolean(story?.isDraft),
    coverImage: String(story?.coverImage || story?.cover || ""),
    styles: Array.isArray(story?.styles) ? story.styles : [],
    genres: Array.isArray(story?.genres) ? story.genres : [],
  };
}

function normalizeRightsResponse(
  payload: StoryRightsResponse | null | undefined,
): StoryRights {
  return {
    ...getDefaultRights(),
    ...(payload?.rights || {}),
  };
}

function normalizeLicenseStatus(value?: string | null): NormalizedLicenseStatus {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "approved" ||
    normalized === "verified" ||
    normalized === "success"
  ) {
    return "approved";
  }

  if (
    normalized === "rejected" ||
    normalized === "deny" ||
    normalized === "denied"
  ) {
    return "rejected";
  }

  if (
    normalized === "pending" ||
    normalized === "submitted" ||
    normalized === "reviewing" ||
    normalized === "under_review" ||
    normalized === "in_review"
  ) {
    return "pending";
  }

  return "none";
}

function deriveLicenseStatus(
  payload: StoryRightsResponse | null | undefined,
  rights: StoryRights,
): NormalizedLicenseStatus {
  const direct = normalizeLicenseStatus(payload?.licenseStatus);
  if (direct !== "none") return direct;

  if (rights.reviewStatus === "approved") return "approved";
  if (rights.reviewStatus === "rejected") return "rejected";
  if (
    rights.reviewStatus === "pending" ||
    rights.reviewStatus === "under_claim"
  ) {
    return "pending";
  }

  return "none";
}

function getLicenseStatusMeta(status: NormalizedLicenseStatus) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        badgeClass:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
        helper:
          "Your story rights setup has been approved. Publish eligibility still depends on the current rights data remaining valid.",
      };
    case "pending":
      return {
        label: "Pending review",
        badgeClass:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
        helper:
          "Your rights submission is under review. Edit story metadata here, then use the Story Rights page for any legal or proof updates.",
      };
    case "rejected":
      return {
        label: "Needs update",
        badgeClass:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
        helper:
          "Your previous rights submission was not approved. Review the feedback and fix it on the Story Rights page before publishing.",
      };
    default:
      return {
        label: "Not submitted",
        badgeClass:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300",
        helper:
          "No approved rights submission is on file yet. Use the Story Rights page to set up origin, proof, and declaration details.",
      };
  }
}

async function requestFirstSuccessful<T = any>(
  api: AxiosInstance,
  candidates: Array<{
    method?: "get" | "post" | "patch";
    url: string;
    data?: any;
    config?: any;
  }>,
): Promise<T> {
  let lastError: any = null;

  for (const candidate of candidates) {
    try {
      const method = candidate.method || "get";
      const res =
        method === "get"
          ? await api.get(candidate.url, candidate.config)
          : method === "post"
            ? await api.post(candidate.url, candidate.data, candidate.config)
            : await api.patch(candidate.url, candidate.data, candidate.config);

      return res.data as T;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

export default function EditStoryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

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

  const [availableStyles, setAvailableStyles] = useState<OptionItem[]>([]);
  const [availableGenres, setAvailableGenres] = useState<OptionItem[]>([]);

  const [storyTitle, setStoryTitle] = useState("");
  const [storySummary, setStorySummary] = useState("");
  const [storyStatus, setStoryStatus] = useState<
    "ongoing" | "completed" | "hiatus"
  >("ongoing");
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [genreSearch, setGenreSearch] = useState("");
  const [isPublish, setIsPublish] = useState(true);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [existingCoverImage, setExistingCoverImage] = useState("");

  const [storyRights, setStoryRights] = useState<StoryRights>(getDefaultRights());
  const [rightsError, setRightsError] = useState<string | null>(null);
  const [rightsMeta, setRightsMeta] = useState<LicenseMetaState>({
    licenseStatus: "none",
    canPublish: null,
    publishReason: null,
    verifiedBadge: false,
    submittedAt: null,
    reviewedAt: null,
    rejectReason: "",
    rejectReasons: [],
  });

  const [initialSnapshot, setInitialSnapshot] = useState<StoryFormSnapshot | null>(
    null,
  );

  const [loadingPage, setLoadingPage] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({
    title: false,
    summary: false,
    cover: false,
    genres: false,
    style: false,
    visibility: false,
  });

  const [publishErrors, setPublishErrors] = useState<PublishErrors>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const slugPreview = useMemo(
    () => slugify(storyTitle || "your-story"),
    [storyTitle],
  );

  const filteredGenres = useMemo(() => {
    const keyword = genreSearch.trim().toLowerCase();
    if (!keyword) return availableGenres;

    return availableGenres.filter((genre) =>
      genre.name.toLowerCase().includes(keyword),
    );
  }, [availableGenres, genreSearch]);

  const selectedStyleDoc = useMemo(
    () => availableStyles.find((style) => style._id === selectedStyleId) || null,
    [availableStyles, selectedStyleId],
  );

  const selectedStatusLabel = useMemo(
    () =>
      statusOptions.find((option) => option.value === storyStatus)?.label ||
      "Status",
    [storyStatus],
  );

  const selectedGenreDocs = useMemo(
    () => availableGenres.filter((genre) => selectedGenreIds.includes(genre._id)),
    [availableGenres, selectedGenreIds],
  );

  const publishEligibility = useMemo(
    () => evaluateClientPublishReadiness(storyRights),
    [storyRights],
  );

  const effectivePublishEligibility = useMemo(() => {
    if (typeof rightsMeta.canPublish === "boolean") {
      return {
        canPublish: rightsMeta.canPublish,
        requiresReview: publishEligibility.requiresReview,
        reason: rightsMeta.publishReason ?? publishEligibility.reason,
      };
    }

    return publishEligibility;
  }, [
    publishEligibility,
    rightsMeta.canPublish,
    rightsMeta.publishReason,
  ]);

  const licenseStatusMeta = useMemo(
    () => getLicenseStatusMeta(rightsMeta.licenseStatus),
    [rightsMeta.licenseStatus],
  );

  const reviewerFeedbackHistory = useMemo(
    () =>
      normalizeRejectReasonHistory({
        licenseRejectReason: rightsMeta.rejectReason,
        licenseRejectReasons: rightsMeta.rejectReasons,
        rights: {
          rejectReason: storyRights.rejectReason,
        },
      }),
    [rightsMeta.rejectReason, rightsMeta.rejectReasons, storyRights.rejectReason],
  );

  const reviewerFeedback = useMemo(() => {
    const latestRejectReason = getLatestRejectReason({
      licenseRejectReason: rightsMeta.rejectReason,
      licenseRejectReasons: rightsMeta.rejectReasons,
      rights: {
        rejectReason: storyRights.rejectReason,
      },
    });

    if (latestRejectReason) {
      return latestRejectReason;
    }

    return rightsMeta.licenseStatus === "rejected"
      ? rightsMeta.publishReason || ""
      : "";
  }, [
    rightsMeta.licenseStatus,
    rightsMeta.publishReason,
    rightsMeta.rejectReason,
    rightsMeta.rejectReasons,
    storyRights.rejectReason,
  ]);

  const previousReviewerFeedback = useMemo(
    () =>
      reviewerFeedbackHistory.length > 1
        ? reviewerFeedbackHistory
            .slice(0, reviewerFeedbackHistory.length - 1)
            .reverse()
        : [],
    [reviewerFeedbackHistory],
  );

  const publishPanelMeta = useMemo(() => {
    if (!effectivePublishEligibility.canPublish) {
      return {
        title: "Publishing blocked",
        description:
          rightsError ||
          effectivePublishEligibility.reason ||
          rightsMeta.publishReason ||
          "Complete the Story Rights page before publishing.",
        panelClass:
          "rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
        icon: AlertTriangle,
      };
    }

    if (!isPublish) {
      return {
        title: "Private by choice",
        description:
          "Story Rights are ready. This story will stay private until you turn on public visibility and update the story.",
        panelClass:
          "rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-100",
        icon: ShieldCheck,
      };
    }

    return {
      title: "Ready to publish",
      description:
        "Story Rights currently satisfy the publish checks for a public story update.",
      panelClass:
        "rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
      icon: ShieldCheck,
    };
  }, [
    effectivePublishEligibility.canPublish,
    effectivePublishEligibility.reason,
    isPublish,
    rightsError,
    rightsMeta.publishReason,
  ]);

  const PublishPanelIcon = publishPanelMeta.icon;

  const markTouched = (field: keyof PublishErrors | "visibility") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const shouldShowError = (field: keyof PublishErrors | "visibility") => {
    return Boolean(touched[field]);
  };

  const validateForm = (mode: EditMode) => {
    const errors: PublishErrors = {};

    if (!storyTitle.trim()) {
      errors.title = "Title is required.";
    } else if (storyTitle.trim().length < 2) {
      errors.title = "Title must be at least 2 characters.";
    } else if (storyTitle.trim().length > 150) {
      errors.title = "Title must be 150 characters or fewer.";
    }

    if (!storySummary.trim()) {
      errors.summary = "Description is required.";
    } else if (storySummary.trim().length < 10) {
      errors.summary = "Description must be at least 10 characters.";
    } else if (storySummary.trim().length > 1000) {
      errors.summary = "Description must be 1000 characters or fewer.";
    }

    if (!coverFile && !existingCoverImage) {
      errors.cover = "Cover image is required.";
    }

    if (!selectedStyleId) {
      errors.style = "Please select a style.";
    }

    if (selectedGenreIds.length === 0) {
      errors.genres = "Please choose at least 1 genre.";
    } else if (selectedGenreIds.length > 3) {
      errors.genres = "You can choose up to 3 genres.";
    }

    if (mode === "publish" && !effectivePublishEligibility.canPublish) {
      setRightsError(
        effectivePublishEligibility.reason ||
          "Story rights are incomplete for publishing.",
      );
    }

    setPublishErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadOptions = async () => {
    const [stylesData, genresData] = await Promise.all([
      requestFirstSuccessful(api, [{ url: "/styles/all" }]),
      requestFirstSuccessful(api, [{ url: "/genre" }]),
    ]);

    setAvailableStyles(mapOptions(stylesData));
    setAvailableGenres(mapOptions(genresData));
  };

  const loadStory = async () => {
    const data = await requestFirstSuccessful(api, [
      { url: `/manga/author/story/${id}` },
      { url: `/manga/${id}` },
    ]);

    const story = normalizeStory(data);
    const resolvedCoverPreview = toCoverUrl(apiBase, story.coverImage);
    const styleIds = toIdArray(story.styles);
    const genreIds = toIdArray(story.genres).slice(0, 3);

    setStoryTitle(story.title || "");
    setStorySummary(story.summary || "");
    setStoryStatus(story.status || "ongoing");
    setIsPublish(Boolean(story.isPublish));
    setSelectedStyleId(styleIds[0] || "");
    setSelectedGenreIds(genreIds);
    setExistingCoverImage(story.coverImage || "");
    setCoverPreview(resolvedCoverPreview);

    setInitialSnapshot({
      title: story.title || "",
      summary: story.summary || "",
      status: story.status || "ongoing",
      isPublish: Boolean(story.isPublish),
      styleId: styleIds[0] || "",
      genreIds,
      coverImage: story.coverImage || "",
      coverPreview: resolvedCoverPreview,
    });
  };

  const loadRights = async () => {
    try {
      const res = await api.get<StoryRightsResponse>(`/license/${id}/rights`);
      const normalizedRights = normalizeRightsResponse(res.data);
      const derivedStatus = deriveLicenseStatus(res.data, normalizedRights);
      const rejectReasonSource = {
        licenseRejectReason: res.data?.licenseRejectReason,
        licenseRejectReasons: res.data?.licenseRejectReasons,
        rights: {
          rejectReason: normalizedRights.rejectReason,
        },
      };
      const resolvedCanPublish =
        typeof res.data?.canPublish === "boolean"
          ? res.data.canPublish
          : typeof res.data?.publishEligibility?.canPublish === "boolean"
            ? res.data.publishEligibility.canPublish
            : null;
      const resolvedPublishReason =
        typeof res.data?.publishReason === "string"
          ? res.data.publishReason
          : typeof res.data?.publishEligibility?.reason === "string"
            ? res.data.publishEligibility.reason
            : null;

      setStoryRights(normalizedRights);
      setRightsMeta({
        licenseStatus: derivedStatus,
        canPublish: resolvedCanPublish,
        publishReason: resolvedPublishReason,
        verifiedBadge: Boolean(res.data?.verifiedBadge),
        submittedAt:
          typeof res.data?.licenseSubmittedAt === "string"
            ? res.data.licenseSubmittedAt
            : null,
        reviewedAt:
          typeof res.data?.licenseReviewedAt === "string"
            ? res.data.licenseReviewedAt
            : null,
        rejectReason: getLatestRejectReason(rejectReasonSource),
        rejectReasons: normalizeRejectReasonHistory(rejectReasonSource),
      });
    } catch {
      setStoryRights(getDefaultRights());
      setRightsMeta({
        licenseStatus: "none",
        canPublish: null,
        publishReason: null,
        verifiedBadge: false,
        submittedAt: null,
        reviewedAt: null,
        rejectReason: "",
        rejectReasons: [],
      });
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      if (!id) return;

      try {
        setLoadingPage(true);
        await Promise.all([loadOptions(), loadStory(), loadRights()]);
      } catch (err: any) {
        toast({
          title: "Failed to load story",
          description:
            err?.response?.data?.message ||
            "Unable to load story information for editing.",
          variant: "destructive",
        });
      } finally {
        setLoadingPage(false);
      }
    };

    loadAll();
  }, [id, api, apiBase, toast]);

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const handleSelectCover = (file?: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      return;
    }

    if (coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    markTouched("cover");
  };

  const handleToggleGenre = (genreId: string) => {
    setSelectedGenreIds((prev) => {
      if (prev.includes(genreId)) {
        return prev.filter((id) => id !== genreId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, genreId];
    });
    markTouched("genres");
  };

  const resetMetadataChanges = () => {
    if (!initialSnapshot) return;

    setStoryTitle(initialSnapshot.title);
    setStorySummary(initialSnapshot.summary);
    setStoryStatus(initialSnapshot.status);
    setIsPublish(initialSnapshot.isPublish);
    setSelectedStyleId(initialSnapshot.styleId);
    setSelectedGenreIds(initialSnapshot.genreIds);
    setExistingCoverImage(initialSnapshot.coverImage);
    setRightsError(null);
    setPublishErrors({});
    setTouched({
      title: false,
      summary: false,
      cover: false,
      genres: false,
      style: false,
      visibility: false,
    });

    if (coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(null);
    setCoverPreview(initialSnapshot.coverPreview);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submitStory = async (mode: EditMode) => {
    setTouched({
      title: true,
      summary: true,
      cover: true,
      genres: true,
      style: true,
      visibility: true,
    });

    const formOk = validateForm(mode);
    if (!formOk) return;

    if (mode === "publish" && !effectivePublishEligibility.canPublish) {
      setRightsError(
        effectivePublishEligibility.reason ||
          "Story rights are incomplete for publishing.",
      );
      toast({
        title: "Cannot publish yet",
        description:
          effectivePublishEligibility.reason || "Story rights are incomplete.",
        variant: "destructive",
      });
      return;
    }

    setRightsError(null);

    if (mode === "publish") setIsUpdating(true);
    else setIsSavingDraft(true);

    try {
      const formData = new FormData();
      formData.append("title", storyTitle.trim());
      formData.append("summary", storySummary.trim());
      formData.append("status", storyStatus);
      formData.append(
        "isPublish",
        String(mode === "publish" ? Boolean(isPublish) : false),
      );
      formData.append("styles", selectedStyleId);
      selectedGenreIds.forEach((genreId) => formData.append("genres", genreId));

      if (coverFile) {
        formData.append("coverImage", coverFile);
      }

      await api.patch(`/manga/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: mode === "publish" ? "Story updated" : "Draft updated",
        description:
          mode === "publish"
            ? "Your story information has been updated successfully."
            : "Your story has been saved as draft successfully.",
        variant: "success",
      });

      router.push("/author/dashboard");
    } catch (err: any) {
      const rawMessage =
        err?.response?.data?.message || err?.message || "Unknown error";
      const serverMessage = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : String(rawMessage);

      toast({
        title:
          mode === "publish"
            ? "Failed to update story"
            : "Failed to save draft",
        description: serverMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setIsSavingDraft(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 pt-24">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Loading story editor</p>
              <p className="text-xs text-muted-foreground">
                Fetching story details, genres, styles, and publishing summary.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 pb-12 pt-24">
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/author/dashboard"
              className="transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Edit story</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Edit Story</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Update your title, summary, cover, categories, and visibility
              here. Publishing requirements are summarized in the sidebar.
            </p>
          </div>
        </div>

        {availableStyles.length > 0 ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60">
                  <SectionHeader
                    title="Basic Information"
                    description="Edit the main information readers will see before opening your story."
                  />
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="story-title" className="text-sm font-medium">
                          Story Title
                          <RequiredMark />
                        </Label>

                        <Input
                          id="story-title"
                          value={storyTitle}
                          onChange={(e) => setStoryTitle(e.target.value)}
                          onBlur={() => markTouched("title")}
                          placeholder="Enter your story title"
                          className={`h-11 rounded-xl border-border/70 bg-background shadow-sm ${shouldShowError("title") && publishErrors.title
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                            }`}
                        />

                        <FieldHint>
                          Use a clear, memorable title for your story.
                        </FieldHint>
                        <FieldError>
                          {shouldShowError("title") ? publishErrors.title : ""}
                        </FieldError>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="story-description"
                            className="text-sm font-medium"
                          >
                            Description
                            <RequiredMark />
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            {storySummary.trim().length}/1000
                          </span>
                        </div>

                        <Textarea
                          id="story-description"
                          rows={8}
                          value={storySummary}
                          onChange={(e) => setStorySummary(e.target.value)}
                          onBlur={() => markTouched("summary")}
                          placeholder="Write a short description that helps readers understand the story."
                          className={`min-h-[210px] rounded-xl border-border/70 bg-background shadow-sm ${shouldShowError("summary") && publishErrors.summary
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                            }`}
                        />

                        <FieldHint>
                          Recommended length: 10-1000 characters.
                        </FieldHint>
                        <FieldError>
                          {shouldShowError("summary") ? publishErrors.summary : ""}
                        </FieldError>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-medium">
                          Cover Image
                          <RequiredMark />
                        </Label>
                        {coverFile ? (
                          <span className="text-xs text-muted-foreground">
                            {(coverFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`group relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-background transition-all hover:border-primary/50 hover:bg-muted/40 ${shouldShowError("cover") && publishErrors.cover
                            ? "border-red-500"
                            : "border-border/70"
                          }`}
                      >
                        {coverPreview ? (
                          <>
                            <img
                              src={coverPreview}
                              alt="cover preview"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-black">
                                <UploadCloud className="h-4 w-4" />
                                Change cover
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <div className="rounded-full bg-muted p-4">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-sm font-medium text-foreground">
                                Upload cover image
                              </p>
                              <p className="text-xs">
                                PNG, JPG, or WEBP. Best ratio: 2:3.
                              </p>
                            </div>
                          </div>
                        )}
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleSelectCover(e.target.files?.[0] || null)
                        }
                      />

                      <FieldError>
                        {shouldShowError("cover") ? publishErrors.cover : ""}
                      </FieldError>

                      {existingCoverImage && !coverFile ? (
                        <p className="text-xs text-muted-foreground">
                          Current cover is being used.
                        </p>
                      ) : null}
                    </div>
                  </div>

                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60">
                  <SectionHeader
                    title="Story Settings"
                    description="Choose how the story is categorized and whether readers can see it."
                  />
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Style
                        <RequiredMark />
                      </Label>

                      <Select
                        value={selectedStyleId}
                        onValueChange={(value) => {
                          setSelectedStyleId(value);
                          markTouched("style");
                        }}
                      >
                        <SelectTrigger
                          className={`h-11 rounded-xl ${shouldShowError("style") && publishErrors.style
                              ? "border-red-500 focus:ring-red-500"
                              : ""
                            }`}
                        >
                          <SelectValue placeholder="Choose a style" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStyles.map((style) => (
                            <SelectItem key={style._id} value={style._id}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FieldHint>
                        Select the main visual or narrative style for this story.
                      </FieldHint>
                      <FieldError>
                        {shouldShowError("style") ? publishErrors.style : ""}
                      </FieldError>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Story Status</Label>

                      <Select
                        value={storyStatus}
                        onValueChange={(value) =>
                          setStoryStatus(
                            value as "ongoing" | "completed" | "hiatus",
                          )
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Choose story status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FieldHint>
                        Helps readers understand whether the story is still updating.
                      </FieldHint>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm font-medium">Visibility</Label>
                      <span className="text-xs font-medium text-muted-foreground">
                        {isPublish ? "Public" : "Private"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 rounded-2xl border border-border/70 bg-muted/20 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPublish(false);
                          markTouched("visibility");
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${!isPublish
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Lock className="h-4 w-4" />
                        Private
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsPublish(true);
                          markTouched("visibility");
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${isPublish
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Globe2 className="h-4 w-4" />
                        Public
                      </button>
                    </div>

                    <FieldHint>
                      {isPublish
                        ? "Readers can discover and read this story now."
                        : "Keep this story hidden while you continue editing it."}
                    </FieldHint>
                    <FieldError>
                      {shouldShowError("visibility")
                        ? publishErrors.visibility
                        : ""}
                    </FieldError>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm font-medium">
                        Genres
                        <RequiredMark />
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {selectedGenreIds.length}/3 selected
                      </span>
                    </div>

                    <Input
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      placeholder="Search genres..."
                      className="h-11 rounded-xl border-border/70 bg-background shadow-sm"
                    />

                    <div className="grid max-h-[260px] gap-2 overflow-auto rounded-2xl border border-border/70 p-3">
                      {filteredGenres.map((genre) => {
                        const checked = selectedGenreIds.includes(genre._id);
                        return (
                          <button
                            key={genre._id}
                            type="button"
                            onClick={() => handleToggleGenre(genre._id)}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${checked
                                ? "border-primary bg-primary/5"
                                : "border-border/70 hover:bg-muted/30"
                              }`}
                          >
                            <span className="text-sm">{genre.name}</span>
                            {checked ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : null}
                          </button>
                        );
                      })}

                      {filteredGenres.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          No genres found.
                        </p>
                      ) : null}
                    </div>

                    <FieldHint>Choose up to 3 genres.</FieldHint>
                    <FieldError>
                      {shouldShowError("genres") ? publishErrors.genres : ""}
                    </FieldError>
                  </div>

                </CardContent>
              </Card>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={isSavingDraft || isUpdating}
                  onClick={() => router.push("/author/dashboard")}
                >
                  Cancel
                </Button>

                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={isSavingDraft || isUpdating}
                  onClick={() => submitStory("draft")}
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving draft...
                    </>
                  ) : (
                    "Save Draft"
                  )}
                </Button>

                <Button
                  className="rounded-xl"
                  disabled={isSavingDraft || isUpdating}
                  onClick={() => submitStory("publish")}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating story...
                    </>
                  ) : (
                    "Update Story"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60">
                  <SectionHeader
                    title="Live Preview"
                    description="A compact view of how this story currently looks."
                  />
                </CardHeader>

                <CardContent className="space-y-4 pt-6">
                  <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="story cover preview"
                        className="aspect-[2/3] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[2/3] items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                          <p className="text-sm">No cover selected</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold leading-snug">
                      {storyTitle.trim() || "Untitled Story"}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {storySummary.trim() ||
                        "Your story description will appear here once you start typing."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {selectedStyleDoc?.name || "Style"}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {selectedStatusLabel}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${isPublish
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {isPublish ? "Public" : "Private"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Selected genres
                    </p>

                    {selectedGenreDocs.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedGenreDocs.slice(0, 4).map((genre) => (
                          <span
                            key={genre._id}
                            className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium"
                          >
                            {genre.name}
                          </span>
                        ))}

                        {selectedGenreDocs.length > 4 ? (
                          <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                            +{selectedGenreDocs.length - 4} more
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No genres selected yet.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Story URL
                    </p>
                    <p className="mt-1 break-all text-sm text-foreground">
                      /story/{slugPreview}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60">
                  <SectionHeader title="Publishing" />
                </CardHeader>

                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Story Rights Status
                      </p>
                      <div
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${licenseStatusMeta.badgeClass}`}
                      >
                        {licenseStatusMeta.label}
                      </div>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        {licenseStatusMeta.helper}
                      </p>
                    </div>

                    {rightsMeta.verifiedBadge ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Visibility</span>
                      <span className="font-medium">
                        {isPublish ? "Public" : "Private"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        Publish eligibility
                      </span>
                      <span className="font-medium">
                        {effectivePublishEligibility.canPublish ? "Ready" : "Blocked"}
                      </span>
                    </div>
                  </div>

                  <div className={publishPanelMeta.panelClass}>
                    <div className="flex items-start gap-3">
                      <PublishPanelIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium">{publishPanelMeta.title}</p>
                        <p>{publishPanelMeta.description}</p>
                      </div>
                    </div>
                  </div>

                  {reviewerFeedback || reviewerFeedbackHistory.length > 0 ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-medium">
                            {rightsMeta.licenseStatus === "rejected"
                              ? "Latest reviewer feedback"
                              : "Previous reviewer feedback"}
                          </p>
                          {reviewerFeedback ? <p>{reviewerFeedback}</p> : null}
                          {previousReviewerFeedback.length > 0 ? (
                            <div className="space-y-2 pt-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-700/80 dark:text-red-200">
                                Earlier review notes
                              </p>
                              <div className="space-y-2">
                                {previousReviewerFeedback.map((reason, index) => (
                                  <div
                                    key={`${reason}-${index}`}
                                    className="rounded-xl border border-red-200/80 bg-white/50 px-3 py-2 dark:border-red-900/50 dark:bg-black/10"
                                  >
                                    <p>{reason}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3">
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={`/author/manga/${id}/license`}>
                        Open Story Rights
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      className="rounded-xl"
                      onClick={resetMetadataChanges}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reset unsaved changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No styles available. Please create at least one style before editing
                a story.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
