"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";
import {
  AlertTriangle,
  ArrowRight,
  BarChart,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileCheck,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Undo,
  Upload,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MangaLicenseStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type NormalizedLicenseStatus = "none" | "pending" | "approved" | "rejected";
type StoryTab = "text" | "image";

const STORIES_PER_PAGE = 9;

interface Manga {
  _id: string;
  title: string;
  summary: string;
  genres: any[];
  status: "ongoing" | "completed" | "hiatus";
  styles: Array<{ _id: string; name: string }>;
  isDraft: boolean;
  isPublish: boolean;
  createdAt: string;
  updatedAt: string;
  views: number;
  coverImage?: string;
  isDeleted?: boolean;
  licenseStatus?: MangaLicenseStatus;
}

function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function buildPageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
  if (currentPage - 2 > 1) pages.add(currentPage - 2);
  if (currentPage + 2 < totalPages) pages.add(currentPage + 2);

  return Array.from(pages).sort((a, b) => a - b);
}

function decodeUserCookie(): any | null {
  const raw = Cookies.get("user_normal_info");
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    console.error("Invalid cookie data");
    return null;
  }
}

function normalizeLicenseStatus(
  value?: MangaLicenseStatus,
): NormalizedLicenseStatus {
  if (!value) return "none";
  const normalized = String(value).toLowerCase();

  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "none";
}

function getLicenseBadge(value?: MangaLicenseStatus) {
  const normalized = normalizeLicenseStatus(value);

  if (normalized === "approved") {
    return {
      status: normalized,
      icon: "shield" as const,
      label: "Rights verified",
      className:
        "border-emerald-200/90 bg-white/95 text-emerald-700 shadow-sm backdrop-blur-sm dark:border-emerald-900/60 dark:bg-slate-950/85 dark:text-emerald-300",
    };
  }

  if (normalized === "pending") {
    return {
      status: normalized,
      icon: null,
      label: "",
      className: "",
    };
  }

  if (normalized === "rejected") {
    return {
      status: normalized,
      icon: "alert" as const,
      label: "Proof needs update",
      className:
        "border-red-200/90 bg-white/95 text-red-700 shadow-sm backdrop-blur-sm dark:border-red-900/60 dark:bg-slate-950/85 dark:text-red-300",
    };
  }

  return {
    status: normalized,
    icon: null,
    label: "",
    className: "",
  };
}

function getPublicationBadge(story: Manga) {
  if (story.isDeleted) {
    return {
      label: "Deleted",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
    };
  }

  if (story.isDraft) {
    return {
      label: "Draft",
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300",
    };
  }

  if (story.isPublish) {
    return {
      label: "Published",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
    };
  }

  return {
    label: "Unpublished",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-300",
  };
}

function getLicenseActionLabel(status: NormalizedLicenseStatus) {
  if (status === "approved") return "Review rights details";
  if (status === "pending") return "Track review progress";
  if (status === "rejected") return "Fix and re-upload";
  return "Upload story rights";
}

function getNextStep(story: Manga) {
  const license = normalizeLicenseStatus(story.licenseStatus);

  if (story.isDeleted) {
    return {
      title: "Restore to continue",
      description:
        "This story is currently soft-deleted. Restore it before continuing normal management.",
      tone:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
    };
  }

  if (license === "rejected") {
    return {
      title: "Proof needs update",
      tone:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
    };
  }

  if (license === "pending") {
    return {
      title: "Under review",
      tone:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
    };
  }

  if (license === "approved" && story.isDraft) {
    return {
      title: "Ready when you are",
      description:
        "This story can be published now. Finish metadata or chapters, then publish when ready.",
      tone:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
    };
  }

  if (license === "approved") {
    return {
      title: "Rights verified",
      tone:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
    };
  }

  return {
    title: "Story Rights are optional",
    tone:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
  };
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

function getCoverUrl(coverImage?: string) {
  if (!coverImage) return "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  if (/^https?:\/\//i.test(coverImage)) return coverImage;
  if (coverImage.startsWith("/")) return `${apiBase}${coverImage}`;
  return `${apiBase}/assets/coverImages/${coverImage}`;
}

export default function AuthorDashboard() {
  const [textStories, setTextStories] = useState<Manga[]>([]);
  const [imageStories, setImageStories] = useState<Manga[]>([]);
  const [activeTab, setActiveTab] = useState<StoryTab>("text");
  const [storyPages, setStoryPages] = useState<Record<StoryTab, number>>({
    text: 1,
    image: 1,
  });
  const [isFetching, setIsFetching] = useState(false);
  const [togglingStoryId, setTogglingStoryId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const payload = decodeUserCookie();
      if (!payload?.user_id) return;

      try {
        setIsFetching(true);

        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/manga/author/${payload.user_id}`,
          {
            withCredentials: true,
          },
        );

        const allStories: Manga[] = Array.isArray(data)
          ? data
          : [...(data?.published || []), ...(data?.drafts || [])];

        setTextStories(
          allStories.filter((story) =>
            story.styles?.some((style) => style.name === "Light Novel"),
          ),
        );

        setImageStories(
          allStories.filter((story) =>
            story.styles?.some((style) => style.name === "Manga"),
          ),
        );
      } catch (error) {
        console.error("Lỗi khi fetch data:", error);
        toast({
          title: "Error",
          description: "Failed to load your stories.",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    setStoryPages((prev) => {
      const next = {
        text: Math.min(prev.text, getTotalPages(textStories.length, STORIES_PER_PAGE)),
        image: Math.min(
          prev.image,
          getTotalPages(imageStories.length, STORIES_PER_PAGE),
        ),
      };

      return next.text === prev.text && next.image === prev.image ? prev : next;
    });
  }, [imageStories.length, textStories.length]);

  const totalStories = textStories.length + imageStories.length;
  const currentStories = activeTab === "text" ? textStories : imageStories;
  const currentPage = storyPages[activeTab];
  const publishedCount = useMemo(
    () => currentStories.filter((story) => !story.isDraft && story.isPublish).length,
    [currentStories],
  );
  const draftCount = useMemo(
    () => currentStories.filter((story) => story.isDraft).length,
    [currentStories],
  );

  const handleToggleDelete = async (storyId: string) => {
    const allStories = [...textStories, ...imageStories];
    const story = allStories.find((item) => item._id === storyId);
    const isCurrentlyDeleted = story?.isDeleted || false;

    const action = isCurrentlyDeleted ? "restore" : "delete";

    if (!confirm(`Are you sure you want to ${action} the story "${story?.title}"?`)) {
      return;
    }

    setTogglingStoryId(storyId);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${storyId}/toggle-delete`,
        {},
        { withCredentials: true },
      );

      setTextStories((prev) =>
        prev.map((item) =>
          item._id === storyId
            ? { ...item, isDeleted: !item.isDeleted }
            : item,
        ),
      );

      setImageStories((prev) =>
        prev.map((item) =>
          item._id === storyId
            ? { ...item, isDeleted: !item.isDeleted }
            : item,
        ),
      );

      toast({
        title: "Success",
        description: `Story ${action}d successfully`,
        variant: "success",
      });
    } catch (error) {
      console.error("Lỗi khi toggle delete:", error);
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setTogglingStoryId(null);
    }
  };

  const handlePageChange = (tab: StoryTab, page: number) => {
    const total = getTotalPages(
      tab === "text" ? textStories.length : imageStories.length,
      STORIES_PER_PAGE,
    );

    setStoryPages((prev) => ({
      ...prev,
      [tab]: Math.min(Math.max(page, 1), total),
    }));
  };

  const renderStories = (
    stories: Manga[],
    chapterPath: string,
    page: number,
    onPageChange: (page: number) => void,
  ) => {
    if (isFetching) {
      return (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardContent className="flex min-h-[220px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading stories...
            </div>
          </CardContent>
        </Card>
      );
    }

    if (stories.length === 0) {
      return (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/60" />
            <p className="text-lg font-semibold text-foreground">No stories yet</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Create your first story to start managing metadata, chapters, and
              story rights from one place.
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link href="/author/story/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Story
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    const totalStoryPages = getTotalPages(stories.length, STORIES_PER_PAGE);
    const safePage = Math.min(page, totalStoryPages);
    const visibleStories = stories.slice(
      (safePage - 1) * STORIES_PER_PAGE,
      safePage * STORIES_PER_PAGE,
    );
    const rangeStart =
      stories.length === 0 ? 0 : (safePage - 1) * STORIES_PER_PAGE + 1;
    const rangeEnd = stories.length === 0 ? 0 : rangeStart + visibleStories.length - 1;
    const pageWindow = buildPageWindow(safePage, totalStoryPages);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleStories.map((story) => {
            const publicationBadge = getPublicationBadge(story);
            const licenseBadge = getLicenseBadge(story.licenseStatus);
            const licenseStatus = normalizeLicenseStatus(story.licenseStatus);
            const nextStep = getNextStep(story);
            const licenseHref = `/author/manga/${story._id}/license`;
            const isToggling = togglingStoryId === story._id;

            return (
              <Card
                key={story._id}
                className="group flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card pt-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-muted/30">
                  {story.coverImage ? (
                    <img
                      src={getCoverUrl(story.coverImage)}
                      alt={story.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      No cover
                    </div>
                  )}

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <Badge className={`border ${publicationBadge.className}`}>
                      {publicationBadge.label}
                    </Badge>
                  </div>

                  {licenseBadge.icon ? (
                    <div className="absolute right-3 top-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border ${licenseBadge.className}`}
                        title={licenseBadge.label}
                      >
                        {licenseBadge.icon === "shield" ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                        <span className="sr-only">{licenseBadge.label}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <CardHeader className="space-y-4">
                  <div className="space-y-2">
                    <CardTitle className="line-clamp-2 min-h-[3.5rem] text-xl leading-snug">
                      {story.title}
                    </CardTitle>

                    <CardDescription className="line-clamp-3 min-h-[4.5rem] text-sm leading-6">
                      {story.summary || "No summary yet."}
                    </CardDescription>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
                      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Views
                      </div>
                      <p className="mt-1 text-sm font-semibold">
                        {story.views?.toLocaleString() || 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Story
                      </div>
                      <p className="mt-1 text-sm font-semibold capitalize">
                        {story.status}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
                      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        Updated
                      </div>
                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(story.updatedAt || story.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className={`rounded-xl border px-3 py-2 ${nextStep.tone}`}>
                    <div className="flex items-start gap-2">
                      {licenseStatus === "approved" ? (
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-snug">
                          {nextStep.title}
                        </p>
                        <div className="min-h-[2rem]">
                          {nextStep.description ? (
                            <p className="line-clamp-2 text-xs leading-snug text-foreground/90">
                              {nextStep.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <div className="min-h-0 flex-1" aria-hidden />

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button asChild className="rounded-xl">
                      <Link href={`/author/story/edit/${story._id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={`/author/chapter/${story._id}/${chapterPath}`}>
                        <Upload className="mr-2 h-4 w-4" />
                        Chapters
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Story Rights
                      </p>
                      <p className="truncate text-sm font-medium">
                        {getLicenseActionLabel(licenseStatus)}
                      </p>
                    </div>

                    <Button asChild variant="ghost" className="rounded-xl">
                      <Link href={licenseHref}>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="border-t border-border/70 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        {story.isDeleted ? (
                          <p className="text-sm text-muted-foreground">
                            Restore this story to make it active again.
                          </p>
                        ) : null}
                      </div>

                      <Button
                        variant={story.isDeleted ? "outline" : "destructive"}
                        size="sm"
                        onClick={() => handleToggleDelete(story._id)}
                        disabled={Boolean(togglingStoryId)}
                        className="rounded-xl"
                      >
                        {isToggling ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : story.isDeleted ? (
                          <Undo className="mr-2 h-4 w-4" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        {story.isDeleted ? "Restore" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {totalStoryPages > 1 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {rangeStart}-{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{stories.length}</span>{" "}
              stories
            </p>

            <Pagination className="mx-0 w-full justify-start sm:w-auto sm:justify-end">
              <PaginationContent className="flex-wrap">
                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(safePage - 1)}
                    disabled={safePage === 1}
                    className="rounded-xl"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                </PaginationItem>

                {pageWindow.map((pageNumber, index) => {
                  const previousPage = pageWindow[index - 1];
                  const needsGap =
                    typeof previousPage === "number" &&
                    pageNumber - previousPage > 1;

                  return (
                    <Fragment key={pageNumber}>
                      {needsGap ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : null}

                      <PaginationItem>
                        <Button
                          type="button"
                          variant={pageNumber === safePage ? "default" : "outline"}
                          size="icon"
                          onClick={() => onPageChange(pageNumber)}
                          className="h-9 w-9 rounded-xl"
                        >
                          {pageNumber}
                        </Button>
                      </PaginationItem>
                    </Fragment>
                  );
                })}

                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(safePage + 1)}
                    disabled={safePage === totalStoryPages}
                    className="rounded-xl"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Manage Stories
              </h1>
              <p className="text-sm text-muted-foreground">
                Scan your story status, continue editing, manage chapters, and
                track license readiness from one dashboard.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary" className="rounded-full">
                  Total: {totalStories}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  Current tab: {currentStories.length}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  Published: {publishedCount}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  Drafts: {draftCount}
                </Badge>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button asChild className="rounded-xl">
                <Link href="/author/story/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Story
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/author/static">
                  <BarChart className="mr-2 h-4 w-4" />
                  Statistics
                </Link>
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as StoryTab)}
              className="w-full"
            >
              <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl">
                <TabsTrigger value="text" className="rounded-lg">
                  Light Novel
                </TabsTrigger>
                <TabsTrigger value="image" className="rounded-lg">
                  Manga
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {activeTab === "text"
            ? renderStories(
                textStories,
                "textChapter/create",
                currentPage,
                (page) => handlePageChange("text", page),
              )
            : renderStories(
                imageStories,
                "imageChapter",
                currentPage,
                (page) => handlePageChange("image", page),
              )}
        </div>
      </main>
    </div>
  );
}
