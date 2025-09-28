"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, BookOpen, Edit, Upload, Trash2, Undo } from "lucide-react";
import Cookies from "js-cookie";
import { Navbar } from "@/components/navbar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";

interface Manga {
  _id: string;
  title: string;
  summary: string;
  genres: string[];
  status: "ongoing" | "completed" | "hiatus";
  styles: Array<{ _id: string; name: string }>;
  isDraft: boolean;
  isPublish: boolean;
  createdAt: string;
  updatedAt: string;
  views: number;
  coverImage?: string;
  isDeleted?: boolean;
}

export default function AuthorDashboard() {
  const [textStories, setTextStories] = useState<Manga[]>([]);
  const [imageStories, setImageStories] = useState<Manga[]>([]);
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const decodeToken = (): any | null => {
    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        return JSON.parse(decodeURIComponent(raw));
      } catch (e) {
        console.error("Invalid cookie data");
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const payload = decodeToken();
      // console.log(payload.user_id);
      if (!payload) return;
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${payload.user_id}`,
          { withCredentials: true }
        );

        const allStories: Manga[] = Array.isArray(data)
          ? data
          : [...(data?.published || []), ...(data?.drafts || [])];

        setTextStories(
          allStories.filter((s) =>
            s.styles?.some((style) => style.name === "Light Novel")
          )
        );
        setImageStories(
          allStories.filter((s) =>
            s.styles?.some((style) => style.name === "Manga")
          )
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

    const action = isCurrentlyDeleted ? "khôi phục" : "xóa";
    if (
      !confirm(
        `Bạn có chắc chắn muốn ${action} truyện "${story?.title}" không?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${storyId}/toggle-delete`,
        {},
        { withCredentials: true }
      );

      setTextStories((prev) =>
        prev.map((s) =>
          s._id === storyId ? { ...s, isDeleted: !s.isDeleted } : s
        )
      );
      setImageStories((prev) =>
        prev.map((s) =>
          s._id === storyId ? { ...s, isDeleted: !s.isDeleted } : s
        )
      );

      toast({
        title: "Thành công",
        description: `Đã ${action} truyện thành công`,
        variant: "success",
      });
    } catch (error) {
      console.error("Lỗi khi toggle delete:", error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStories = (list: Manga[], chapterPath: string) => {
    if (list.length === 0)
      return (
        <div className="text-center py-8 text-gray-500">Không có truyện</div>
      );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((story) => (
          <Card
            key={story._id}
            className="max-w-sm mx-auto hover:shadow-lg transition-shadow bg-gray-100"
          >
            {story.coverImage && (
              <div className="aspect-[2/1.5] w-full overflow-hidden rounded-t-lg">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${story.coverImage}`}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {story.title}
                {story.isDraft ? (
                  <Badge variant="destructive" className="text-xs">
                    Draft
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    Published
                  </Badge>
                )}
                {story.isDeleted && (
                  <Badge variant="secondary" className="text-xs">
                    Đã xóa
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {story.summary}
              </CardDescription>
              <div className="flex flex-wrap gap-1 mt-2">
                {story.genres.map((g: any) => {
                  const key = typeof g === "string" ? g : g._id || g.name;
                  const label = typeof g === "string" ? g : g.name;
                  return (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary">{story.status}</Badge>
                <span className="text-sm text-gray-500">
                  {new Date(story.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <Link href={`/author/story/edit/${story._id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Sửa
                    </Button>
                  </Link>
                  <Link href={`/author/chapter/${story._id}/${chapterPath}`}>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-1" />
                      Chapter
                    </Button>
                  </Link>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleToggleDelete(story._id)}
                  disabled={loading}
                >
                  {story.isDeleted ? (
                    <>
                      <Undo className="w-4 h-4 mr-1" />
                      Hoàn tác
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Xóa
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background mb-5">
      <Navbar />

      <main className="pt-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Quản lý truyện</h2>
          <Link href="/author/story/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tạo truyện mới
            </Button>
          </Link>
        </div>

        {/* Tabs nav */}
        <div className="flex justify-center mb-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "text" | "image")}
          >
            <TabsList className="flex gap-4">
              <TabsTrigger value="text">Truyện chữ</TabsTrigger>
              <TabsTrigger value="image">Truyện tranh</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        {activeTab === "text"
          ? renderStories(textStories, "textChapter/create")
          : renderStories(imageStories, "imageChapter")}
      </main>
    </div>
  );
}
