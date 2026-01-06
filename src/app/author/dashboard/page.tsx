"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, Edit, Upload, Trash2, Undo, BarChart } from "lucide-react"
import Cookies from "js-cookie"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [activeTab, setActiveTab] = useState<"text" | "image">("text")
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const decodeToken = (): any | null => {
    const raw = Cookies.get("user_normal_info")
    if (raw) {
      try {
        return JSON.parse(decodeURIComponent(raw))
      } catch (e) {
        console.error("Invalid cookie data")
      }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const payload = decodeToken()
      if (!payload) return
      try {
        const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/manga/author/${payload.user_id}`, {
          withCredentials: true,
        })

        const allStories: Manga[] = Array.isArray(data) ? data : [...(data?.published || []), ...(data?.drafts || [])]

        setTextStories(allStories.filter((s) => s.styles?.some((style) => style.name === "Light Novel")))
        setImageStories(allStories.filter((s) => s.styles?.some((style) => style.name === "Manga")))
      } catch (err) {
        console.error("Lỗi khi fetch data:", err)
      }
    }

    fetchData()
  }, [])

  const handleToggleDelete = async (storyId: string) => {
    const allStories = [...textStories, ...imageStories]
    const story = allStories.find((s) => s._id === storyId)
    const isCurrentlyDeleted = story?.isDeleted || false

    const action = isCurrentlyDeleted ? "restore" : "delete"
    if (!confirm(`Are you sure you want to ${action} the story "${story?.title}"?`)) {
      return
    }

    setLoading(true)
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${storyId}/toggle-delete`,
        {},
        { withCredentials: true },
      )

      setTextStories((prev) => prev.map((s) => (s._id === storyId ? { ...s, isDeleted: !s.isDeleted } : s)))

      setImageStories((prev) => prev.map((s) => (s._id === storyId ? { ...s, isDeleted: !s.isDeleted } : s)))

      toast({
        title: "Success",
        description: `Story ${action}d successfully`,
        variant: "success",
      })
    } catch (error) {
      console.error("Lỗi khi toggle delete:", error)
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const renderStories = (list: Manga[], chapterPath: string) => {
    if (list.length === 0)
      return (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-muted-foreground opacity-50" />
          <p className="text-gray-500 dark:text-muted-foreground text-lg">No stories</p>
        </div>
      )

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((story) => (
          <Card
            key={story._id}
            className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-white dark:bg-card border border-gray-200 dark:border-input hover:border-gray-300 dark:hover:border-ring group"
          >
            {story.coverImage && (
              <div className="aspect-[2/1.5] w-full overflow-hidden bg-gray-200 dark:bg-muted relative">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${story.coverImage}`}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <CardHeader>
              <div className="space-y-2">
                <CardTitle className="flex items-start gap-2 text-balance">
                  <BookOpen className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-gray-900 dark:text-foreground">{story.title}</span>
                </CardTitle>

                <div className="flex flex-wrap gap-2">
                  {story.isDraft ? (
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-green-100 text-green-700">Published</Badge>
                  )}
                  {story.isDeleted && (
                    <Badge variant="destructive" className="text-xs">
                      Deleted
                    </Badge>
                  )}
                </div>
              </div>

              <CardDescription className="line-clamp-2 text-xs text-gray-600 dark:text-muted-foreground leading-relaxed mt-2">
                {story.summary}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-muted-foreground">
                  <span>{story.views?.toLocaleString() || 0} views</span>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {story.status}
                  </Badge>
                </div>

                {story.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {story.genres.slice(0, 3).map((g: any) => {
                      const key = typeof g === "string" ? g : g._id || g.name
                      const label = typeof g === "string" ? g : g.name
                      return (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      )
                    })}
                    {story.genres.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{story.genres.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-muted-foreground">{new Date(story.createdAt).toLocaleDateString("vi-VN")}</p>

                <div className="flex gap-2 pt-2">
                  <Link href={`/author/story/edit/${story._id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs bg-transparent">
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/author/chapter/${story._id}/${chapterPath}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs bg-transparent">
                      <Upload className="w-3.5 h-3.5" />
                      Chapter
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleToggleDelete(story._id)}
                    disabled={loading}
                    className="text-xs gap-1"
                  >
                    {story.isDeleted ? (
                      <>
                        <Undo className="w-3.5 h-3.5" />
                        Undo
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <Navbar />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-foreground">Manage Stories</h1>
                <p className="text-gray-600 dark:text-muted-foreground mt-1 text-sm">Total: {textStories.length + imageStories.length} stories</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link href="/author/story/create" className="flex-1 sm:flex-none">
                  <Button className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    <Plus className="w-4 h-4" />
                    Create Story
                  </Button>
                </Link>
                <Link href="/author/static" className="flex-1 sm:flex-none">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto gap-2 border-gray-300 dark:border-input hover:bg-gray-100 dark:hover:bg-accent bg-transparent dark:bg-transparent"
                  >
                    <BarChart className="w-4 h-4" />
                    Statistics
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "text" | "image")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto bg-gray-200 dark:bg-muted">
                <TabsTrigger value="text">Text Stories</TabsTrigger>
                <TabsTrigger value="image">Manga Stories</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content */}
          {activeTab === "text"
            ? renderStories(textStories, "textChapter/create")
            : renderStories(imageStories, "imageChapter")}
        </div>
      </main>
    </div>
  )
}
