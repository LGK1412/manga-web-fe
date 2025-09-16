"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen,ImageIcon, Edit, Upload, Trash } from "lucide-react"
import Cookies from "js-cookie"
import { Navbar } from "@/components/navbar"
import axios from "axios"

interface Manga {
    _id: string
    title: string
    description: string
    genres: string[]
    status: "ongoing" | "completed" | "hiatus"
    type: "text" | "image"
    isDraft: boolean
    isPublic: boolean
    isDeleted?: boolean
    createdAt: string
    updatedAt: string
    viewCount: number
}

export default function AuthorDashboard() {
    const [textStories, setTextStories] = useState<Manga[]>([])
    const [imageStories, setImageStories] = useState<Manga[]>([])
    const [user, setUser] = useState()

    const router = useRouter()

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

    useEffect(() => {
        const fetchData = async () => {
            const payload = decodeToken()
            if (!payload) return
            try {
                const { data } = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${payload.user_id}`,
                    { withCredentials: true }
                )

                const allStories: Manga[] = Array.isArray(data)
                    ? data
                    : [...(data?.published || []), ...(data?.drafts || [])]

                setTextStories(allStories.filter((s) => s.type === "text"))
                setImageStories(allStories.filter((s) => s.type === "image"))
            } catch (err) {
                console.error("Lỗi khi fetch data:", err)
            }
        }

        fetchData()
    }, [])

    const handleToggleDelete = async (id: string, currentDeleted: boolean) => {
        const ok = window.confirm(currentDeleted ? "Hoàn tác xoá truyện này?" : "Bạn có chắc muốn xoá (mềm) truyện này?")
        if (!ok) return
        try {
            const { data } = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/manga/${id}/toggle-delete`,
                {},
                { withCredentials: true }
            )
            setTextStories((prev) => prev.map((s) => (s._id === id ? { ...s, isDeleted: data?.isDeleted } : s)))
            setImageStories((prev) => prev.map((s) => (s._id === id ? { ...s, isDeleted: data?.isDeleted } : s)))
        } catch (err) {
            console.error("Cập nhật xoá mềm thất bại", err)
        }
    }

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
                                        <Badge variant="destructive" className="text-xs">Draft</Badge>
                                    ) : (
                                        <Badge variant="default" className="text-xs">Published</Badge>
                                    )}
                                    {story.isDeleted ? (
                                        <Badge variant="secondary" className="text-xs">Đã xoá</Badge>
                                    ) : null}
                                </CardTitle>
                                <CardDescription>{story.description}</CardDescription>
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
                                <div className="flex items-center gap-2">
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
                                    <div className="ml-auto">
                                        <Button
                                            variant={story.isDeleted ? "outline" : "destructive"}
                                            size="sm"
                                            onClick={() => handleToggleDelete(story._id, !!story.isDeleted)}
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

                {/* Truyện tranh */}
                <h2 className="text-lg font-semibold mt-10 mb-4">Truyện tranh</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {imageStories.map((story) => (
                        <Card key={story._id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5" />
                                    {story.title}
                                    {story.isDraft ? (
                                        <Badge variant="destructive" className="text-xs">Draft</Badge>
                                    ) : (
                                        <Badge variant="default" className="text-xs">Published</Badge>
                                    )}
                                    {story.isDeleted ? (
                                        <Badge variant="secondary" className="text-xs">Đã xoá</Badge>
                                    ) : null}
                                </CardTitle>
                                <CardDescription>{story.description}</CardDescription>
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
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-2">
                                        <Link href={`/author/story/edit/${story._id}`}>
                                            <Button variant="outline" size="sm">
                                                <Edit className="w-4 h-4 mr-1" />
                                                Sửa
                                            </Button>
                                        </Link>
                                        <Link href={`/author/chapter/${story._id}`}>
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
                                            onClick={() => handleToggleDelete(story._id, !!story.isDeleted)}
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
                {imageStories.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        Không có truyện tranh nào
                    </div>
                )}
            </main>
        </div>
    )
}
