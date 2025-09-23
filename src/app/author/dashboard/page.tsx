"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, Edit, Upload, Trash2, Undo } from "lucide-react"
import Cookies from "js-cookie"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

interface Manga {
    _id: string
    title: string
    summary: string
    genres: string[]
    status: "ongoing" | "completed" | "hiatus"
    styles: Array<{ _id: string; name: string }>
    isDraft: boolean
    isPublish: boolean
    createdAt: string
    updatedAt: string
    views: number
    coverImage?: string
    isDeleted?: boolean
}

export default function AuthorDashboard() {
    const [textStories, setTextStories] = useState<Manga[]>([])
    const [imageStories, setImageStories] = useState<Manga[]>([])
    const [user, setUser] = useState()
    const [loading, setLoading] = useState(false)

    const router = useRouter()
    const { toast } = useToast()

    const decodeToken = (): any | null => {
        const raw = Cookies.get("user_normal_info")
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw)
                const payload = JSON.parse(decoded)
                return payload
            } catch (e) {
                console.error("Invalid cookie data")
            }
        }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const payload = decodeToken();
      if (!payload) return;
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${payload.user_id}`,
          { withCredentials: true }
        );

        const allStories: Manga[] = Array.isArray(data)
          ? data
          : [...(data?.published || []), ...(data?.drafts || [])];
        
        setTextStories(allStories.filter((s) => s.type === "text"));
        setImageStories(allStories.filter((s) => s.type === "image"));
      } catch (err) {
        console.error("Lỗi khi fetch data:", err);
      }
    };
    fetchData();
  }, []);

    const handleToggleDelete = async (storyId: string) => {
        // Find the story to check if it's currently deleted
        const allStories = [...textStories, ...imageStories]
        const story = allStories.find(s => s._id === storyId)
        const isCurrentlyDeleted = story?.isDeleted || false

        const action = isCurrentlyDeleted ? "khôi phục" : "xóa"
        const confirmMessage = `Bạn có chắc chắn muốn ${action} truyện "${story?.title}" không?`
        
        if (!confirm(confirmMessage)) {
            return
        }

        setLoading(true)
        try {
            const payload = decodeToken()
            if (!payload) return

            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${storyId}/toggle-delete`,
                {},
                { withCredentials: true }
            )

            // Update local state
            setTextStories(prev => 
                prev.map(story => 
                    story._id === storyId 
                        ? { ...story, isDeleted: !story.isDeleted }
                        : story
                )
            )
            setImageStories(prev => 
                prev.map(story => 
                    story._id === storyId 
                        ? { ...story, isDeleted: !story.isDeleted }
                        : story
                )
            )

            // Show success toast
            toast({
                title: "Thành công",
                description: `Đã ${action} truyện thành công`,
                variant: "success"
            })
        } catch (error) {
            console.error("Lỗi khi toggle delete:", error)
            toast({
                title: "Lỗi",
                description: "Có lỗi xảy ra",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }
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

        {/* Truyện chữ */}
        <h2 className="text-lg font-semibold mb-4">Truyện chữ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {textStories.map((story) => (
            <Card key={story._id} className="hover:shadow-lg transition-shadow">
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
                  {story.isDeleted ? (
                    <Badge variant="secondary" className="text-xs">
                      Đã xoá
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{story.description}</CardDescription>
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
                <div className="flex items-center gap-2">
                  <div className="flex gap-2">
                    <Link href={`/author/story/edit/${story._id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Sửa
                      </Button>
                    </Link>
                    <Link
                      href={`/author/chapter/${story._id}/textChapter/create`}
                    >
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-1" />
                        Chapter
                      </Button>
                    </Link>
                  </div>
                  <div className="ml-auto">
                    <Button
                      variant={story.isDeleted ? "outline" : "destructive"}
                      size="sm"
                      onClick={() =>
                        handleToggleDelete(story._id, !!story.isDeleted)
                      }
                    >
                      <Trash className="w-4 h-4 mr-1" />
                      {story.isDeleted ? "Hoàn tác" : "Xoá"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {textStories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Không có truyện chữ nào
          </div>
        )}
                {/* Truyện chữ */}
                <h2 className="text-lg font-semibold mb-4">Truyện chữ</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {textStories.map((story) => (
                        <Card key={story._id} className="max-w-sm mx-auto hover:shadow-lg transition-shadow">
                            {story.coverImage && (
                                <div className="aspect-[15/16] w-full overflow-hidden rounded-t-lg">
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
                                        <Badge variant="destructive" className="text-xs">Draft</Badge>
                                    ) : (
                                        <Badge variant="default" className="text-xs">Published</Badge>
                                    )}
                                    {story.isDeleted && (
                                        <Badge variant="secondary" className="text-xs">Đã xóa</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">{story.summary}</CardDescription>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {story.genres.map((g: any) => {
                                        const key = typeof g === "string" ? g : g._id || g.name
                                        const label = typeof g === "string" ? g : g.name
                                        return (
                                            <Badge key={key} variant="secondary" className="text-xs">
                                                {label}
                                            </Badge>
                                        )
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
                                        <Link href={`/author/chapter/${story._id}/textChapter/create`}>
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
                {textStories.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        Không có truyện chữ nào
                    </div>
                )}

                {/* Truyện tranh */}
                <h2 className="text-lg font-semibold mt-10 mb-4">Truyện tranh</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {imageStories.map((story) => (
                        <Card key={story._id} className="max-w-sm mx-auto hover:shadow-lg transition-shadow">
                            {story.coverImage && (
                                <div className="aspect-[15/16] w-full overflow-hidden rounded-t-lg">
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
                                        <Badge variant="destructive" className="text-xs">Draft</Badge>
                                    ) : (
                                        <Badge variant="default" className="text-xs">Published</Badge>
                                    )}
                                    {story.isDeleted && (
                                        <Badge variant="secondary" className="text-xs">Đã xóa</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">{story.summary}</CardDescription>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {story.genres.map((g: any) => {
                                        const key = typeof g === "string" ? g : g._id || g.name
                                        const label = typeof g === "string" ? g : g.name
                                        return (
                                            <Badge key={key} variant="secondary" className="text-xs">
                                                {label}
                                            </Badge>
                                        )
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
                                        <Link href={`/author/chapter/${story._id}/imageChapter`}>
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
              </CardContent>
            </Card>
          ))}
        </div>
        {imageStories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Không có truyện tranh nào
          </div>
        )}
      </main>
    </div>
  );
}
