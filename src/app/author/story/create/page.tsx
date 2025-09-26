"use client";

import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, ImageIcon, CopySlash as Publish, Plus } from "lucide-react";
import axios from "axios";
import { availableStatuses } from "@/lib/data";
import Cookies from "js-cookie";

interface StyleDoc {
  _id: string;
  name: string;
}

export default function CreateStoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableGenres, setAvailableGenres] = useState<Array<{ _id: string; name: string }>>([]);
  const [availableStyles, setAvailableStyles] = useState<StyleDoc[]>([]);
  const [storyStyle, setStoryStyle] = useState<string>("");

  // Form state dùng chung
  const [storyTitle, setStoryTitle] = useState("");
  const [storySummary, setStorySummary] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [storyStatus, setStoryStatus] = useState("ongoing");
  const [isPublish, setIsPublish] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/genre/active`,
          { withCredentials: true }
        );
        if (mounted)
          setAvailableGenres(Array.isArray(res.data) ? res.data : []);

        const st = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/styles/active`,
          { withCredentials: true }
        );
        const stylesList: StyleDoc[] = Array.isArray(st.data) ? st.data : [];
        if (mounted) {
          setAvailableStyles(stylesList);
          if (stylesList.length > 0) {
            setStoryStyle(stylesList[0].name);
            setSelectedStyles([stylesList[0]._id]);
          }
        }
      } catch {
        if (mounted) {
          setAvailableGenres([]);
          setAvailableStyles([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Khi đổi style → chọn lại selectedStyles
  useEffect(() => {
    const s = availableStyles.find((st) => st.name === storyStyle);
    if (s) setSelectedStyles([s._id]);
  }, [storyStyle, availableStyles]);

  const handlePublish = async () => {
    setIsPublishing(true);
    if (!storyTitle.trim())
      return toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên truyện.",
        variant: "destructive",
      });

    if (storyTitle.trim().length < 3)
      return toast({
        title: "Lỗi",
        description: "Tên truyện phải có ít nhất 3 ký tự.",
        variant: "destructive",
      });

    if (storyTitle.trim().length > 100)
      return toast({
        title: "Lỗi",
        description: "Tên truyện không được vượt quá 100 ký tự.",
        variant: "destructive",
      });

    if (!storySummary.trim())
      return toast({
        title: "Lỗi",
        description: "Vui lòng nhập mô tả.",
        variant: "destructive",
      });

    if (storySummary.trim().length < 10)
      return toast({
        title: "Lỗi",
        description: "Mô tả phải có ít nhất 10 ký tự.",
        variant: "destructive",
      });

    if (storySummary.trim().length > 1000)
      return toast({
        title: "Lỗi",
        description: "Mô tả không được vượt quá 1000 ký tự.",
        variant: "destructive",
      });

    if (!selectedGenres.length)
      return toast({
        title: "Lỗi",
        description: "Chọn ít nhất 1 thể loại.",
        variant: "destructive",
      });

    if (selectedGenres.length > 3)
      return toast({
        title: "Lỗi",
        description: "Chỉ được chọn tối đa 3 thể loại.",
        variant: "destructive",
      });

    if (!coverFile)
      return toast({
        title: "Lỗi",
        description: "Vui lòng chọn ảnh bìa cho truyện.",
        variant: "destructive",
      });

    const tokenPayload = decodeToken();
    const authorId = tokenPayload?.user_id;
    if (!authorId)
      return toast({
        title: "Thiếu đăng nhập",
        description: "Vui lòng đăng nhập lại.",
        variant: "destructive",
      });

    const fd = new FormData();
    fd.append("title", storyTitle);
    fd.append("summary", storySummary);
    selectedGenres.forEach((g) => fd.append("genres", g));
    selectedStyles.forEach((s) => fd.append("styles", s));
    fd.append("status", storyStatus);
    fd.append("isPublish", String(isPublish));
    fd.append("isDraft", String(false));
    fd.append("coverImage", coverFile);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${authorId}`,
        fd,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast({
        title: "Tạo truyện thành công!",
        description: "Truyện đã được tạo thành công",
        variant: "success",
      });
      router.push("/author/dashboard");
    } catch {
      toast({
        title: "Không tạo được truyện",
        description: "Vui lòng kiểm tra lại dữ liệu/đăng nhập.",
        variant: "destructive",
      });
    } finally {
      // Delay thêm 2 giây trước khi bật lại nút
      setTimeout(() => setIsPublishing(false), 2000);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        <h1 className="text-3xl font-bold mb-6">Tạo truyện mới</h1>

        {availableStyles.length > 0 ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Tabs cho styles */}
            <div className="flex justify-center">
              <Tabs value={storyStyle} onValueChange={setStoryStyle}>
                <TabsList
                  className={`grid w-full max-w-md grid-cols-${availableStyles.length}`}
                >
                  {availableStyles.map((s) => (
                    <TabsTrigger
                      key={s._id}
                      value={s.name}
                      className="flex items-center gap-2"
                    >
                      {s.name === "text" ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {s.name === "text"
                        ? "Truyện Chữ"
                        : s.name === "image"
                          ? "Truyện Tranh"
                          : s.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Form tạo truyện */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {storyStyle === "text" ? (
                    <BookOpen className="w-5 h-5" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                  {storyStyle === "text"
                    ? "Truyện Chữ"
                    : storyStyle === "image"
                      ? "Truyện Tranh"
                      : storyStyle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title & Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label htmlFor="story-title">Tên truyện *</Label>
                    <Input
                      id="story-title"
                      value={storyTitle}
                      onChange={(e) => setStoryTitle(e.target.value)}
                      placeholder="Nhập tên truyện"
                    />
                    <Label htmlFor="story-description">Mô tả *</Label>
                    <Textarea
                      id="story-description"
                      className="h-43"
                      rows={6}
                      value={storySummary}
                      onChange={(e) => setStorySummary(e.target.value)}
                      placeholder="Viết mô tả ngắn"
                    />
                  </div>

                  {/* Cover */}
                  <div className="flex flex-col items-center -mt-6">
                    <Label>Ảnh bìa *</Label>
                    <div
                      className="w-50 h-70 border rounded-md flex items-center justify-center cursor-pointer relative group mt-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {coverPreview ? (
                        <img
                          src={coverPreview}
                          alt="cover preview"
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span>Chọn ảnh</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverFile(file);
                          setCoverPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Genres */}
                <div className="space-y-2">
                  <Label>Thể loại *</Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {availableGenres.map((g) => (
                      <div key={g._id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedGenres.includes(g._id)}
                          onCheckedChange={(c) =>
                            setSelectedGenres(
                              c
                                ? [...selectedGenres, g._id]
                                : selectedGenres.filter((x) => x !== g._id)
                            )
                          }
                        />
                        <Label>{g.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Trạng thái</Label>
                  <Select value={storyStatus} onValueChange={setStoryStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((s: any) => {
                        const value = (
                          typeof s === "string" ? s : s.value
                        ).toLowerCase();
                        const label = typeof s === "string" ? s : s.label;
                        return (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Publish */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-public"
                    checked={isPublish}
                    onCheckedChange={(v) => setIsPublish(!!v)}
                  />
                  <Label htmlFor="is-public">Công khai</Label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handlePublish}
                    className="flex-1"
                    variant="secondary"
                    disabled={isPublishing}         
                  >
                    <Publish className="w-4 h-4 mr-2" />
                    {isPublishing ? "Đang xử lý..." : "Xuất bản"}
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/author/dashboard")}
                  >
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              Hiện tại không có loại truyện nào khả dụng để tạo.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
