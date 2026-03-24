"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  BookOpen,
  Edit,
  Upload,
  Trash2,
  Undo,
  BarChart,
  FileCheck,
} from "lucide-react";
import Cookies from "js-cookie";
import { Navbar } from "@/components/navbar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";

type MangaLicenseStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

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

export default function AuthorDashboard() {
  const [textStories, setTextStories] = useState<Manga[]>([]);
  const [imageStories, setImageStories] = useState<Manga[]>([]);
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const decodeToken = (): any | null => {
    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        return JSON.parse(decodeURIComponent(raw));
      } catch {
        console.error("Invalid cookie data");
      }
    }
    return null;
  };

  const normalizeLicenseStatus = (
    s?: MangaLicenseStatus,
  ): "none" | "pending" | "approved" | "rejected" => {
    if (!s) return "none";
    const v = String(s).toLowerCase();
    if (v === "pending") return "pending";
    if (v === "approved") return "approved";
    if (v === "rejected") return "rejected";
    return "none";
  };

  const licenseBadge = (s?: MangaLicenseStatus) => {
    const v = normalizeLicenseStatus(s);
    if (v === "approved") {
      return { label: "Verified", className: "bg-green-100 text-green-700" };
    }
    if (v === "pending") {
      return {
        label: "Under Review",
        className: "bg-yellow-100 text-yellow-800",
      };
    }
    if (v === "rejected") {
      return { label: "Rejected", className: "bg-red-100 text-red-700" };
    }
    return { label: "No License", className: "bg-gray-100 text-gray-700" };
  };

  useEffect(() => {
    const fetchData = async () => {
      const payload = decodeToken();
      if (!payload?.user_id) return;

      try {
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
          allStories.filter((s) =>
            s.styles?.some((style) => style.name === "Light Novel"),
          ),
        );
        setImageStories(
          allStories.filter((s) =>
            s.styles?.some((style) => style.name === "Manga"),
          ),
        );
      } catch (err) {
        console.error("Lỗi khi fetch data:", err);
      }
    };

    fetchData();
  }, []);

  const handleToggleDelete = async (storyId: string) => {
    const allStories = [...textStories, ...imageStories];
    const story = allStories.find((s) => s._id === storyId);
    const isCurrentlyDeleted = story?.isDeleted || false;

    const action = isCurrentlyDeleted ? "restore" : "delete";
    if (!confirm(`Are you sure you want to ${action} the story "${story?.title}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${storyId}/toggle-delete`,
        {},
        { withCredentials: true },
      );

      setTextStories((prev) =>
        prev.map((s) =>
          s._id === storyId ? { ...s, isDeleted: !s.isDeleted } : s,
        ),
      );
      setImageStories((prev) =>
        prev.map((s) =>
          s._id === storyId ? { ...s, isDeleted: !s.isDeleted } : s,
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
      setLoading(false);
    }
  };

  const renderStories = (list: Manga[], chapterPath: string) => {
    if (list.length === 0) {
      return (
        <div className="py-16 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400 opacity-50 dark:text-muted-foreground" />
          <p className="text-lg text-gray-500 dark:text-muted-foreground">
            No stories
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((story) => {
          const lb = licenseBadge(story.licenseStatus);
          const licNormalized = normalizeLicenseStatus(story.licenseStatus);

          const licenseHref = `/author/manga/${story._id}/license`;

          const licenseBtnLabel =
            licNormalized === "approved"
              ? "License (Verified)"
              : licNormalized === "pending"
                ? "License (Pending)"
                : licNormalized === "rejected"
                  ? "Re-upload License"
                  : "Upload License";

          return (
            <Card
              key={story._id}
              className="group overflow-hidden border border-gray-200 bg-white transition-all duration-300 hover:border-gray-300 hover:shadow-lg dark:border-input dark:bg-card dark:hover:border-ring"
            >
              {story.coverImage && (
                <div className="relative aspect-[2/1.5] w-full overflow-hidden bg-gray-200 dark:bg-muted">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${story.coverImage}`}
                    alt={story.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}

              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="flex items-start gap-2 text-balance">
                    <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                    <span className="line-clamp-2 text-gray-900 dark:text-foreground">
                      {story.title}
                    </span>
                  </CardTitle>

                  <div className="flex flex-wrap gap-2">
                    {story.isDraft ? (
                      <Badge variant="secondary" className="text-xs">
                        Draft
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-xs text-green-700">
                        Published
                      </Badge>
                    )}

                    {story.isDeleted && <Badge className="text-xs">Deleted</Badge>}

                    <Badge className={`text-xs ${lb.className}`}>{lb.label}</Badge>
                  </div>
                </div>

                <CardDescription className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-muted-foreground">
                  {story.summary}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-muted-foreground">
                    <span>{story.views?.toLocaleString() || 0} views</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {story.status}
                    </Badge>
                  </div>

                  {Array.isArray(story.genres) && story.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {story.genres.slice(0, 3).map((g: any) => {
                        const key = typeof g === "string" ? g : g._id || g.name;
                        const label = typeof g === "string" ? g : g.name;
                        return (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        );
                      })}
                      {story.genres.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{story.genres.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-muted-foreground">
                    {new Date(story.createdAt).toLocaleDateString("vi-VN")}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link href={`/author/story/edit/${story._id}`} className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 bg-transparent text-xs"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>

                    <Link
                      href={`/author/chapter/${story._id}/${chapterPath}`}
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 bg-transparent text-xs"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Chapter
                      </Button>
                    </Link>

                    <Link href={licenseHref} className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 bg-transparent text-xs"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        {licenseBtnLabel}
                      </Button>
                    </Link>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleToggleDelete(story._id)}
                      disabled={loading}
                      className="w-full gap-1 text-xs"
                    >
                      {story.isDeleted ? (
                        <>
                          <Undo className="h-3.5 w-3.5" />
                          Undo
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <Navbar />

      <main className="px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground sm:text-4xl">
                  Manage Stories
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-muted-foreground">
                  Total: {textStories.length + imageStories.length} stories
                </p>
              </div>

              <div className="flex w-full gap-2 sm:w-auto">
                <Link href="/author/story/create" className="flex-1 sm:flex-none">
                  <Button className="w-full gap-2 bg-blue-600 font-semibold text-white hover:bg-blue-700 sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Create Story
                  </Button>
                </Link>

                <Link href="/author/static" className="flex-1 sm:flex-none">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-gray-300 bg-transparent hover:bg-gray-100 dark:border-input dark:bg-transparent dark:hover:bg-accent sm:w-auto"
                  >
                    <BarChart className="h-4 w-4" />
                    Statistics
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "text" | "image")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-gray-200 dark:bg-muted sm:w-auto">
                <TabsTrigger value="text">Light Novel</TabsTrigger>
                <TabsTrigger value="image">Manga</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {activeTab === "text"
            ? renderStories(textStories, "textChapter/create")
            : renderStories(imageStories, "imageChapter")}
        </div>
      </main>
    </div>
  );
}