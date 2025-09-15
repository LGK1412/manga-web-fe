"use client"
import { useEffect, useMemo, useState } from "react"
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
import { BookOpen, ImageIcon, CopySlash as Publish } from "lucide-react"
import axios from "axios"
import Cookies from "js-cookie"
import { availableStatuses } from "@/lib/data"

export default function EditStoryPage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const { toast } = useToast()

    const [storyType, setStoryType] = useState<"text" | "image">("text")
    const [availableGenres, setAvailableGenres] = useState<Array<{ _id: string; name: string }>>([])

    // form states
    const [textStoryTitle, setTextStoryTitle] = useState("")
    const [textStoryDescription, setTextStoryDescription] = useState("")
    const [textSelectedGenres, setTextSelectedGenres] = useState<string[]>([])
    const [textStoryStatus, setTextStoryStatus] = useState("ongoing")
    const [textIsPublic, setTextIsPublic] = useState(true)

    const [imageStoryTitle, setImageStoryTitle] = useState("")
    const [imageStoryDescription, setImageStoryDescription] = useState("")
    const [imageSelectedGenres, setImageSelectedGenres] = useState<string[]>([])
    const [imageStoryStatus, setImageStoryStatus] = useState("ongoing")
    const [imageIsPublic, setImageIsPublic] = useState(true)

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
                    
                    type Genre = string | { _id: string }
                    const genresIds: string[] = (current.genres || []).map((g: Genre) =>
                        typeof g === "string" ? g : g._id
                    )
                    if (current.type === "text") {
                        setStoryType("text")
                        setTextStoryTitle(current.title || "")
                        setTextStoryDescription(current.description || "")
                        setTextSelectedGenres(genresIds)
                        setTextStoryStatus((current.status || "ongoing").toLowerCase())
                        setTextIsPublic(!!current.isPublic)
                    } else {
                        setStoryType("image")
                        setImageStoryTitle(current.title || "")
                        setImageStoryDescription(current.description || "")
                        setImageSelectedGenres(genresIds)
                        setImageStoryStatus((current.status || "ongoing").toLowerCase())
                        setImageIsPublic(!!current.isPublic)
                    }
                } catch { }
            })()
        return () => { mounted = false }
    }, [params.id])

    const getCurrentFormValues = useMemo(() => () => {
        return storyType === "text"
            ? { title: textStoryTitle, description: textStoryDescription, genres: textSelectedGenres, status: textStoryStatus, isPublic: textIsPublic }
            : { title: imageStoryTitle, description: imageStoryDescription, genres: imageSelectedGenres, status: imageStoryStatus, isPublic: imageIsPublic }
    }, [storyType, textStoryTitle, textStoryDescription, textSelectedGenres, textStoryStatus, textIsPublic, imageStoryTitle, imageStoryDescription, imageSelectedGenres, imageStoryStatus, imageIsPublic])

    const handleUpdate = async () => {
        const v = getCurrentFormValues()
        if (!v.title?.trim()) return toast({ title: "Lỗi", description: "Vui lòng nhập tên truyện.", variant: "destructive" })
        if (!v.description?.trim()) return toast({ title: "Lỗi", description: "Vui lòng nhập mô tả.", variant: "destructive" })
        if (!v.genres?.length) return toast({ title: "Lỗi", description: "Chọn ít nhất 1 thể loại.", variant: "destructive" })

        const payload = { ...v, status: (v.status || "").toLowerCase(), type: storyType }
        try {
            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/manga/${params.id}`, payload, { withCredentials: true })
            toast({ title: "Cập nhật thành công!" })
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

                <div className="space-y-6 max-w-3xl mx-auto">
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

                    <div className="max-w-3xl mx-auto">
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
                                        value={storyType === "text" ? textStoryTitle : imageStoryTitle}
                                        onChange={(e) => storyType === "text" ? setTextStoryTitle(e.target.value) : setImageStoryTitle(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="story-description">Mô tả truyện *</Label>
                                    <Textarea
                                        id="story-description"
                                        placeholder="Viết mô tả ngắn về truyện của bạn"
                                        rows={5}
                                        value={storyType === "text" ? textStoryDescription : imageStoryDescription}
                                        onChange={(e) => storyType === "text" ? setTextStoryDescription(e.target.value) : setImageStoryDescription(e.target.value)}
                                    />
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
                                        checked={storyType === "text" ? textIsPublic : imageIsPublic}
                                        onCheckedChange={(v) => (storyType === "text" ? setTextIsPublic(!!v) : setImageIsPublic(!!v))}
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


