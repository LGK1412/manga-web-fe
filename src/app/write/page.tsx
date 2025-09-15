"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { BookOpen, Plus, Save, CopySlash as Publish, Trash2, PenTool, ImageIcon, Edit } from "lucide-react"
import { availableStatuses } from "@/lib/data"
import apiClient from "@/lib/api"

interface ImagePage {
  id: number
  images: string[]
  pageNumber: number
}

interface Story {
  id: string
  title: string
  description: string
  genres: string[]
  status: string
  isPublic: boolean
  type: "text" | "image"
  createdAt: string
  viewCount: number
  isDraft: boolean
}

interface Chapter {
  id: string
  title: string
  content?: string
  pages?: ImagePage[]
  isFree: boolean
  createdAt: string
  storyId: string
  storyType: "text" | "image"
}

export default function WritePage() {
  const { toast } = useToast()

  // Page States
  const [currentPage, setCurrentPage] = useState<"manage" | "create" | "edit" | "write">("manage")
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [currentStory, setCurrentStory] = useState<Story | null>(null)

  const [tempStoryId, setTempStoryId] = useState<string | null>(null)

  // Stories Management
  const [stories, setStories] = useState<Story[]>([])

  // Separate state for draft stories
  const [draftStories, setDraftStories] = useState<Story[]>([])

  // Text Story Form States
  const [textStoryTitle, setTextStoryTitle] = useState("")
  const [textStoryDescription, setTextStoryDescription] = useState("")
  const [textSelectedGenres, setTextSelectedGenres] = useState<string[]>([])
  const [textStoryStatus, setTextStoryStatus] = useState<string>("ongoing")
  const [textIsPublic, setTextIsPublic] = useState(true)

  // Image Story Form States
  const [imageStoryTitle, setImageStoryTitle] = useState("")
  const [imageStoryDescription, setImageStoryDescription] = useState("")
  const [imageSelectedGenres, setImageSelectedGenres] = useState<string[]>([])
  const [imageStoryStatus, setImageStoryStatus] = useState<string>("ongoing")
  const [imageIsPublic, setImageIsPublic] = useState(true)

  const [storyType, setStoryType] = useState<"text" | "image">("text")

  // Chapter States
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterTitle, setChapterTitle] = useState("")
  const [chapterContent, setChapterContent] = useState("")
  const [isChapterFree, setIsChapterFree] = useState(true)
  const [editingChapter, setEditingChapter] = useState<any>(null)

  // Image Chapter States
  const [imagePages, setImagePages] = useState<any[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")

  // Genres loaded from API
  const [availableGenres, setAvailableGenres] = useState<string[]>([])

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const res = await apiClient.get('/genre')
        const names = Array.isArray(res.data) ? res.data.map((g: any) => g.name).filter(Boolean) : []
        if (isMounted) setAvailableGenres(names)
      } catch (error) {
        console.error("Failed to load genres", error)
        if (isMounted) setAvailableGenres([])
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const getCurrentFormValues = () => {
    if (storyType === "text") {
      return {
        title: textStoryTitle,
        description: textStoryDescription,
        genres: textSelectedGenres,
        status: textStoryStatus,
        isPublic: textIsPublic,
      }
    } else {
      return {
        title: imageStoryTitle,
        description: imageStoryDescription,
        genres: imageSelectedGenres,
        status: imageStoryStatus,
        isPublic: imageIsPublic,
      }
    }
  }

  const setCurrentFormValues = (values: any) => {
    if (storyType === "text") {
      setTextStoryTitle(values.title || "")
      setTextStoryDescription(values.description || "")
      setTextSelectedGenres(values.genres || [])
      setTextStoryStatus(values.status || "ongoing")
      setTextIsPublic(values.isPublic !== undefined ? values.isPublic : true)
    } else {
      setImageStoryTitle(values.title || "")
      setImageStoryDescription(values.description || "")
      setImageSelectedGenres(values.genres || [])
      setImageStoryStatus(values.status || "ongoing")
      setImageIsPublic(values.isPublic !== undefined ? values.isPublic : true)
    }
  }

  const resetForm = () => {
    if (storyType === "text") {
      setTextStoryTitle("")
      setTextStoryDescription("")
      setTextSelectedGenres([])
      setTextStoryStatus("ongoing")
      setTextIsPublic(true)
    } else {
      setImageStoryTitle("")
      setImageStoryDescription("")
      setImageSelectedGenres([])
      setImageStoryStatus("ongoing")
      setImageIsPublic(true)
    }
  }

  // Reset chapter form
  const resetChapterForm = () => {
    setChapterTitle("")
    setChapterContent("")
    setImagePages([])
    setNewImageUrl("")
    setIsChapterFree(true)
    setEditingChapter(null)
  }

  // Handle create new story
  const handleCreateNewStory = () => {
    resetForm()
    setEditingStory(null)
    const newTempId = `temp-${Date.now()}`
    setTempStoryId(newTempId)
    // Create temporary story object for immediate use
    setCurrentStory({ id: newTempId, type: storyType, isDraft: true } as Story)
    setCurrentPage("create")
  }

  const handleEditStory = (story: Story) => {
    setStoryType(story.type)
    setCurrentFormValues({
      title: story.title,
      description: story.description,
      genres: story.genres,
      status: story.status,
      isPublic: story.isPublic,
    })
    setEditingStory(story)
    setCurrentStory(story)
    setCurrentPage("edit")
  }

  // Handle delete story
  const handleDeleteStory = (storyId: string) => {
    // Check if story is in published stories
    const publishedStory = stories.find((story) => story.id === storyId)
    if (publishedStory) {
      setStories(stories.filter((story) => story.id !== storyId))
    } else {
      // Remove from draft stories
      setDraftStories(draftStories.filter((story) => story.id !== storyId))
    }

    toast({
      title: "Truyện đã xóa!",
      description: "Truyện đã được xóa khỏi danh sách.",
    })
  }

  const handleSaveStory = () => {
    const formValues = getCurrentFormValues()

    if (!formValues.title.trim()) {
    toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên truyện.",
        variant: "destructive",
      })
      return
    }

    const storyData: Story = {
      id: editingStory?.id || Date.now().toString(),
      title: formValues.title,
      description: formValues.description,
      genres: formValues.genres,
      status: formValues.status,
      isPublic: formValues.isPublic,
      type: storyType,
      createdAt: editingStory?.createdAt || new Date().toISOString().split("T")[0],
      viewCount: editingStory?.viewCount || 0,
      isDraft: true,
    }

    if (!editingStory && tempStoryId) {
      setChapters(
        chapters.map((chapter) =>
          chapter.storyId === tempStoryId && chapter.storyType === storyType
            ? { ...chapter, storyId: storyData.id }
            : chapter,
        ),
      )
    }

    if (editingStory) {
      if (editingStory.isDraft) {
        setDraftStories(draftStories.map((story) => (story.id === editingStory.id ? storyData : story)))
      } else {
        // If editing a published story, keep it published but update content
        storyData.isDraft = false
        setStories(stories.map((story) => (story.id === editingStory.id ? storyData : story)))
      }
      toast({
        title: "Truyện đã cập nhật!",
        description: "Thông tin truyện đã được cập nhật thành công.",
      })
    } else {
      setDraftStories([...draftStories, storyData])
    toast({
        title: "Nháp đã lưu!",
        description: "Truyện đã được lưu vào nháp.",
      })
    }

    setCurrentStory(storyData)
    resetChapterForm()
    // Stay on current page (edit/create) instead of going to write page
  }

  const handlePublishStory = () => {
    const formValues = getCurrentFormValues()

    if (!formValues.title.trim()) {
    toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên truyện.",
        variant: "destructive",
      })
      return
    }

    const storyData: Story = {
      id: editingStory?.id || Date.now().toString(),
      title: formValues.title,
      description: formValues.description,
      genres: formValues.genres,
      status: formValues.status,
      isPublic: formValues.isPublic,
      type: storyType,
      createdAt: editingStory?.createdAt || new Date().toISOString().split("T")[0],
      viewCount: editingStory?.viewCount || 0,
      isDraft: false,
    }

    if (!editingStory && tempStoryId) {
      setChapters(
        chapters.map((chapter) =>
          chapter.storyId === tempStoryId && chapter.storyType === storyType
            ? { ...chapter, storyId: storyData.id }
            : chapter,
        ),
      )
    }

    if (editingStory) {
      if (editingStory.isDraft) {
        // Remove from drafts and add to published stories
        setDraftStories(draftStories.filter((story) => story.id !== editingStory.id))
        setStories([...stories, storyData])
      } else {
        // Update existing published story
        setStories(stories.map((story) => (story.id === editingStory.id ? storyData : story)))
      }
    } else {
      setStories([...stories, storyData])
    }

    setCurrentPage("manage")
    resetForm()
    toast({
      title: "Truyện đã xuất bản!",
      description: "Truyện của bạn đã được xuất bản thành công!",
    })
  }

  // Handle edit chapter
  const handleEditChapter = (chapter: any) => {
    setChapterTitle(chapter.title)
    if (currentStory?.type === "text") {
      setChapterContent(chapter.content)
    } else {
      setImagePages(chapter.pages || [])
    }
    setIsChapterFree(chapter.isFree)
    setEditingChapter(chapter)
    setCurrentPage("write")
  }

  // Handle add image page
  const handleAddImagePage = () => {
    if (newImageUrl.trim()) {
      const newPage = {
        id: Date.now(),
        images: [newImageUrl],
        pageNumber: imagePages.length + 1,
      }
      setImagePages([...imagePages, newPage])
      setNewImageUrl("")
      toast({
        title: "Trang mới đã thêm!",
        description: "Trang mới đã được tạo với hình ảnh đầu tiên.",
      })
    } else {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập URL hình ảnh.",
        variant: "destructive",
      })
    }
  }

  // New function to add image to existing page
  const handleAddImageToPage = (pageId: number) => {
    if (newImageUrl.trim()) {
      setImagePages(
        imagePages.map((page) => (page.id === pageId ? { ...page, images: [...page.images, newImageUrl] } : page)),
      )
      setNewImageUrl("")
      toast({
        title: "Hình ảnh đã thêm!",
        description: "Hình ảnh mới đã được thêm vào trang.",
      })
    }
  }

  // New function to remove specific image from page
  const handleRemoveImageFromPage = (pageId: number, imageIndex: number) => {
    setImagePages(
      imagePages.map((page) =>
        page.id === pageId
          ? { ...page, images: page.images.filter((_: string, index: number) => index !== imageIndex) }
          : page,
      ),
    )
    toast({
      title: "Hình ảnh đã xóa!",
      description: "Hình ảnh đã được xóa khỏi trang.",
    })
  }

  // Handle remove image page
  const handleRemoveImagePage = (id: number) => {
    setImagePages(imagePages.filter((page) => page.id !== id))
    toast({
      title: "Trang hình đã xóa!",
      description: "Trang hình đã được xóa khỏi chương.",
    })
  }

  // Handle save chapter
  const handleSaveChapter = () => {
    console.log("[v0] handleSaveChapter called")
    console.log("[v0] currentStory:", currentStory)
    console.log("[v0] tempStoryId:", tempStoryId)
    console.log("[v0] chapterTitle:", chapterTitle)
    console.log("[v0] storyType:", storyType)

    if (!currentStory) {
      if (!tempStoryId) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy truyện hiện tại. Vui lòng tạo truyện trước.",
          variant: "destructive",
        })
        setCurrentPage("manage")
        return
      }

      // Create temporary story for chapter saving
      const tempStory: Story = {
        id: tempStoryId,
        title: "Truyện tạm thời",
        description: "",
        genres: [],
        status: "ongoing",
        isPublic: true,
        type: storyType,
        createdAt: new Date().toISOString().split("T")[0],
        viewCount: 0,
        isDraft: true,
      }
      setCurrentStory(tempStory)
      console.log("[v0] Created temporary story:", tempStory)
    }

    if (!chapterTitle.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên chương.",
        variant: "destructive",
      })
      return
    }

    const effectiveStory = currentStory || { id: tempStoryId, type: storyType }
    console.log("[v0] Using effectiveStory:", effectiveStory)

    const chapterData: Chapter = {
      id: editingChapter?.id || Date.now().toString(),
      title: chapterTitle,
      content: effectiveStory.type === "text" ? chapterContent : undefined,
      pages: effectiveStory.type === "image" ? imagePages : undefined,
      isFree: isChapterFree,
      createdAt: editingChapter?.createdAt || new Date().toISOString().split("T")[0],
      storyId: effectiveStory.id!,
      storyType: effectiveStory.type!,
    }

    console.log("[v0] Chapter data to save:", chapterData)

    if (editingChapter) {
      setChapters(chapters.map((ch) => (ch.id === editingChapter.id ? chapterData : ch)))
      toast({ title: "Chương đã cập nhật!" })
    } else {
      setChapters([...chapters, chapterData])
      toast({ title: "Chương đã lưu!" })
    }

    resetChapterForm()
    setCurrentPage(editingStory ? "edit" : "create")
  }

  // Handle delete chapter
  const handleDeleteChapter = (chapterId: string) => {
    setChapters(chapters.filter((chapter) => chapter.id !== chapterId))
    toast({
      title: "Chương đã xóa!",
      description: "Chương đã được xóa khỏi danh sách.",
    })
  }

  const handleGenreChange = (genre: string, checked: boolean) => {
    if (storyType === "text") {
      if (checked) {
        setTextSelectedGenres([...textSelectedGenres, genre])
      } else {
        setTextSelectedGenres(textSelectedGenres.filter((g) => g !== genre))
      }
    } else {
      if (checked) {
        setImageSelectedGenres([...imageSelectedGenres, genre])
      } else {
        setImageSelectedGenres(imageSelectedGenres.filter((g) => g !== genre))
      }
    }
  }

  const getCurrentStoryChapters = useMemo(() => {
    if (!currentStory?.id) return []
    return chapters.filter((chapter) => chapter.storyId === currentStory.id && chapter.storyType === currentStory.type)
  }, [chapters, currentStory])

  // Reset chapter form when story type changes
  useEffect(() => {
    if (currentPage === "write") {
      resetChapterForm()
    }
  }, [currentStory?.type])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {currentPage === "manage" && (
          // Story Management Page
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-8">Quản lý Truyện</h1>
            <div className="flex justify-end">
              <Button onClick={handleCreateNewStory} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Tạo truyện mới
              </Button>
            </div>

            <div className="grid gap-4">
              {stories.length === 0 && draftStories.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Chưa có truyện nào</h3>
                    <p className="text-muted-foreground mb-4">Hãy tạo truyện đầu tiên của bạn!</p>
                  </CardContent>
                </Card>
              ) : (
                [...stories, ...draftStories].map((story) => (
                  <Card key={story.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">{story.title}</h3>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                story.type === "text" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {story.type === "text" ? "Truyện Chữ" : "Truyện Tranh"}
                            </span>
                            {story.isDraft && (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Nháp</span>
                            )}
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                story.status === "ongoing"
                                  ? "bg-green-100 text-green-800"
                                  : story.status === "completed"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {story.status === "ongoing"
                                ? "Đang tiến hành"
                                : story.status === "completed"
                                  ? "Hoàn thành"
                                  : "Tạm dừng"}
                            </span>
                            {story.isPublic ? (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Công khai</span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Riêng tư</span>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-3">{story.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Tạo: {story.createdAt}</span>
                            <span>Lượt xem: {story.viewCount}</span>
                            <div className="flex gap-1">
                              {story.genres.map((genre) => (
                                <span key={genre} className="px-2 py-1 bg-secondary rounded text-xs">
                                  {genre}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditStory(story)}
                            title="Chỉnh sửa truyện"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteStory(story.id)}
                            title="Xóa truyện"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {(currentPage === "create" || currentPage === "edit") && (
          // Create/Edit Story Form with Chapter List
          <div className="space-y-6">
            <div className="mb-6">
              <Button variant="outline" onClick={() => setCurrentPage("manage")} className="mb-4">
                ← Quay lại danh sách
              </Button>
              <h2 className="text-2xl font-semibold">
                {currentPage === "create" ? "Tạo truyện mới" : "Chỉnh sửa truyện"}
              </h2>
            </div>

            {/* Story Type Selection - Outside the card */}
            <div className="space-y-2 flex flex-col items-center">
              <Tabs value={storyType} onValueChange={(value) => setStoryType(value as "text" | "image")}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="text">
              <BookOpen className="w-4 h-4 mr-2" /> Truyện Chữ
            </TabsTrigger>
                  <TabsTrigger value="image">
              <ImageIcon className="w-4 h-4 mr-2" /> Truyện Tranh
            </TabsTrigger>
          </TabsList>
              </Tabs>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Story Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {storyType === "text" ? <BookOpen className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    {storyType === "text" ? "Truyện Chữ" : "Truyện Tranh"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="story-title">Tên truyện *</Label>
                    <Input
                      id="story-title"
                      placeholder="Nhập tên truyện"
                      value={getCurrentFormValues().title}
                      onChange={(e) => setCurrentFormValues({ ...getCurrentFormValues(), title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="story-description">Mô tả truyện</Label>
                    <Textarea
                      id="story-description"
                      placeholder="Viết mô tả ngắn về truyện của bạn"
                      rows={5}
                      value={getCurrentFormValues().description}
                      onChange={(e) => setCurrentFormValues({ ...getCurrentFormValues(), description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Thể loại</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableGenres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2">
                          <Checkbox
                            id={`genre-${genre}`}
                            checked={getCurrentFormValues().genres.includes(genre)}
                            onCheckedChange={(checked) => handleGenreChange(genre, checked as boolean)}
                          />
                          <Label htmlFor={`genre-${genre}`} className="text-sm">
                            {genre}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="story-status">Trạng thái</Label>
                    <Select
                      value={getCurrentFormValues().status}
                      onValueChange={(value) => setCurrentFormValues({ ...getCurrentFormValues(), status: value })}
                    >
                      <SelectTrigger id="story-status">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === "ongoing"
                              ? "Đang tiến hành"
                              : status === "completed"
                                ? "Hoàn thành"
                                : "Tạm dừng"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-public"
                      checked={getCurrentFormValues().isPublic}
                      onCheckedChange={(checked) =>
                        setCurrentFormValues({ ...getCurrentFormValues(), isPublic: checked as boolean })
                      }
                    />
                    <Label htmlFor="is-public">Công khai</Label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        console.log("[v0] Create chapter button clicked from form")
                        console.log("[v0] currentStory:", currentStory)
                        console.log("[v0] tempStoryId:", tempStoryId)
                        resetChapterForm()
                        setCurrentPage("write")
                      }}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tạo chapter
                    </Button>
                    <Button onClick={handlePublishStory} className="flex-1" variant="secondary">
                      <Publish className="w-4 h-4 mr-2" />
                      {editingStory && !editingStory.isDraft ? "Cập nhật" : "Xuất bản"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Chapter List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Danh sách Chapter - {storyType === "text" ? "Truyện chữ" : "Truyện tranh"}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {getCurrentStoryChapters.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <PenTool className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có chapter nào</p>
                      <p className="text-sm">Hãy viết chapter đầu tiên!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getCurrentStoryChapters.map((chapter) => (
                        <div key={chapter.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex-1">
                            <h4 className="font-medium">{chapter.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{chapter.createdAt}</span>
                              {chapter.isFree && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Miễn phí</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditChapter(chapter)}
                              title="Chỉnh sửa chapter"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteChapter(chapter.id)}
                              title="Xóa chapter"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {currentPage === "write" && (
          // Write Chapter Page
          <div className="space-y-6">
            <div className="mb-6">
              <Button variant="outline" onClick={() => setCurrentPage("manage")} className="mb-4">
                ← Quay lại danh sách
              </Button>
              <h1 className="text-3xl font-bold mb-8">
                {editingChapter ? "Chỉnh sửa Chapter" : "Viết Chapter"} - {currentStory?.title}
              </h1>
            </div>

            {/* Write Chapter Form - Full width */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                  {currentStory?.type === "text" ? <PenTool className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  {editingChapter
                    ? "Chỉnh sửa Chapter"
                    : `${currentStory?.type === "text" ? "Viết" : "Tạo"} Chapter Mới`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chapter-title">Tên chương *</Label>
                    <Input
                      id="chapter-title"
                      placeholder="Nhập tên chương"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="chapter-free"
                      checked={isChapterFree}
                      onCheckedChange={(checked) => setIsChapterFree(checked as boolean)}
                    />
                    <Label htmlFor="chapter-free">Chương miễn phí</Label>
                  </div>
                </div>

                {currentStory?.type === "text" ? (
                  // Text Chapter Content
                  <div className="space-y-2">
                    <Label htmlFor="chapter-content">Nội dung chương</Label>
                    <Textarea
                      id="chapter-content"
                      placeholder="Viết nội dung chương của bạn..."
                      rows={20}
                      value={chapterContent}
                      onChange={(e) => setChapterContent(e.target.value)}
                    />
                  </div>
                ) : (
                  // Image Chapter Content
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Thêm hình ảnh</Label>
                        <div className="flex gap-2">
                    <Input
                          placeholder="URL hình ảnh"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                        />
                        <Button onClick={handleAddImagePage} size="icon" title="Tạo trang mới">
                          <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Image Pages List */}
                  {imagePages.length > 0 && (
                      <div className="space-y-2">
                        <Label>Danh sách trang</Label>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {imagePages.map((page) => (
                            <div key={page.id} className="border rounded-md p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium">Trang {page.pageNumber}</span>
                                <div className="flex gap-2">
                              <Button
                                variant="outline"
                                    size="sm"
                                    onClick={() => handleAddImageToPage(page.id)}
                                    disabled={!newImageUrl.trim()}
                                    title="Thêm ảnh vào trang này"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Thêm ảnh
                              </Button>
                              <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveImagePage(page.id)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Xóa trang
                              </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {page.images.map((imageUrl: string, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-secondary rounded"
                                  >
                                    <span className="text-sm truncate flex-1 mr-2">{imageUrl}</span>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleRemoveImageFromPage(page.id, index)}
                                      title="Xóa ảnh này"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                )}

                <Button onClick={handleSaveChapter} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {editingChapter ? "Cập nhật Chapter" : "Lưu Chapter"}
                          </Button>
                </CardContent>
              </Card>
            </div>
        )}
      </div>
    </div>
  )
}
