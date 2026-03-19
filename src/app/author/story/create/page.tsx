"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import Cookies from "js-cookie";
import { availableStatuses } from "@/lib/data";
import {
  BookOpen,
  Check,
  ChevronRight,
  ImageIcon,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface StyleDoc {
  _id: string;
  name: string;
}

interface GenreDoc {
  _id: string;
  name: string;
}

type SubmitMode = "publish" | "draft";

type TouchedFields = {
  title: boolean;
  summary: boolean;
  styles: boolean;
  genres: boolean;
  cover: boolean;
};

type FormErrors = {
  title?: string;
  summary?: string;
  styles?: string;
  genres?: string;
  cover?: string;
};

const MAX_COVER_SIZE_MB = 5;
const MAX_COVER_SIZE_BYTES = MAX_COVER_SIZE_MB * 1024 * 1024;

const RequiredMark = () => (
  <span className="ml-1 align-middle text-sm font-semibold text-red-500">*</span>
);

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <CardTitle className="text-lg font-semibold tracking-tight">
        {title}
      </CardTitle>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-red-500">{children}</p>;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateStoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableGenres, setAvailableGenres] = useState<GenreDoc[]>([]);
  const [availableStyles, setAvailableStyles] = useState<StyleDoc[]>([]);

  const [storyTitle, setStoryTitle] = useState("");
  const [storySummary, setStorySummary] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [storyStatus, setStoryStatus] = useState("ongoing");
  const [isPublish, setIsPublish] = useState(true);

  const [genreSearch, setGenreSearch] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [attemptedPublish, setAttemptedPublish] = useState(false);

  const [touched, setTouched] = useState<TouchedFields>({
    title: false,
    summary: false,
    styles: false,
    genres: false,
    cover: false,
  });

  const markTouched = (field: keyof TouchedFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const markAllTouched = () => {
    setTouched({
      title: true,
      summary: true,
      styles: true,
      genres: true,
      cover: true,
    });
  };

  const decodeToken = () => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const genreRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/genre/`,
          { withCredentials: true }
        );

        const styleRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/styles/active`,
          { withCredentials: true }
        );

        const genresList: GenreDoc[] = Array.isArray(genreRes.data)
          ? genreRes.data
          : [];
        const stylesList: StyleDoc[] = Array.isArray(styleRes.data)
          ? styleRes.data
          : [];

        if (!mounted) return;

        setAvailableGenres(genresList);
        setAvailableStyles(stylesList);

        if (stylesList.length > 0) {
          setSelectedStyles([stylesList[0]._id]);
        }
      } catch (error) {
        console.error("Failed to load genres/styles:", error);
        if (!mounted) return;
        setAvailableGenres([]);
        setAvailableStyles([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const cleanedGenres = useMemo(() => {
    const map = new Map<string, GenreDoc>();

    for (const item of availableGenres) {
      const cleanName = item.name?.trim();
      if (!cleanName) continue;

      const key = cleanName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { ...item, name: cleanName });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [availableGenres]);

  const filteredGenres = useMemo(() => {
    const keyword = genreSearch.trim().toLowerCase();
    if (!keyword) return cleanedGenres;

    return cleanedGenres.filter((genre) =>
      genre.name.toLowerCase().includes(keyword)
    );
  }, [cleanedGenres, genreSearch]);

  const selectedStyleDoc = useMemo(() => {
    const selectedId = selectedStyles[0];
    return availableStyles.find((style) => style._id === selectedId) || null;
  }, [availableStyles, selectedStyles]);

  const selectedGenreDocs = useMemo(() => {
    return cleanedGenres.filter((genre) => selectedGenres.includes(genre._id));
  }, [cleanedGenres, selectedGenres]);

  const slugPreview = useMemo(() => {
    const slug = slugify(storyTitle.trim());
    return slug || "your-story-url";
  }, [storyTitle]);

  const statusOptions = useMemo(() => {
    return availableStatuses.map((status: any) => {
      const value = (
        typeof status === "string" ? status : status.value
      ).toLowerCase();
      const label = typeof status === "string" ? status : status.label;
      return { value, label };
    });
  }, []);

  const selectedStatusLabel = useMemo(() => {
    return (
      statusOptions.find((item) => item.value === storyStatus)?.label ||
      storyStatus
    );
  }, [statusOptions, storyStatus]);

  // Publish validate full
  // Draft validate light
  const validateForm = (mode: SubmitMode): FormErrors => {
    const errors: FormErrors = {};

    // Title
    if (mode === "publish") {
      if (!storyTitle.trim()) {
        errors.title = "Please enter story title.";
      } else if (storyTitle.trim().length < 3) {
        errors.title = "Story title must be at least 3 characters.";
      } else if (storyTitle.trim().length > 100) {
        errors.title = "Story title must not exceed 100 characters.";
      }
    } else {
      if (storyTitle.trim() && storyTitle.trim().length > 100) {
        errors.title = "Story title must not exceed 100 characters.";
      }
    }

    // Summary
    if (mode === "publish") {
      if (!storySummary.trim()) {
        errors.summary = "Please enter description.";
      } else if (storySummary.trim().length < 10) {
        errors.summary = "Description must be at least 10 characters.";
      } else if (storySummary.trim().length > 1000) {
        errors.summary = "Description must not exceed 1000 characters.";
      }
    } else {
      if (storySummary.trim() && storySummary.trim().length > 1000) {
        errors.summary = "Description must not exceed 1000 characters.";
      }
    }

    if (mode === "publish") {
      if (!selectedStyles.length) {
        errors.styles = "Please select 1 story type.";
      }

      if (!selectedGenres.length) {
        errors.genres = "Please select at least 1 genre.";
      }

      if (!coverFile) {
        errors.cover = "Please select a cover image for the story.";
      }
    }

    return errors;
  };

  // UI vẫn hiển thị trạng thái "ready to publish" theo luật publish
  const publishErrors = useMemo(
    () => validateForm("publish"),
    [storyTitle, storySummary, selectedStyles, selectedGenres, coverFile]
  );

  const remainingRequiredCount = Object.keys(publishErrors).length;
  const formReady = remainingRequiredCount === 0;

  const shouldShowError = (field: keyof FormErrors) =>
    attemptedPublish || touched[field as keyof TouchedFields];

  const handleSelectStyle = (style: StyleDoc) => {
    setSelectedStyles([style._id]);
    markTouched("styles");
  };

  const toggleGenre = (genreId: string) => {
    markTouched("genres");

    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleCoverChange = (file?: File | null) => {
    markTouched("cover");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_COVER_SIZE_BYTES) {
      toast({
        title: "Image too large",
        description: `Cover image must be smaller than ${MAX_COVER_SIZE_MB}MB.`,
        variant: "destructive",
      });
      return;
    }

    if (coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverPreview(previewUrl);
  };

  const removeCover = () => {
    markTouched("cover");

    if (coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(null);
    setCoverPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submitStory = async (mode: SubmitMode) => {
    if (mode === "publish") {
      setAttemptedPublish(true);
      markAllTouched();
    }

    const validationErrors = validateForm(mode);
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title:
          mode === "publish"
            ? "Please complete required fields"
            : "Draft cannot be saved",
        description:
          mode === "publish"
            ? "Check the fields marked in red before continuing."
            : "Please check the entered data before saving draft.",
        variant: "destructive",
      });
      return;
    }

    const tokenPayload = decodeToken();
    const authorId = tokenPayload?.user_id;

    if (!authorId) {
      toast({
        title: "Not logged in",
        description: "Please log in again.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "publish") {
      setIsPublishing(true);
    } else {
      setIsSavingDraft(true);
    }

    const fd = new FormData();
    fd.append("title", storyTitle.trim());
    fd.append("summary", storySummary.trim());
    selectedGenres.forEach((genreId) => fd.append("genres", genreId));
    selectedStyles.forEach((styleId) => fd.append("styles", styleId));
    fd.append("status", storyStatus);
    fd.append("isPublish", String(mode === "publish" ? isPublish : false));
    fd.append("isDraft", String(mode === "draft"));

    if (coverFile) {
      fd.append("coverImage", coverFile);
    }

    try {
      // Debug payload
      for (const [key, value] of fd.entries()) {
        console.log("FormData =>", key, value);
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/author/${authorId}`,
        fd,
        {
          withCredentials: true,
        }
      );

      toast({
        title:
          mode === "publish"
            ? "Story created successfully!"
            : "Draft saved successfully!",
        description:
          mode === "publish"
            ? "Your story has been published successfully."
            : "Your draft has been saved successfully.",
        variant: "success",
      });

      router.push("/author/dashboard");
    } catch (error: any) {
      console.error("Create story error:", error);
      console.error("Response status:", error?.response?.status);
      console.error("Response data:", error?.response?.data);

      const rawMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Please check your data or login again.";

      const serverMessage = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : String(rawMessage);

      toast({
        title:
          mode === "publish"
            ? "Failed to create story"
            : "Failed to save draft",
        description: serverMessage,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
      setIsSavingDraft(false);
    }
  };

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
              Set up your story details, cover, categories, and publishing
              options in a clean author workspace.
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
                          <Label
                            htmlFor="story-title"
                            className="text-sm font-medium"
                          >
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
                          {shouldShowError("summary")
                            ? publishErrors.summary
                            : ""}
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
                              <div className="rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-black shadow-sm">
                                Change cover
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center px-6 text-center">
                            <div className="mb-4 rounded-full bg-muted p-4">
                              <ImageIcon className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              Upload story cover
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Recommended 2:3 ratio for the best appearance.
                            </p>
                          </div>
                        )}
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleCoverChange(e.target.files?.[0])}
                      />

                      <FieldHint>
                        JPG/PNG, poster style, max {MAX_COVER_SIZE_MB}MB.
                      </FieldHint>
                      <FieldError>
                        {shouldShowError("cover") ? publishErrors.cover : ""}
                      </FieldError>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {coverPreview ? "Replace" : "Upload"}
                        </Button>

                        {coverPreview ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-xl text-muted-foreground hover:text-foreground"
                            onClick={removeCover}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-5">
                  <SectionHeader
                    title="Classification"
                    description="Choose how your story is categorized for readers."
                  />
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Story Type
                      <RequiredMark />
                    </Label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {availableStyles.map((style) => {
                        const isActive = selectedStyles.includes(style._id);

                        return (
                          <button
                            key={style._id}
                            type="button"
                            onClick={() => handleSelectStyle(style)}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                              isActive
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`rounded-lg p-2 ${
                                  isActive
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {style.name.toLowerCase() === "manga" ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <BookOpen className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {style.name}
                                </p>
                              </div>
                            </div>

                            {isActive ? (
                              <div className="rounded-full bg-primary/15 p-1 text-primary">
                                <Check className="h-4 w-4" />
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    <FieldHint>Select one main story format.</FieldHint>
                    <FieldError>
                      {shouldShowError("styles") ? publishErrors.styles : ""}
                    </FieldError>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label className="text-sm font-medium">
                        Genres
                        <RequiredMark />
                      </Label>

                      <span className="text-xs text-muted-foreground">
                        {selectedGenres.length} selected
                      </span>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={genreSearch}
                            onChange={(e) => setGenreSearch(e.target.value)}
                            placeholder="Search genres..."
                            className="h-10 rounded-xl border-border/70 pl-9"
                          />
                        </div>
                      </div>

                      <div className="mb-4 min-h-[44px] rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
                        {selectedGenreDocs.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedGenreDocs.map((genre) => (
                              <button
                                key={genre._id}
                                type="button"
                                onClick={() => toggleGenre(genre._id)}
                                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15"
                              >
                                <span>{genre.name}</span>
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Selected genres will appear here.
                          </p>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto pr-1">
                        {filteredGenres.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {filteredGenres.map((genre) => {
                              const isSelected = selectedGenres.includes(
                                genre._id
                              );

                              return (
                                <button
                                  key={genre._id}
                                  type="button"
                                  onClick={() => toggleGenre(genre._id)}
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/40"
                                  }`}
                                >
                                  {isSelected ? (
                                    <Check className="h-4 w-4" />
                                  ) : null}
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
                        onValueChange={setStoryStatus}
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
                            onCheckedChange={(value) => setIsPublish(!!value)}
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
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                            ? "Ready to publish"
                            : `Complete ${remainingRequiredCount} more required ${
                                remainingRequiredCount === 1 ? "field" : "fields"
                              }`}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You can edit these settings later from your author
                          dashboard.
                        </p>
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => router.push("/author/dashboard")}
                          disabled={isPublishing || isSavingDraft}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => submitStory("draft")}
                          disabled={isPublishing || isSavingDraft}
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
                          disabled={isPublishing || isSavingDraft}
                        >
                          {isPublishing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {isPublishing ? "Publishing..." : "Publish Story"}
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
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    Quick Tips
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    Use a short, strong title that readers can remember easily.
                  </div>

                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    Covers with a 2:3 poster ratio usually look best in story
                    listings.
                  </div>

                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    Pick genres carefully so readers can discover your story
                    faster.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardContent className="py-10 text-center text-muted-foreground">
              Currently no story types are available to create.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}