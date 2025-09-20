

"use client"
import { useEffect, useMemo, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
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
import Cookies from "js-cookie"
import { availableStatuses } from "@/lib/data"

export default function EditStoryPage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const { toast } = useToast()

    const [storyType, setStoryType] = useState<"text" | "image">("text")
    const [availableGenres, setAvailableGenres] = useState<Array<{ _id: string; name: string }>>([])
    const [currentStory, setCurrentStory] = useState<any>(null)

    // form states
    const [textStoryTitle, setTextStoryTitle] = useState("")
    const [textStorySummary, setTextStorySummary] = useState("")
    const [textSelectedGenres, setTextSelectedGenres] = useState<string[]>([])
    const [textStoryStatus, setTextStoryStatus] = useState("ongoing")
    const [textIsPublish, setTextIsPublish] = useState(true)

    const [imageStoryTitle, setImageStoryTitle] = useState("")
    const [imageStorySummary, setImageStorySummary] = useState("")
    const [imageSelectedGenres, setImageSelectedGenres] = useState<string[]>([])
    const [imageStoryStatus, setImageStoryStatus] = useState("ongoing")
    const [imageIsPublish, setImageIsPublish] = useState(true)

    // Cover image states
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
            ; (async () => {
                try {

                    const gr = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/genre`, { withCredentials: true })
                    if (mounted) setAvailableGenres(Array.isArray(gr.data) ? gr.data : [])
                } catch {
                    if (mounted) setAvailableGenres([])
                }


                const payload = decodeToken()
                const authorId = payload?.user_id
                if (!authorId) return
                try {
                    const { data } = await axios.get(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${authorId}`,
                        { withCredentials: true }
                    )
                    const allStories = Array.isArray(data) ? data : [...(data?.published || []), ...(data?.drafts || [])]
                    const current = allStories.find((s: Record<string, unknown>) => s?._id === params.id)
                    if (!current) return
                    setCurrentStory(current)
                    
                    type Genre = string | { _id: string }
                    const genresIds: string[] = (current.genres || []).map((g: Genre) =>
                        typeof g === "string" ? g : g._id
                    )
                    if (current.type === "text") {
                        setStoryType("text")
                        setTextStoryTitle(current.title || "")
                        setTextStorySummary(current.summary || "")
                        setTextSelectedGenres(genresIds)
                        setTextStoryStatus((current.status || "ongoing").toLowerCase())
                        setTextIsPublish(!!current.isPublish)
                    } else {
                        setStoryType("image")
                        setImageStoryTitle(current.title || "")
                        setImageStorySummary(current.summary || "")
                        setImageSelectedGenres(genresIds)
                        setImageStoryStatus((current.status || "ongoing").toLowerCase())
                        setImageIsPublish(!!current.isPublish)
                    }
                    
                    // Set cover image preview if exists
                    if (current.coverImage) {
                        setCoverPreview(`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${current.coverImage}`)
                    }
                } catch { }
            })()
        return () => { mounted = false }
    }, [params.id])

    const getCurrentFormValues = useMemo(() => () => {
        return storyType === "text"
            ? { title: textStoryTitle, summary: textStorySummary, genres: textSelectedGenres, status: textStoryStatus, isPublish: textIsPublish }
            : { title: imageStoryTitle, summary: imageStorySummary, genres: imageSelectedGenres, status: imageStoryStatus, isPublish: imageIsPublish }
    }, [storyType, textStoryTitle, textStorySummary, textSelectedGenres, textStoryStatus, textIsPublish, imageStoryTitle, imageStorySummary, imageSelectedGenres, imageStoryStatus, imageIsPublish])

    const handleUpdate = async () => {
        const v = getCurrentFormValues()
        if (!v.title?.trim()) return toast({ title: "Lỗi", description: "Vui lòng nhập tên truyện.", variant: "destructive" })
        if (!v.summary?.trim()) return toast({ title: "Lỗi", description: "Vui lòng nhập mô tả.", variant: "destructive" })
        if (!v.genres?.length) return toast({ title: "Lỗi", description: "Chọn ít nhất 1 thể loại.", variant: "destructive" })
        if (!coverFile && !currentStory?.coverImage) return toast({ title: "Lỗi", description: "Vui lòng chọn ảnh bìa cho truyện.", variant: "destructive" })

        const formData = new FormData()
        formData.append('title', v.title)
        formData.append('summary', v.summary)
        formData.append('status', (v.status || "").toLowerCase())
        formData.append('isPublish', String(Boolean(v.isPublish)))
        formData.append('type', storyType)
        
        // Add genres
        v.genres.forEach((genreId: string) => {
            formData.append('genres', genreId)
        })
        
        // Add cover image (new file or keep existing)
        if (coverFile) {
            formData.append('coverImage', coverFile)
        } else if (currentStory?.coverImage) {
            // Keep existing cover image
            formData.append('keepExistingCover', 'true')
        }
        
        try {
            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/manga/${params.id}`, formData, { 
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            toast({ title: "Cập nhật thành công!", description:"Truyện đã cập nhật thành công", variant: "success" })
            router.push("/author/dashboard")
        } catch {
            toast({ title: "Không cập nhật được", description: "Vui lòng kiểm tra lại dữ liệu/đăng nhập.", variant: "destructive" })
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8 pt-20">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Chỉnh sửa truyện</h1>
                </div>

                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="flex justify-center">
                        <Tabs value={storyType} onValueChange={(value) => setStoryType(value as "text" | "image")}>
                            <TabsList className="grid w-full grid-cols-2 max-w-md">
                                <TabsTrigger value="text" className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    Truyện Chữ
                                </TabsTrigger>
                                <TabsTrigger value="image" className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    Truyện Tranh
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {storyType === "text" ? <BookOpen className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                    {storyType === "text" ? "Truyện Chữ" : "Truyện Tranh"}
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
                                                value={storyType === "text" ? textStoryTitle : imageStoryTitle}
                                                onChange={(e) => storyType === "text" ? setTextStoryTitle(e.target.value) : setImageStoryTitle(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="story-description">Mô tả truyện *</Label>
                                            <Textarea
                                                className="h-43"
                                                id="story-description"
                                                placeholder="Viết mô tả ngắn về truyện của bạn"
                                                rows={6}
                                                value={storyType === "text" ? textStorySummary : imageStorySummary}
                                                onChange={(e) => storyType === "text" ? setTextStorySummary(e.target.value) : setImageStorySummary(e.target.value)}
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

                                <div className="space-y-2">
                                    <Label>Thể loại *</Label>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        {availableGenres.map((g) => {
                                            const selected = storyType === "text" ? textSelectedGenres : imageSelectedGenres
                                            const checked = selected.includes(g._id)
                                            return (
                                                <div key={g._id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`genre-${g._id}`}
                                                        checked={checked}
                                                        onCheckedChange={(c) => {
                                                            const next = c ? [...selected, g._id] : selected.filter((x) => x !== g._id)
                                                            if (storyType === "text") {
                                                                setTextSelectedGenres(next)
                                                            } else {
                                                                setImageSelectedGenres(next)
                                                            }

                                                        }}
                                                    />
                                                    <Label htmlFor={`genre-${g._id}`} className="text-sm">{g.name}</Label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="story-status">Trạng thái</Label>
                                    <Select value={storyType === "text" ? textStoryStatus : imageStoryStatus}
                                        onValueChange={(v) => (storyType === "text" ? setTextStoryStatus(v) : setImageStoryStatus(v))}>
                                        <SelectTrigger id="story-status">
                                            <SelectValue placeholder="Chọn trạng thái" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableStatuses.map((s: string | { value: string; label: string }) => {
                                                const value = (typeof s === "string" ? s : s.value).toLowerCase()
                                                const label = typeof s === "string" ? s : s.label
                                                return <SelectItem key={value} value={value}>{label}</SelectItem>
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
                                    <Label htmlFor="is-public">Công khai</Label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button onClick={handleUpdate} className="flex-1" variant="secondary">
                                        <Publish className="w-4 h-4 mr-2" />
                                        Cập nhật
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => router.push("/author/dashboard")}>
                                        Hủy
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}



