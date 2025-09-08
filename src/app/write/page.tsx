"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import {
  BookOpen,
  Plus,
  Save,
  BookIcon as Publish,
  Trash2,
  PenTool,
  ImageIcon,
  Upload,
  X,
  MoveUp,
  MoveDown,
} from "lucide-react"
import { availableGenres, availableStatuses } from "@/lib/data"

interface ImagePage {
  id: number
  imageUrl: string
  description: string
  pageNumber: number
}

export default function WritePage() {
  const { toast } = useToast()

  // Text Story States
  const [storyTitle, setStoryTitle] = useState("")
  const [storyDescription, setStoryDescription] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [storyTags, setStoryTags] = useState("")
  const [storyStatus, setStoryStatus] = useState<string>("ongoing")
  const [isPublic, setIsPublic] = useState(true)

  const [chapterTitle, setChapterTitle] = useState("")
  const [chapterContent, setChapterContent] = useState("")
  const [isChapterFree, setIsChapterFree] = useState(true)

  // Image Story States
  const [imageStoryTitle, setImageStoryTitle] = useState("")
  const [imageStoryDescription, setImageStoryDescription] = useState("")
  const [imageStoryGenres, setImageStoryGenres] = useState<string[]>([])
  const [imageStoryTags, setImageStoryTags] = useState("")
  const [imageStoryStatus, setImageStoryStatus] = useState<string>("ongoing")
  const [isImageStoryPublic, setIsImageStoryPublic] = useState(true)

  // Image Chapter States
  const [imageChapterTitle, setImageChapterTitle] = useState("")
  const [imagePages, setImagePages] = useState<ImagePage[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newImageDescription, setNewImageDescription] = useState("")
  const [isImageChapterFree, setIsImageChapterFree] = useState(true)

  const handleSaveStory = () => {
    console.log("Saving Text Story:", {
      storyTitle,
      storyDescription,
      selectedGenres,
      storyTags,
      storyStatus,
      isPublic,
    })
    toast({
      title: "Truyện chữ đã lưu!",
      description: "Bản nháp truyện chữ của bạn đã được lưu.",
    })
  }

  const handlePublishStory = () => {
    console.log("Publishing Text Story:", {
      storyTitle,
      storyDescription,
      selectedGenres,
      storyTags,
      storyStatus,
      isPublic,
    })
    toast({
      title: "Truyện chữ đã xuất bản!",
      description: "Truyện chữ của bạn đã được xuất bản thành công!",
    })
  }

  const handleSaveChapter = () => {
    console.log("Saving Text Chapter:", {
      chapterTitle,
      chapterContent,
      isChapterFree,
    })
    toast({
      title: "Chương đã lưu!",
      description: "Bản nháp chương của bạn đã được lưu.",
    })
  }

  const handlePublishChapter = () => {
    console.log("Publishing Text Chapter:", {
      chapterTitle,
      chapterContent,
      isChapterFree,
    })
    toast({
      title: "Chương đã xuất bản!",
      description: "Chương của bạn đã có thể đọc được!",
    })
  }

  const handleGenreChange = (genre: string, checked: boolean, isImageStory = false) => {
    if (isImageStory) {
      if (checked) {
        setImageStoryGenres([...imageStoryGenres, genre])
      } else {
        setImageStoryGenres(imageStoryGenres.filter((g) => g !== genre))
      }
    } else {
      if (checked) {
        setSelectedGenres([...selectedGenres, genre])
      } else {
        setSelectedGenres(selectedGenres.filter((g) => g !== genre))
      }
    }
  }

  // Image Story Handlers
  const handleSaveImageStory = () => {
    console.log("Saving Image Story:", {
      imageStoryTitle,
      imageStoryDescription,
      imageStoryGenres,
      imageStoryTags,
      imageStoryStatus,
      isImageStoryPublic,
    })
    toast({
      title: "Truyện tranh đã lưu!",
      description: "Bản nháp truyện tranh của bạn đã được lưu.",
    })
  }

  const handlePublishImageStory = () => {
    console.log("Publishing Image Story:", {
      imageStoryTitle,
      imageStoryDescription,
      imageStoryGenres,
      imageStoryTags,
      imageStoryStatus,
      isImageStoryPublic,
    })
    toast({
      title: "Truyện tranh đã xuất bản!",
      description: "Truyện tranh của bạn đã được xuất bản thành công!",
    })
  }

  const handleAddImagePage = () => {
    if (newImageUrl.trim()) {
      const newPage: ImagePage = {
        id: Date.now(),
        imageUrl: newImageUrl,
        description: newImageDescription,
        pageNumber: imagePages.length + 1,
      }
      setImagePages([...imagePages, newPage])
      setNewImageUrl("")
      setNewImageDescription("")
      toast({
        title: "Trang hình đã thêm!",
        description: "Trang hình mới đã được thêm vào chương.",
      })
    } else {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập URL hình ảnh.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveImagePage = (id: number) => {
    setImagePages(imagePages.filter((page) => page.id !== id))
    toast({
      title: "Trang hình đã xóa!",
      description: "Trang hình đã được xóa khỏi chương.",
    })
  }

  const handleMoveImagePage = (id: number, direction: "up" | "down") => {
    const currentIndex = imagePages.findIndex((page) => page.id === id)
    if (currentIndex === -1) return

    const newPages = [...imagePages]
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (targetIndex >= 0 && targetIndex < newPages.length) {
      ;[newPages[currentIndex], newPages[targetIndex]] = [newPages[targetIndex], newPages[currentIndex]]

      // Update page numbers
      newPages.forEach((page, index) => {
        page.pageNumber = index + 1
      })

      setImagePages(newPages)
    }
  }

  const handleSaveImageChapter = () => {
    console.log("Saving Image Chapter:", {
      imageChapterTitle,
      imagePages,
      isImageChapterFree,
    })
    toast({
      title: "Chương tranh đã lưu!",
      description: "Bản nháp chương tranh của bạn đã được lưu.",
    })
  }

  const handlePublishImageChapter = () => {
    console.log("Publishing Image Chapter:", {
      imageChapterTitle,
      imagePages,
      isImageChapterFree,
    })
    toast({
      title: "Chương tranh đã xuất bản!",
      description: "Chương tranh của bạn đã có thể đọc được!",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        <h1 className="text-3xl font-bold mb-8">Viết Truyện</h1>

        <Tabs defaultValue="text-story">
          <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto mb-8">
            <TabsTrigger value="text-story">
              <BookOpen className="w-4 h-4 mr-2" /> Truyện Chữ
            </TabsTrigger>
            <TabsTrigger value="image-story">
              <ImageIcon className="w-4 h-4 mr-2" /> Truyện Tranh
            </TabsTrigger>
          </TabsList>

          {/* Text Story Tab */}
          <TabsContent value="text-story">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Create/Edit Text Story */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" /> Tạo/Sửa Truyện Chữ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="story-title">Tên truyện</Label>
                    <Input
                      id="story-title"
                      placeholder="Nhập tên truyện"
                      value={storyTitle}
                      onChange={(e) => setStoryTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="story-description">Mô tả truyện</Label>
                    <Textarea
                      id="story-description"
                      placeholder="Viết mô tả ngắn về truyện của bạn"
                      rows={5}
                      value={storyDescription}
                      onChange={(e) => setStoryDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thể loại</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableGenres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2">
                          <Checkbox
                            id={`text-genre-${genre}`}
                            checked={selectedGenres.includes(genre)}
                            onCheckedChange={(checked) => handleGenreChange(genre, checked as boolean, false)}
                          />
                          <Label htmlFor={`text-genre-${genre}`} className="text-sm">
                            {genre}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="story-tags">Tags (phân cách bằng dấu phẩy)</Label>
                    <Input
                      id="story-tags"
                      placeholder="ví dụ: fantasy, phiêu lưu, ma thuật"
                      value={storyTags}
                      onChange={(e) => setStoryTags(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="story-status">Trạng thái</Label>
                    <Select value={storyStatus} onValueChange={setStoryStatus}>
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
                      id="text-is-public"
                      checked={isPublic}
                      onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                    />
                    <Label htmlFor="text-is-public">Công khai</Label>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveStory} className="flex-1">
                      <Save className="w-4 h-4 mr-2" /> Lưu nháp
                    </Button>
                    <Button onClick={handlePublishStory} className="flex-1" variant="secondary">
                      <Publish className="w-4 h-4 mr-2" /> Xuất bản
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Create/Edit Text Chapter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Tạo/Sửa Chương
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="chapter-title">Tên chương</Label>
                    <Input
                      id="chapter-title"
                      placeholder="Nhập tên chương"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chapter-content">Nội dung chương</Label>
                    <Textarea
                      id="chapter-content"
                      placeholder="Viết nội dung chương tại đây..."
                      rows={10}
                      value={chapterContent}
                      onChange={(e) => setChapterContent(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-chapter-free"
                      checked={isChapterFree}
                      onCheckedChange={(checked) => setIsChapterFree(checked as boolean)}
                    />
                    <Label htmlFor="is-chapter-free">Chương miễn phí</Label>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveChapter} className="flex-1">
                      <Save className="w-4 h-4 mr-2" /> Lưu nháp chương
                    </Button>
                    <Button onClick={handlePublishChapter} className="flex-1" variant="secondary">
                      <Publish className="w-4 h-4 mr-2" /> Xuất bản chương
                    </Button>
                  </div>

                  {/* Existing Chapters */}
                  <div>
                    <h3 className="font-semibold mb-3">Chương hiện có</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <span>Chương 1: Khởi đầu</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon">
                            <PenTool className="w-4 h-4" />
                            <span className="sr-only">Sửa</span>
                          </Button>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Xóa</span>
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <span>Chương 2: Hành trình tiếp tục</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon">
                            <PenTool className="w-4 h-4" />
                            <span className="sr-only">Sửa</span>
                          </Button>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Xóa</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Image Story Tab */}
          <TabsContent value="image-story">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Create/Edit Image Story */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" /> Tạo/Sửa Truyện Tranh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="image-story-title">Tên truyện tranh</Label>
                    <Input
                      id="image-story-title"
                      placeholder="Nhập tên truyện tranh"
                      value={imageStoryTitle}
                      onChange={(e) => setImageStoryTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image-story-description">Mô tả truyện tranh</Label>
                    <Textarea
                      id="image-story-description"
                      placeholder="Viết mô tả ngắn về truyện tranh của bạn"
                      rows={5}
                      value={imageStoryDescription}
                      onChange={(e) => setImageStoryDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thể loại</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableGenres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2">
                          <Checkbox
                            id={`image-genre-${genre}`}
                            checked={imageStoryGenres.includes(genre)}
                            onCheckedChange={(checked) => handleGenreChange(genre, checked as boolean, true)}
                          />
                          <Label htmlFor={`image-genre-${genre}`} className="text-sm">
                            {genre}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image-story-tags">Tags (phân cách bằng dấu phẩy)</Label>
                    <Input
                      id="image-story-tags"
                      placeholder="ví dụ: manga, action, romance"
                      value={imageStoryTags}
                      onChange={(e) => setImageStoryTags(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image-story-status">Trạng thái</Label>
                    <Select value={imageStoryStatus} onValueChange={setImageStoryStatus}>
                      <SelectTrigger id="image-story-status">
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
                      id="image-is-public"
                      checked={isImageStoryPublic}
                      onCheckedChange={(checked) => setIsImageStoryPublic(checked as boolean)}
                    />
                    <Label htmlFor="image-is-public">Công khai</Label>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveImageStory} className="flex-1">
                      <Save className="w-4 h-4 mr-2" /> Lưu nháp
                    </Button>
                    <Button onClick={handlePublishImageStory} className="flex-1" variant="secondary">
                      <Publish className="w-4 h-4 mr-2" /> Xuất bản
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Create/Edit Image Chapter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Tạo/Sửa Chương Tranh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="image-chapter-title">Tên chương</Label>
                    <Input
                      id="image-chapter-title"
                      placeholder="Nhập tên chương tranh"
                      value={imageChapterTitle}
                      onChange={(e) => setImageChapterTitle(e.target.value)}
                    />
                  </div>

                  {/* Add Image Page */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Thêm trang hình
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="new-image-url">URL hình ảnh</Label>
                        <Input
                          id="new-image-url"
                          placeholder="https://example.com/image.jpg"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-image-description">Mô tả (tùy chọn)</Label>
                        <Input
                          id="new-image-description"
                          placeholder="Mô tả ngắn về trang này"
                          value={newImageDescription}
                          onChange={(e) => setNewImageDescription(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddImagePage} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Thêm trang
                      </Button>
                    </div>
                  </div>

                  {/* Image Pages List */}
                  {imagePages.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold">Trang hình ({imagePages.length})</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {imagePages.map((page, index) => (
                          <div key={page.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <img
                              src={page.imageUrl || "/placeholder.svg"}
                              alt={`Trang ${page.pageNumber}`}
                              className="w-16 h-20 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium">Trang {page.pageNumber}</p>
                              {page.description && <p className="text-sm text-muted-foreground">{page.description}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleMoveImagePage(page.id, "up")}
                                disabled={index === 0}
                              >
                                <MoveUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleMoveImagePage(page.id, "down")}
                                disabled={index === imagePages.length - 1}
                              >
                                <MoveDown className="w-4 h-4" />
                              </Button>
                              <Button variant="destructive" size="icon" onClick={() => handleRemoveImagePage(page.id)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-image-chapter-free"
                      checked={isImageChapterFree}
                      onCheckedChange={(checked) => setIsImageChapterFree(checked as boolean)}
                    />
                    <Label htmlFor="is-image-chapter-free">Chương miễn phí</Label>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleSaveImageChapter} className="flex-1">
                      <Save className="w-4 h-4 mr-2" /> Lưu nháp chương
                    </Button>
                    <Button onClick={handlePublishImageChapter} className="flex-1" variant="secondary">
                      <Publish className="w-4 h-4 mr-2" /> Xuất bản chương
                    </Button>
                  </div>

                  {/* Existing Image Chapters */}
                  <div>
                    <h3 className="font-semibold mb-3">Chương tranh hiện có</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <span>Chương 1: Nốt nhạc đầu tiên (3 trang)</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon">
                            <PenTool className="w-4 h-4" />
                            <span className="sr-only">Sửa</span>
                          </Button>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Xóa</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
