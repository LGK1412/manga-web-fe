"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios, { AxiosInstance } from "axios";
import {
  Check,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
  X,
  FileCheck,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { StoryRightsSection } from "@/components/story-rights/story-rights-section";
import {
  buildRightsPayload,
  evaluateClientPublishReadiness,
  getDefaultRights,
  type StoryRights,
  type StoryRightsResponse,
} from "@/lib/story-rights";

type OptionItem = {
  _id: string;
  name: string;
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

type StoryDetailResponse = {
  _id: string;
  title?: string;
  summary?: string;
  status?: "ongoing" | "completed" | "hiatus";
  isPublish?: boolean;
  isDraft?: boolean;
  coverImage?: string;
  styles?: Array<string | { _id?: string; id?: string; name?: string }>;
  genres?: Array<string | { _id?: string; id?: string; name?: string }>;
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
  description: string;
}) {
  return (
    <div className="space-y-1">
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
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
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.genres)) return value.genres;
  if (Array.isArray(value?.styles)) return value.styles;
  return [];
}

function mapOptions(raw: any): OptionItem[] {
  const arr = firstNonEmptyArray(raw);

  return arr
    .map((item: any) => ({
      _id: String(item?._id || item?.id || "").trim(),
      name: String(item?.name || item?.title || "").trim(),
    }))
    .filter((item: OptionItem) => item._id && item.name);
}

function unwrapEntity<T = any>(payload: any): T {
  return (payload?.data?.data ??
    payload?.data ??
    payload?.manga ??
    payload) as T;
}

function toId(value: any): string {
  return String(value?._id || value?.id || value || "").trim();
}

function toIdArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toId(item)).filter(Boolean);
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

function normalizeRightsResponse(payload: StoryRightsResponse | null | undefined): StoryRights {
  return {
    ...getDefaultRights(),
    ...(payload?.rights || {}),
  };
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storyRights, setStoryRights] = useState<StoryRights>(getDefaultRights());

  const [publishErrors, setPublishErrors] = useState<PublishErrors>({});
  const [rightsError, setRightsError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [loadingPage, setLoadingPage] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const selectedStyleDoc =
    availableStyles.find((item) => item._id === selectedStyleId) || null;

  const selectedGenreDocs = availableGenres.filter((genre) =>
    selectedGenreIds.includes(genre._id),
  );

  const filteredGenres = availableGenres.filter((genre) =>
    genre.name.toLowerCase().includes(genreSearch.trim().toLowerCase()),
  );

  const selectedStatusLabel =
    statusOptions.find((item) => item.value === storyStatus)?.label || "Ongoing";

  const slugPreview = slugify(storyTitle || "untitled-story");

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const shouldShowError = (field: keyof PublishErrors) => {
    return Boolean(touched[field] && publishErrors[field]);
  };

  const hasCover = Boolean(coverFile || coverPreview || existingCoverImage);

  const validateForm = (mode: EditMode) => {
    const nextErrors: PublishErrors = {};

    if (!storyTitle.trim()) nextErrors.title = "Story title is required.";
    else if (storyTitle.trim().length > 100) {
      nextErrors.title = "Story title must be 100 characters or fewer.";
    }

    if (!storySummary.trim()) nextErrors.summary = "Description is required.";
    else if (storySummary.trim().length < 10) {
      nextErrors.summary = "Description should be at least 10 characters.";
    } else if (storySummary.trim().length > 1000) {
      nextErrors.summary = "Description must be 1000 characters or fewer.";
    }

    if (!hasCover) nextErrors.cover = "Please upload a cover image.";

    if (!selectedStyleId) nextErrors.style = "Please choose a story type.";
    if (selectedGenreIds.length === 0) {
      nextErrors.genres = "Please select at least one genre.";
    }

    if (mode === "publish" && !isPublish) {
      nextErrors.visibility =
        "Enable Public visibility if you want to publish immediately.";
    }

    setPublishErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const formReady =
    storyTitle.trim().length > 0 &&
    storySummary.trim().length >= 10 &&
    hasCover &&
    !!selectedStyleId &&
    selectedGenreIds.length > 0;

  const remainingRequiredCount = [
    !storyTitle.trim(),
    storySummary.trim().length < 10,
    !hasCover,
    !selectedStyleId,
    selectedGenreIds.length === 0,
  ].filter(Boolean).length;

  const loadOptions = async () => {
    const [stylesData, genresData] = await Promise.all([
      requestFirstSuccessful(api, [
        { url: "/styles" },
        { url: "/styles/view" },
        { url: "/style" },
        { url: "/style/view" },
        { url: "/styles/all" },
      ]),
      requestFirstSuccessful(api, [
        { url: "/genre" },
        { url: "/genre/view" },
        { url: "/genres" },
        { url: "/genres/view" },
        { url: "/genre/all" },
      ]),
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

    setStoryTitle(story.title || "");
    setStorySummary(story.summary || "");
    setStoryStatus(story.status || "ongoing");
    setIsPublish(Boolean(story.isPublish));

    const styleIds = toIdArray(story.styles);
    setSelectedStyleId(styleIds[0] || "");

    const genreIds = toIdArray(story.genres).slice(0, 3);
    setSelectedGenreIds(genreIds);

    setExistingCoverImage(story.coverImage || "");
    setCoverPreview(toCoverUrl(apiBase, story.coverImage));
  };

  const loadRights = async () => {
    try {
      const res = await api.get<StoryRightsResponse>(`/manga/${id}/rights`);
      setStoryRights(normalizeRightsResponse(res.data));
    } catch {
      setStoryRights(getDefaultRights());
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

  const handleRightsChange = (next: StoryRights) => {
    setStoryRights(next);
    if (rightsError) setRightsError(null);
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

    if (mode === "publish") {
      const rightsCheck = evaluateClientPublishReadiness(storyRights);
      if (!rightsCheck.canPublish) {
        setRightsError(rightsCheck.reason);
        toast({
          title: "Cannot publish yet",
          description: rightsCheck.reason || "Story rights are incomplete.",
          variant: "destructive",
        });
        return;
      }
      setRightsError(null);
    }

    if (mode === "publish") setIsUpdating(true);
    else setIsSavingDraft(true);

    try {
      const formData = new FormData();
      formData.append("title", storyTitle.trim());
      formData.append("summary", storySummary.trim());
      formData.append("status", storyStatus);
      formData.append("isPublish", String(mode === "publish" ? Boolean(isPublish) : false));
      formData.append("styles", selectedStyleId);
      selectedGenreIds.forEach((genreId) => formData.append("genres", genreId));

      if (coverFile) {
        formData.append("coverImage", coverFile);
      }

      await api.patch(`/manga/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await api.patch(`/manga/${id}/rights`, buildRightsPayload(storyRights));

      await api.patch(`/manga/${id}/rights/declaration`, {
        accepted: storyRights.declarationAccepted,
        declarationVersion: storyRights.declarationVersion || "v1",
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
        title: mode === "publish" ? "Failed to update story" : "Failed to save draft",
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
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 pb-10 pt-24">
          <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading edit form...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 pb-10 pt-20">
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span>Stories</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">Edit</span>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Edit Story
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Update story details, cover, categories, and publishing settings.
              </p>
            </div>

            <Link href={`/author/manga/${id}/license`}>
              <Button variant="outline" className="gap-2 rounded-xl">
                <FileCheck className="h-4 w-4" />
                Manage License Files
              </Button>
            </Link>
          </div>
        </div>

        {availableStyles.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-5">
                  <SectionHeader
                    title="Basic Information"
                    description="Edit the core details readers will see first."
                  />
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor="story-title" className="text-sm font-medium">
                            Story Title
                            <RequiredMark />
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            {storyTitle.trim().length}/100
                          </span>
                        </div>

                        <Input
                          id="story-title"
                          value={storyTitle}
                          onChange={(e) => setStoryTitle(e.target.value)}
                          onBlur={() => markTouched("title")}
                          placeholder="Enter story title"
                          className={`h-11 rounded-xl border-border/70 bg-background shadow-sm ${
                            shouldShowError("title") && publishErrors.title
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
                          className={`min-h-[210px] rounded-xl border-border/70 bg-background shadow-sm ${
                            shouldShowError("summary") && publishErrors.summary
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                        />

                        <FieldHint>
                          Recommended length: 10–1000 characters.
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
                        className={`group relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-background transition-all hover:border-primary/50 hover:bg-muted/40 ${
                          shouldShowError("cover") && publishErrors.cover
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
                              <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black shadow-sm">
                                Change Cover
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center px-6 text-center">
                            <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />
                            <p className="text-sm font-medium">Upload cover</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Click to choose an image
                            </p>
                          </div>
                        )}
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSelectCover(e.target.files?.[0] || null)}
                      />

                      <FieldHint>Recommended portrait cover image.</FieldHint>
                      <FieldError>
                        {shouldShowError("cover") ? publishErrors.cover : ""}
                      </FieldError>

                      {hasCover ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-muted-foreground"
                          onClick={() => {
                            if (coverPreview.startsWith("blob:")) {
                              URL.revokeObjectURL(coverPreview);
                            }
                            setCoverFile(null);
                            setCoverPreview("");
                            setExistingCoverImage("");
                            markTouched("cover");
                          }}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Remove cover
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Story Type
                        <RequiredMark />
                      </Label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {availableStyles.map((style) => {
                          const isSelected = style._id === selectedStyleId;

                          return (
                            <button
                              key={style._id}
                              type="button"
                              onClick={() => {
                                setSelectedStyleId(style._id);
                                markTouched("style");
                              }}
                              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/40"
                              }`}
                            >
                              <span>{style.name}</span>
                              {isSelected ? <Check className="h-4 w-4" /> : null}
                            </button>
                          );
                        })}
                      </div>

                      <FieldHint>Choose the primary format of your story.</FieldHint>
                      <FieldError>
                        {shouldShowError("style") ? publishErrors.style : ""}
                      </FieldError>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-medium">
                          Genres
                          <RequiredMark />
                        </Label>

                        <Input
                          value={genreSearch}
                          onChange={(e) => setGenreSearch(e.target.value)}
                          placeholder="Search genres..."
                          className="h-9 max-w-[220px] rounded-xl"
                        />
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                        {filteredGenres.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {filteredGenres.map((genre) => {
                              const isSelected = selectedGenreIds.includes(genre._id);
                              const isDisabled =
                                !isSelected && selectedGenreIds.length >= 3;

                              return (
                                <button
                                  key={genre._id}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => handleToggleGenre(genre._id)}
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/40"
                                  } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                                >
                                  {isSelected ? <Check className="h-4 w-4" /> : null}
                                  <span>{genre.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
                            No genres found for “{genreSearch}”.
                          </div>
                        )}
                      </div>

                      <FieldHint>
                        Choose one to three genres to improve discoverability.
                      </FieldHint>
                      <FieldError>
                        {shouldShowError("genres") ? publishErrors.genres : ""}
                      </FieldError>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <Select
                          value={storyStatus}
                          onValueChange={(value) =>
                            setStoryStatus(value as "ongoing" | "completed" | "hiatus")
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-border/70 bg-background shadow-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>

                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FieldHint>Set the current release status.</FieldHint>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Visibility</Label>

                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="is-public"
                              checked={isPublish}
                              onCheckedChange={(value) => {
                                setIsPublish(!!value);
                                markTouched("visibility");
                              }}
                              className="mt-0.5"
                            />

                            <div className="space-y-1">
                              <Label
                                htmlFor="is-public"
                                className="cursor-pointer text-sm font-medium"
                              >
                                Public visibility
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Readers can discover and access this story after
                                publishing.
                              </p>
                            </div>
                          </div>
                        </div>

                        <FieldError>
                          {shouldShowError("visibility")
                            ? publishErrors.visibility
                            : ""}
                        </FieldError>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <StoryRightsSection
                value={storyRights}
                onChange={handleRightsChange}
                publishError={rightsError}
              />

              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-5">
                  <SectionHeader
                    title="Publishing"
                    description="Review your setup and choose what to do next."
                  />
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">
                          {formReady
                            ? "Ready to update"
                            : `Complete ${remainingRequiredCount} more required ${
                                remainingRequiredCount === 1 ? "field" : "fields"
                              }`}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You can still manage proof files separately from the
                          license page.
                        </p>
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => router.push("/author/dashboard")}
                          disabled={isUpdating || isSavingDraft}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => submitStory("draft")}
                          disabled={isUpdating || isSavingDraft}
                        >
                          {isSavingDraft ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Save Draft
                        </Button>

                        <Button
                          type="button"
                          className="rounded-xl px-6 shadow-sm"
                          onClick={() => submitStory("publish")}
                          disabled={isUpdating || isSavingDraft}
                        >
                          {isUpdating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {isUpdating ? "Updating..." : "Update Story"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="pb-4">
                  <SectionHeader
                    title="Live Preview"
                    description="A quick overview of how your story setup looks."
                  />
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="mx-auto aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-2xl border border-border/70 bg-muted/30">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Story cover preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">No cover yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Your uploaded cover will appear here.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold leading-snug text-foreground">
                      {storyTitle.trim() || "Untitled Story"}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {storySummary.trim() ||
                        "Your story description will appear here once you start typing."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {selectedStyleDoc?.name || "Story type"}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {selectedStatusLabel}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isPublish
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
                        {selectedGenreDocs.slice(0, 8).map((genre) => (
                          <span
                            key={genre._id}
                            className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium"
                          >
                            {genre.name}
                          </span>
                        ))}
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

                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-sm font-medium">Rights preview</p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div>Origin: {storyRights.originType}</div>
                      <div>Monetization: {storyRights.monetizationType}</div>
                      <div>Basis: {storyRights.basis}</div>
                      <div>
                        Declaration:{" "}
                        {storyRights.declarationAccepted ? "Accepted" : "Not accepted"}
                      </div>
                    </div>
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