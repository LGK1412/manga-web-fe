"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import {
  Check,
  ChevronRight,
  Globe2,
  Image as ImageIcon,
  Lock,
  Loader2,
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

type JwtPayload = {
  user_id?: string;
  userId?: string;
  role?: string;
  email?: string;
};

type OptionItem = {
  _id: string;
  name: string;
};

type CreateMode = "create" | "license";

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

function decodeUserFromCookie(): JwtPayload | null {
  const raw = Cookies.get("user_normal_info");
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
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
      _id: String(item?._id || item?.id || ""),
      name: String(item?.name || item?.title || "").trim(),
    }))
    .filter((item: OptionItem) => item._id && item.name);
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

export default function CreateStoryPage() {
  const router = useRouter();
  const { toast } = useToast();

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
  const [isPublish, setIsPublish] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [genreSearch, setGenreSearch] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [publishErrors, setPublishErrors] = useState<PublishErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [loadingPage, setLoadingPage] = useState(true);
  const [isOpeningStoryRights, setIsOpeningStoryRights] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

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

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const shouldShowError = (field: keyof PublishErrors) => {
    return Boolean(touched[field] && publishErrors[field]);
  };

  const validateForm = () => {
    const nextErrors: PublishErrors = {};

    if (!storyTitle.trim()) nextErrors.title = "Story title is required.";
    else if (storyTitle.trim().length > 100)
      nextErrors.title = "Story title must be 100 characters or fewer.";

    if (!storySummary.trim()) nextErrors.summary = "Description is required.";
    else if (storySummary.trim().length < 10)
      nextErrors.summary = "Description should be at least 10 characters.";
    else if (storySummary.trim().length > 1000)
      nextErrors.summary = "Description must be 1000 characters or fewer.";

    if (!coverFile) nextErrors.cover = "Please upload a cover image.";

    if (!selectedStyleId) nextErrors.style = "Please choose a story type.";
    if (selectedGenreIds.length === 0)
      nextErrors.genres = "Please select at least one genre.";

    setPublishErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const formReady =
    storyTitle.trim().length > 0 &&
    storySummary.trim().length >= 10 &&
    !!coverFile &&
    !!selectedStyleId &&
    selectedGenreIds.length > 0;

  const remainingRequiredCount = [
    !storyTitle.trim(),
    storySummary.trim().length < 10,
    !coverFile,
    !selectedStyleId,
    selectedGenreIds.length === 0,
  ].filter(Boolean).length;

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingPage(true);

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
      } catch {
        toast({
          title: "Failed to load form options",
          description:
            "Please check your genres/styles endpoints and try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingPage(false);
      }
    };

    loadOptions();
  }, [api, toast]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
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

    if (coverPreview) URL.revokeObjectURL(coverPreview);

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    markTouched("cover");
  };

  const handleToggleGenre = (genreId: string) => {
    setSelectedGenreIds((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId],
    );
    markTouched("genres");
  };

  const submitStory = async (mode: CreateMode) => {
    const payload = decodeUserFromCookie();
    const authorId = payload?.user_id || payload?.userId;

    if (!authorId) {
      toast({
        title: "Authentication required",
        description: "Please log in again before creating a story.",
        variant: "destructive",
      });
      return;
    }

    setTouched({
      title: true,
      summary: true,
      cover: true,
      genres: true,
      style: true,
      visibility: true,
    });

    const formOk = validateForm();
    if (!formOk) return;

    if (mode === "license") setIsOpeningStoryRights(true);
    else setIsCreatingStory(true);

    try {
      const formData = new FormData();
      formData.append("title", storyTitle.trim());
      formData.append("summary", storySummary.trim());
      formData.append("status", storyStatus);
      formData.append("isPublish", String(Boolean(isPublish)));
      formData.append("styles", selectedStyleId);
      selectedGenreIds.forEach((genreId) => formData.append("genres", genreId));
      if (coverFile) formData.append("coverImage", coverFile);

      const created = await requestFirstSuccessful<any>(api, [
        {
          method: "post",
          url: `/manga/author/${authorId}`,
          data: formData,
          config: { headers: { "Content-Type": "multipart/form-data" } },
        },
      ]);

      const storyId = String(created?._id || created?.id || "");
      if (!storyId) {
        throw new Error("Story created but no story id returned.");
      }

      toast({
        title:
          mode === "license"
            ? isPublish
              ? "Story published"
              : "Story created"
            : isPublish
              ? "Story published"
              : "Draft created",
        description:
          mode === "license"
            ? isPublish
              ? "Your story has been published. Story Rights is opening so you can manage proof images if needed."
              : "Your story has been created. Story Rights is opening so you can manage proof images if needed."
            : isPublish
              ? "Your story has been created and published."
              : "Your story draft has been created.",
        variant: "success",
      });

      router.push(
        mode === "license"
          ? `/author/manga/${storyId}/license`
          : "/author/dashboard",
      );
    } catch (err: any) {
      const rawMessage =
        err?.response?.data?.message || err?.message || "Unknown error";
      const serverMessage = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : String(rawMessage);

      toast({
        title:
          mode === "license"
            ? "Failed to create story"
            : "Failed to create story",
        description: serverMessage,
        variant: "destructive",
      });
    } finally {
      setIsOpeningStoryRights(false);
      setIsCreatingStory(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 pb-10 pt-24">
          <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading create form...
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
            <span className="font-medium text-foreground">Create</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Create New Story
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Set up your story details, cover, and categories. You can manage
              story rights and proof images now or later.
            </p>
          </div>
        </div>

        {availableStyles.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-5">
                  <SectionHeader
                    title="Basic Information"
                    description="Add the core details readers will see first."
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
                            <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground" />
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

                      {coverFile ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-muted-foreground"
                          onClick={() => {
                            if (coverPreview) URL.revokeObjectURL(coverPreview);
                            setCoverFile(null);
                            setCoverPreview("");
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

                              return (
                                <button
                                  key={genre._id}
                                  type="button"
                                  onClick={() => handleToggleGenre(genre._id)}
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/40"
                                  }`}
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
                        Choose one or more genres to improve discoverability.
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
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-medium">
                          Visibility
                          <RequiredMark />
                        </Label>
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
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${
                            !isPublish
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
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition ${
                            isPublish
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
                          ? "Readers can discover this story right after creation."
                          : "Keep this story hidden while you continue editing it."}
                      </FieldHint>
                      <FieldError>
                        {shouldShowError("visibility")
                          ? publishErrors.visibility
                          : ""}
                      </FieldError>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-5">
                  <SectionHeader
                    title="Next Step"
                    description="Create the story now, then optionally open Story Rights in the next screen."
                  />
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">
                          {formReady
                            ? "Ready to continue"
                            : `Complete ${remainingRequiredCount} more required ${
                                remainingRequiredCount === 1 ? "field" : "fields"
                              }`}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isPublish
                            ? "Your story will be created as public. You can open Story Rights right after this if you want to add proof images."
                            : "Your story will be created as a draft. You can open Story Rights right after this if you want to add proof images."}
                        </p>
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => router.push("/author/dashboard")}
                          disabled={isOpeningStoryRights || isCreatingStory}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => submitStory("create")}
                          disabled={isOpeningStoryRights || isCreatingStory}
                        >
                          {isCreatingStory ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {isCreatingStory
                            ? "Creating..."
                            : isPublish
                              ? "Create & Publish"
                              : "Create Draft"}
                        </Button>

                        <Button
                          type="button"
                          className="rounded-xl px-6 shadow-sm"
                          onClick={() => submitStory("license")}
                          disabled={isOpeningStoryRights || isCreatingStory}
                        >
                          {isOpeningStoryRights ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {isOpeningStoryRights
                            ? "Creating..."
                            : isPublish
                              ? "Publish & Open Story Rights"
                              : "Create Draft & Open Story Rights"}
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

                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No styles available. Please create at least one style before creating
                a story.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
