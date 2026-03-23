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

type EditMode = "draft" | "publish";

type PublishErrors = {
  title?: string;
  summary?: string;
  cover?: string;
  genres?: string;
  style?: string;
  visibility?: string;
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

  const slugPreview = useMemo(() => slugify(storyTitle || "your-story"), [storyTitle]);

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

  const selectedGenreDocs = useMemo(
    () => availableGenres.filter((genre) => selectedGenreIds.includes(genre._id)),
    [availableGenres, selectedGenreIds],
  );

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

    if (mode === "publish") {
      const rightsCheck = evaluateClientPublishReadiness(storyRights);
      if (!rightsCheck.canPublish) {
        setRightsError(rightsCheck.reason);
      }
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
      const res = await api.get<StoryRightsResponse>(`/license/${id}/rights`);
      setStoryRights(normalizeRightsResponse(res.data));
    } catch {
      setStoryRights(getDefaultRights());
    }
  };

  useEffect(() => {
    console.log("params =", params);
console.log("id =", id);
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

      await api.patch(`/license/${id}/rights`, buildRightsPayload(storyRights));

      await api.patch(`/license/${id}/rights/declaration`, {
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
                Fetching story details, genres, styles, and rights.
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
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
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

            <h1 className="text-3xl font-bold tracking-tight">Edit Story</h1>
            <p className="text-sm text-muted-foreground">
              Update your story details, visibility, and rights information.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/author/manga/${id}/license`}>Open Story Rights Page</Link>
            </Button>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => router.push("/author/dashboard")}
            >
              Cancel
            </Button>

            <Button
              variant="secondary"
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
                  Updating...
                </>
              ) : (
                "Update Story"
              )}
            </Button>
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
                          className={`h-11 rounded-xl border-border/70 bg-background shadow-sm ${
                            shouldShowError("title") && publishErrors.title
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                        />

                        <FieldHint>Use a clear, memorable title for your story.</FieldHint>
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
                        onChange={(e) => handleSelectCover(e.target.files?.[0] || null)}
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

                  <div className="grid gap-6 lg:grid-cols-2">
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
                          className={`h-11 rounded-xl ${
                            shouldShowError("style") && publishErrors.style
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

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-medium">
                          Publishing Status
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {isPublish ? "Public" : "Private"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3">
                        <Checkbox
                          id="story-visibility"
                          checked={isPublish}
                          onCheckedChange={(checked) => {
                            setIsPublish(Boolean(checked));
                            markTouched("visibility");
                          }}
                        />
                        <div className="space-y-0.5">
                          <Label
                            htmlFor="story-visibility"
                            className="cursor-pointer text-sm font-medium"
                          >
                            Make this story public
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Turn this off to keep the story private or saved as draft.
                          </p>
                        </div>
                      </div>

                      <FieldError>
                        {shouldShowError("visibility")
                          ? publishErrors.visibility
                          : ""}
                      </FieldError>
                    </div>
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
                            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                              checked
                                ? "border-primary bg-primary/5"
                                : "border-border/70 hover:bg-muted/30"
                            }`}
                          >
                            <span className="text-sm">{genre.name}</span>
                            {checked ? <Check className="h-4 w-4 text-primary" /> : null}
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

              <StoryRightsSection
                value={storyRights}
                onChange={handleRightsChange}
                publishError={rightsError}
              />

              <div className="flex flex-wrap justify-end gap-3">
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

            <div className="space-y-6">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60">
                  <SectionHeader
                    title="Live Preview"
                    description="Review how the story is currently configured before saving."
                  />
                </CardHeader>

                <CardContent className="space-y-5 pt-6">
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
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
                    <h3 className="line-clamp-2 text-lg font-semibold">
                      {storyTitle.trim() || "Untitled story"}
                    </h3>
                    <p className="line-clamp-5 text-sm text-muted-foreground">
                      {storySummary.trim() || "No description yet."}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-border/70 bg-background p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">{storyStatus}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Style</span>
                      <span className="font-medium">
                        {selectedStyleDoc?.name || "Not selected"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Visibility</span>
                      <span className="font-medium">
                        {isPublish ? "Public" : "Private"}
                      </span>
                    </div>
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

                  <div className="flex flex-col gap-3">
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={`/author/manga/${id}/license`}>
                        Manage proof documents
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => {
                        setStoryTitle("");
                        setStorySummary("");
                        setSelectedGenreIds([]);
                        setSelectedStyleId("");
                        setStoryRights(getDefaultRights());
                        setRightsError(null);

                        if (coverPreview.startsWith("blob:")) {
                          URL.revokeObjectURL(coverPreview);
                        }
                        setCoverFile(null);
                        setCoverPreview(toCoverUrl(apiBase, existingCoverImage));
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
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