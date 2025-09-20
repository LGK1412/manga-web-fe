"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { BookOpen, ImageIcon, CopySlash as Publish, Plus } from "lucide-react"
import axios from "axios"
import { availableStatuses } from "@/lib/data"
import Cookies from "js-cookie"

interface Chapter {
  id: string
  title: string
  content?: string
  isFree: boolean
  createdAt: string
  storyId: string
  storyStyle: "text" | "image"
}

export default function CreateStoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [storyStyle, setStoryStyle] = useState<"text" | "image">("text")
  const [availableGenres, setAvailableGenres] = useState<Array<{ _id: string; name: string }>>([])
  const [availableStyles, setAvailableStyles] = useState<Array<{ _id: string; name: string }>>([])
  const [isTextStyleAvailable, setIsTextStyleAvailable] = useState(true)
  const [isImageStyleAvailable, setIsImageStyleAvailable] = useState(true)

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null)

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // text form
  const [textStoryTitle, setTextStoryTitle] = useState("")
  const [textStorySummary, setTextStorySummary] = useState("")
  const [textSelectedGenres, setTextSelectedGenres] = useState<string[]>([])
  const [textSelectedStyles, setTextSelectedStyles] = useState<string[]>([])
  const [textStoryStatus, setTextStoryStatus] = useState("ongoing")
  const [textIsPublish, setTextIsPublish] = useState(true)

  // image form
  const [imageStoryTitle, setImageStoryTitle] = useState("")
  const [imageStorySummary, setImageStorySummary] = useState("")
  const [imageSelectedGenres, setImageSelectedGenres] = useState<string[]>([])
  const [imageSelectedStyles, setImageSelectedStyles] = useState<string[]>([])
  const [imageStoryStatus, setImageStoryStatus] = useState("ongoing")
  const [imageIsPublish, setImageIsPublish] = useState(true)

  const decodeToken = () => {
    const raw = Cookies.get("user_normal_info")
    if (!raw) return null
    try {
      const decoded = decodeURIComponent(raw)
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await axios.get(`http://localhost:3333/api/genre/active`, { withCredentials: true })
        const list = Array.isArray(res.data) ? res.data : []
        if (mounted) setAvailableGenres(list)
        
        const st = await axios.get(`http://localhost:3333/api/styles/active`, { withCredentials: true })
        const stylesList = Array.isArray(st.data) ? st.data : []
        if (mounted) {
          setAvailableStyles(stylesList)
          
          // Kiểm tra styles có sẵn
          const textStyle = stylesList.find(s => s.name === 'text')
          const imageStyle = stylesList.find(s => s.name === 'image')
          
          setIsTextStyleAvailable(!!textStyle)
          setIsImageStyleAvailable(!!imageStyle)
          
          // Nếu text style không có sẵn, chuyển sang image (nếu có)
          if (!textStyle && imageStyle) {
            setStoryStyle('image')
          }
        }
      } catch {
        if (mounted) {
          setAvailableGenres([])
          setAvailableStyles([])
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Auto-select style based on storyStyle
  useEffect(() => {
    if (availableStyles.length > 0) {
      const textStyle = availableStyles.find(s => s.name === 'text')
      const imageStyle = availableStyles.find(s => s.name === 'image')
      
      if (storyStyle === 'text' && textStyle) {
        setTextSelectedStyles([textStyle._id])
        setImageSelectedStyles([])
      } else if (storyStyle === 'image' && imageStyle) {
        setImageSelectedStyles([imageStyle._id])
        setTextSelectedStyles([])
      }
    }
  }, [storyStyle, availableStyles])

  const getCurrentFormValues = () =>
    storyStyle === "text"
      ? {
          title: textStoryTitle,
          summary: textStorySummary,
          genres: textSelectedGenres,
          styles: textSelectedStyles,
          status: textStoryStatus,
          isPublish: textIsPublish,
        }
      : {
          title: imageStoryTitle,
          summary: imageStorySummary,
          genres: imageSelectedGenres,
          styles: imageSelectedStyles,
          status: imageStoryStatus,
          isPublish: imageIsPublish,
        }

  const handlePublish = async () => {
    const v = getCurrentFormValues()

    if (!v.title.trim())
      return toast({ title: "Lỗi", description: "Vui lòng nhập tên truyện.", variant: "destructive" })
    if (!v.summary?.trim())
      return toast({ title: "Lỗi", description: "Vui lòng nhập mô tả.", variant: "destructive" })
    if (!v.genres.length)
      return toast({ title: "Lỗi", description: "Chọn ít nhất 1 thể loại.", variant: "destructive" })
    if (!coverFile)
      return toast({ title: "Lỗi", description: "Vui lòng chọn ảnh bìa cho truyện.", variant: "destructive" })

    const tokenPayload = decodeToken()
    const authorId = tokenPayload?.user_id
    if (!authorId) {
      return toast({ title: "Thiếu đăng nhập", description: "Vui lòng đăng nhập lại.", variant: "destructive" })
    }

    const fd = new FormData()
    fd.append('title', v.title)
    fd.append('summary', v.summary)
    ;(v.genres || []).forEach((gid: string) => fd.append('genres', gid))
    ;(v.styles || []).forEach((sid: string) => fd.append('styles', sid))
    fd.append('status', (v.status || '').toLowerCase())
    fd.append('isPublish', String(Boolean(v.isPublish)))
    fd.append('isDraft', String(false))
    fd.append('coverImage', coverFile)

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/manga/${authorId}`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast({ title: "Tạo truyện thành công!", description:"Truyện đã được tạo thành công", variant: "success" })
      router.push("/author/dashboard")
    } catch {
      toast({
        title: "Không tạo được truyện",
        description: "Vui lòng kiểm tra lại dữ liệu/đăng nhập.",
        variant: "destructive",
      })
    }
  }

  const getCurrentStoryChapters = () => {
    if (!currentStoryId) return []
    return chapters.filter((chapter) => chapter.storyId === currentStoryId && chapter.storyStyle === storyStyle)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Tạo truyện mới</h1>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-center">
            <Tabs value={storyStyle} onValueChange={(value) => setStoryStyle(value as "text" | "image")}>
              <TabsList className={`grid w-full max-w-md ${isTextStyleAvailable && isImageStyleAvailable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {isTextStyleAvailable && (
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Truyện Chữ
                  </TabsTrigger>
                )}
                {isImageStyleAvailable && (
                  <TabsTrigger value="image" className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Truyện Tranh
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Story Form */}
            {((storyStyle === "text" && isTextStyleAvailable) || (storyStyle === "image" && isImageStyleAvailable)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {storyStyle === "text" ? <BookOpen className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  {storyStyle === "text" ? "Truyện Chữ" : "Truyện Tranh"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title + Description + Cover */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left side */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="story-title">Tên truyện *</Label>
                      <Input
                        id="story-title"
                        placeholder="Nhập tên truyện"
                        value={storyStyle === "text" ? textStoryTitle : imageStoryTitle}
                        onChange={(e) =>
                          storyStyle === "text" ? setTextStoryTitle(e.target.value) : setImageStoryTitle(e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="story-description">Mô tả truyện *</Label>
                      <Textarea
                        className="h-43"
                        id="story-description"
                        placeholder="Viết mô tả ngắn về truyện của bạn"
                        rows={6}
                        value={storyStyle === "text" ? textStorySummary : imageStorySummary}
                        onChange={(e) =>
                          storyStyle === "text"
                            ? setTextStorySummary(e.target.value)
                            : setImageStorySummary(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Right side - Cover Image */}
                  <div className="flex flex-col items-center -mt-6">
                    <Label>Ảnh bìa *</Label>
                    <div
                      className="w-50 h-70 border rounded-md flex items-center justify-center cursor-pointer relative group mt-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {coverPreview ? (
                        <img src={coverPreview} alt="cover preview" className="w-full h-full object-cover rounded-md" />
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
                        const file = e.target.files?.[0]
                        if (file) {
                          setCoverFile(file)
                          setCoverPreview(URL.createObjectURL(file))
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Genres */}
                <div className="space-y-2 ">
                  <Label>Thể loại *</Label>
                  <div className=" grid grid-cols-2 gap-3 mt-2"> 
                    {availableGenres.map((g) => {
                      const selected = storyStyle === "text" ? textSelectedGenres : imageSelectedGenres
                      const checked = selected.includes(g._id)
                      return (
                        <div key={g._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`genre-${g._id}`}
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = c ? [...selected, g._id] : selected.filter((x) => x !== g._id)
                              storyStyle === "text" ? setTextSelectedGenres(next) : setImageSelectedGenres(next)
                            }}
                          />
                          <Label htmlFor={`genre-${g._id}`} className="text-sm">
                            {g.name}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="story-status">Trạng thái</Label>
                  <Select
                    value={storyStyle === "text" ? textStoryStatus : imageStoryStatus}
                    onValueChange={(v) => (storyStyle === "text" ? setTextStoryStatus(v) : setImageStoryStatus(v))}
                  >
                    <SelectTrigger id="story-status">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((s: string | { value: string; label: string }) => {
                        const value = (typeof s === "string" ? s : s.value).toLowerCase()
                        const label = typeof s === "string" ? s : s.label
                        return (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Public */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-public"
                    checked={storyStyle === "text" ? textIsPublish : imageIsPublish}
                    onCheckedChange={(v) => (storyStyle === "text" ? setTextIsPublish(!!v) : setImageIsPublish(!!v))}
                  />
                  <Label htmlFor="is-public">Công khai</Label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button onClick={handlePublish} className="flex-1" variant="secondary">
                    <Publish className="w-4 h-4 mr-2" />
                    Xuất bản
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => router.push("/author/dashboard")}>
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}
            
            {/* Thông báo khi không có style nào khả dụng */}
            {!isTextStyleAvailable && !isImageStyleAvailable && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Hiện tại không có loại truyện nào khả dụng để tạo.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

