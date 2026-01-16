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

  const [availableGenres, setAvailableGenres] = useState<
    Array<{ _id: string; name: string }>
  >([]);
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
          `${process.env.NEXT_PUBLIC_API_URL}/api/genre/`,
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
    console.log("Publish clicked");

    // validate trước
    if (!storyTitle.trim())
      return toast({
        title: "Error",
        description: "Please enter story title.",
        variant: "destructive",
      });

    if (storyTitle.trim().length < 3)
      return toast({
        title: "Error",
        description: "Story title must be at least 3 characters.",
        variant: "destructive",
      });

    if (storyTitle.trim().length > 100)
      return toast({
        title: "Error",
        description: "Story title must not exceed 100 characters.",
        variant: "destructive",
      });

    if (!storySummary.trim())
      return toast({
        title: "Error",
        description: "Please enter description.",
        variant: "destructive",
      });

    if (storySummary.trim().length < 10)
      return toast({
        title: "Error",
        description: "Description must be at least 10 characters.",
        variant: "destructive",
      });

    if (storySummary.trim().length > 1000)
      return toast({
        title: "Error",
        description: "Description must not exceed 1000 characters.",
        variant: "destructive",
      });

    if (!selectedGenres.length)
      return toast({
        title: "Error",
        description: "Please select at least 1 genre.",
        variant: "destructive",
      });

    if (!coverFile)
      return toast({
        title: "Error",
        description: "Please select a cover image for the story.",
        variant: "destructive",
      });

    const tokenPayload = decodeToken();
    const authorId = tokenPayload?.user_id;
    if (!authorId)
      return toast({
        title: "Not logged in",
        description: "Please log in again.",
        variant: "destructive",
      });

    // ----> CHỈ BẬT LOADING SAU KHI VALIDATE XONG <----
    setIsPublishing(true);

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/author/${authorId}`,
        fd,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast({
        title: "Story created successfully!",
        description: "Story has been created successfully",
        variant: "success",
      });
      router.push("/author/dashboard");
    } catch {
      toast({
        title: "Failed to create story",
        description: "Please check your data/login again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsPublishing(false), 2000);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        <h1 className="text-3xl font-bold mb-6">Create New Story</h1>

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
                      {s.name === "Manga" ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <BookOpen className="w-4 h-4" />
                      )}
                      {s.name === "Light Novel"
                        ? "Light Novel"
                        : s.name === "Manga"
                          ? "Manga"
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
                  {storyStyle === "Manga" ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <BookOpen className="w-5 h-5" />
                  )}
                  {storyStyle === "Light Novel"
                    ? "Light Novel"
                    : storyStyle === "Manga"
                      ? "Manga"
                      : storyStyle}
                </CardTitle>

              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title & Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label htmlFor="story-title">Story Title *</Label>
                    <Input
                      id="story-title"
                      value={storyTitle}
                      onChange={(e) => setStoryTitle(e.target.value)}
                      placeholder="Enter story title"
                    />
                    <Label htmlFor="story-description">Description *</Label>
                    <Textarea
                      id="story-description"
                      className="h-43"
                      rows={6}
                      value={storySummary}
                      onChange={(e) => setStorySummary(e.target.value)}
                      placeholder="Write a short description"
                    />
                  </div>

                  {/* Cover */}
                  <div className="flex flex-col items-center -mt-6">
                    <Label>Cover Image *</Label>
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
                          <span>Select image</span>
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
                  <Label>Genres *</Label>
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
                  <Label>Status</Label>
                  <Select value={storyStatus} onValueChange={setStoryStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
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
                  <Label htmlFor="is-public">Public</Label>
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
                    {isPublishing ? "Processing..." : "Publish"}
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/author/dashboard")}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              Currently no story types are available to create.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
