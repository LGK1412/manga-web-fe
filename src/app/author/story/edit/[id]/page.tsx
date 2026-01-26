"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, ImageIcon, CopySlash as Publish, Plus } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { availableStatuses } from "@/lib/data";

export default function EditStoryPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const { toast } = useToast();

    const [storyType, setStoryType] = useState<"text" | "image">("text");
    const [availableGenres, setAvailableGenres] = useState<Array<{ _id: string; name: string }>>([]);
    const [currentStory, setCurrentStory] = useState<any>(null);

    // Form states for text story
    const [textStoryTitle, setTextStoryTitle] = useState("");
    const [textStorySummary, setTextStorySummary] = useState("");
    const [textSelectedGenres, setTextSelectedGenres] = useState<string[]>([]);
    const [textStoryStatus, setTextStoryStatus] = useState("ongoing");
    const [textIsPublish, setTextIsPublish] = useState(true);
    const [textCoverFile, setTextCoverFile] = useState<File | null>(null);
    const [textCoverPreview, setTextCoverPreview] = useState<string | null>(null);

    // Form states for image story
    const [imageStoryTitle, setImageStoryTitle] = useState("");
    const [imageStorySummary, setImageStorySummary] = useState("");
    const [imageSelectedGenres, setImageSelectedGenres] = useState<string[]>([]);
    const [imageStoryStatus, setImageStoryStatus] = useState("ongoing");
    const [imageIsPublish, setImageIsPublish] = useState(true);
    const [imageCoverFile, setImageCoverFile] = useState<File | null>(null);
    const [imageCoverPreview, setImageCoverPreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const decodeToken = () => {
        const raw = Cookies.get("user_normal_info");
        if (!raw) return null;
        try {
            const decoded = decodeURIComponent(raw);
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const gr = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/genre`, { withCredentials: true });
                if (mounted) setAvailableGenres(Array.isArray(gr.data) ? gr.data : []);

                const payload = decodeToken();
                const authorId = payload?.user_id;
                if (!authorId) {
                    toast({
                        title: "Error",
                        description: "Please log in again.",
                        variant: "destructive",
                    });
                    router.push("/login");
                    return;
                }

                try {
                    const { data } = await axios.get(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/author/${authorId}`,
                        { withCredentials: true }
                    );
                    const allStories = Array.isArray(data) ? data : [...(data?.published || []), ...(data?.drafts || [])];
                    const current = allStories.find((s: Record<string, unknown>) => s?._id === params.id);
                    if (!current) {
                        toast({
                            title: "Error",
                            description: "Story not found.",
                            variant: "destructive",
                        });
                        router.push("/author/dashboard");
                        return;
                    }
                    setCurrentStory(current);

                    type Genre = string | { _id: string };
                    const genresIds: string[] = (current.genres || []).map((g: Genre) =>
                        typeof g === "string" ? g : g._id
                    );

                    const hasLightNovel = current.styles?.some((style: { name: string }) => style.name === "Light Novel");
                    if (hasLightNovel) {
                        setStoryType("text");
                        setTextStoryTitle(current.title || "");
                        setTextStorySummary(current.summary || "");
                        setTextSelectedGenres(genresIds);
                        setTextStoryStatus((current.status || "ongoing").toLowerCase());
                        setTextIsPublish(!!current.isPublish);
                        if (current.coverImage) {
                            setTextCoverPreview(`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${current.coverImage}`);
                        }
                    } else {
                        setStoryType("image");
                        setImageStoryTitle(current.title || "");
                        setImageStorySummary(current.summary || "");
                        setImageSelectedGenres(genresIds);
                        setImageStoryStatus((current.status || "ongoing").toLowerCase());
                        setImageIsPublish(!!current.isPublish);
                        if (current.coverImage) {
                            setImageCoverPreview(`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${current.coverImage}`);
                        }
                    }
                } catch {
                    toast({
                        title: "Error",
                        description: "Unable to load story data.",
                        variant: "destructive",
                    });
                }
            } catch {}
        })();

        return () => { mounted = false; };
    }, [params.id, router, toast]);

    const getCurrentFormValues = useMemo(() => () => {
        return storyType === "text"
            ? {
                  title: textStoryTitle,
                  summary: textStorySummary,
                  genres: textSelectedGenres,
                  status: textStoryStatus,
                  isPublish: textIsPublish,
                  coverFile: textCoverFile,
              }
            : {
                  title: imageStoryTitle,
                  summary: imageStorySummary,
                  genres: imageSelectedGenres,
                  status: imageStoryStatus,
                  isPublish: imageIsPublish,
                  coverFile: imageCoverFile,
              };
    }, [
        storyType,
        textStoryTitle,
        textStorySummary,
        textSelectedGenres,
        textStoryStatus,
        textIsPublish,
        textCoverFile,
        imageStoryTitle,
        imageStorySummary,
        imageSelectedGenres,
        imageStoryStatus,
        imageIsPublish,
        imageCoverFile,
    ]);

    const handleUpdate = async () => {
        const v = getCurrentFormValues();

        // Title
        if (!v.title?.trim())
            return toast({ title: "Error", description: "Please enter story title.", variant: "destructive" });

        if (v.title.trim().length < 3)
            return toast({ title: "Error", description: "Story title must be at least 3 characters.", variant: "destructive" });

        if (v.title.trim().length > 100)
            return toast({ title: "Error", description: "Story title must not exceed 100 characters.", variant: "destructive" });

        // Summary
        if (!v.summary?.trim())
            return toast({ title: "Error", description: "Please enter description.", variant: "destructive" });

        if (v.summary.trim().length < 10)
            return toast({ title: "Error", description: "Description must be at least 10 characters.", variant: "destructive" });

        if (v.summary.trim().length > 1000)
            return toast({ title: "Error", description: "Description must not exceed 1000 characters.", variant: "destructive" });

        // Genres
        if (!v.genres?.length)
            return toast({ title: "Error", description: "Please select at least 1 genre.", variant: "destructive" });

        if (v.genres.length > 3)
            return toast({ title: "Error", description: "Maximum 3 genres allowed.", variant: "destructive" });

        // Cover
        if (!v.coverFile && !currentStory?.coverImage)
            return toast({ title: "Error", description: "Please select a cover image for the story.", variant: "destructive" });

        // Build form data
        const formData = new FormData();
        formData.append("title", v.title);
        formData.append("summary", v.summary);
        formData.append("status", (v.status || "").toLowerCase());
        formData.append("isPublish", String(Boolean(v.isPublish)));
        formData.append("type", storyType);

        v.genres.forEach((genreId: string) => {
            formData.append("genres", genreId);
        });

        if (v.coverFile) {
            formData.append("coverImage", v.coverFile);
        } else if (currentStory?.coverImage) {
            formData.append("keepExistingCover", "true");
        }

        try {
            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/manga/update/${params.id}`, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast({ title: "Updated successfully!", description: "Story has been updated successfully", variant: "success" });
            router.push("/author/dashboard");
        } catch {
            toast({ title: "Failed to update", description: "Please check your data/login again.", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8 pt-20">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Edit Story</h1>
                </div>

                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="flex justify-center">
                        <Tabs value={storyType} onValueChange={(value) => setStoryType(value as "text" | "image")}>
                            <TabsList className="grid w-full grid-cols-2 max-w-md">
                                <TabsTrigger value="text" className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    Light Novel
                                </TabsTrigger>
                                <TabsTrigger value="image" className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    Manga
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {storyType === "text" ? <BookOpen className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                    {storyType === "text" ? "Light Novel" : "Manga"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Title + Description + Cover */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left side */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="story-title">Story Title *</Label>
                                            <Input
                                                id="story-title"
                                                placeholder="Enter story title"
                                                value={storyType === "text" ? textStoryTitle : imageStoryTitle}
                                                onChange={(e) => storyType === "text" ? setTextStoryTitle(e.target.value) : setImageStoryTitle(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="story-description">Story Description *</Label>
                                            <Textarea
                                                className="h-43"
                                                id="story-description"
                                                placeholder="Write a short description about your story"
                                                rows={6}
                                                value={storyType === "text" ? textStorySummary : imageStorySummary}
                                                onChange={(e) => storyType === "text" ? setTextStorySummary(e.target.value) : setImageStorySummary(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Right side - Cover Image */}
                                    <div className="flex flex-col items-center -mt-6">
                                        <Label>Cover Image *</Label>
                                        <div
                                            className="w-50 h-70 border rounded-md flex items-center justify-center cursor-pointer relative group mt-2"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {storyType === "text" ? (
                                                textCoverPreview ? (
                                                    <img src={textCoverPreview} alt="cover preview" className="w-full h-full object-cover rounded-md" />
                                                ) : (
                                                    <div className="text-gray-400 flex flex-col items-center">
                                                        <ImageIcon className="w-8 h-8 mb-2" />
                                                        <span>Select image</span>
                                                    </div>
                                                )
                                            ) : (
                                                imageCoverPreview ? (
                                                    <img src={imageCoverPreview} alt="cover preview" className="w-full h-full object-cover rounded-md" />
                                                ) : (
                                                    <div className="text-gray-400 flex flex-col items-center">
                                                        <ImageIcon className="w-8 h-8 mb-2" />
                                                        <span>Select image</span>
                                                    </div>
                                                )
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
                                                    if (storyType === "text") {
                                                        setTextCoverFile(file);
                                                        setTextCoverPreview(URL.createObjectURL(file));
                                                    } else {
                                                        setImageCoverFile(file);
                                                        setImageCoverPreview(URL.createObjectURL(file));
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Genres *</Label>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        {availableGenres.map((g) => {
                                            const selected = storyType === "text" ? textSelectedGenres : imageSelectedGenres;
                                            const checked = selected.includes(g._id);
                                            return (
                                                <div key={g._id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`genre-${g._id}`}
                                                        checked={checked}
                                                        onCheckedChange={(c) => {
                                                            const next = c ? [...selected, g._id] : selected.filter((x) => x !== g._id);
                                                            if (storyType === "text") {
                                                                setTextSelectedGenres(next);
                                                            } else {
                                                                setImageSelectedGenres(next);
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={`genre-${g._id}`} className="text-sm">{g.name}</Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="story-status">Status</Label>
                                    <Select
                                        value={storyType === "text" ? textStoryStatus : imageStoryStatus}
                                        onValueChange={(v) => (storyType === "text" ? setTextStoryStatus(v) : setImageStoryStatus(v))}
                                    >
                                        <SelectTrigger id="story-status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableStatuses.map((s: string | { value: string; label: string }) => {
                                                const value = (typeof s === "string" ? s : s.value).toLowerCase();
                                                const label = typeof s === "string" ? s : s.label;
                                                return <SelectItem key={value} value={value}>{label}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is-public"
                                        checked={storyType === "text" ? textIsPublish : imageIsPublish}
                                        onCheckedChange={(v) => (storyType === "text" ? setTextIsPublish(!!v) : setImageIsPublish(!!v))}
                                    />
                                    <Label htmlFor="is-public">Public</Label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button onClick={handleUpdate} className="flex-1" variant="secondary">
                                        <Publish className="w-4 h-4 mr-2" />
                                        Update
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => router.push("/author/dashboard")}>
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}