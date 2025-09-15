"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, Edit, Upload } from "lucide-react"
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

                const allStories: Manga[] = [
                    ...(data.published || []),
                    ...(data.drafts || []),
                ]

                setTextStories(allStories.filter((s) => s.type === "text"))
                setImageStories(allStories.filter((s) => s.type === "image"))
            } catch (err) {
                console.error("Lỗi khi fetch data:", err)
            }
        }

        fetchData()
    }, [])

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
                                </CardTitle>
                                <CardDescription>{story.description}</CardDescription>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {story.genres.map((g) => (
                                        <Badge key={g} variant="secondary" className="text-xs">
                                            {g}
                                        </Badge>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-4">
                                    <Badge variant="secondary">{story.status}</Badge>
                                    <span className="text-sm text-gray-500">
                                        {new Date(story.createdAt).toLocaleDateString("vi-VN")}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/author/story/${story._id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="w-4 h-4 mr-1" />
                                            Sửa
                                        </Button>
                                    </Link>
                                    <Link href={`/author/chapter`}>
                                        <Button variant="outline" size="sm">
                                            <Upload className="w-4 h-4 mr-1" />
                                            Chapter
                                        </Button>
                                    </Link>
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
                                    <BookOpen className="w-5 h-5" />
                                    {story.title}
                                    {story.isDraft ? (
                                        <Badge variant="destructive" className="text-xs">Draft</Badge>
                                    ) : (
                                        <Badge variant="default" className="text-xs">Published</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>{story.description}</CardDescription>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {story.genres.map((g) => (
                                        <Badge key={g} variant="secondary" className="text-xs">
                                            {g}
                                        </Badge>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-4">
                                    <Badge variant="secondary">{story.status}</Badge>
                                    <span className="text-sm text-gray-500">
                                        {new Date(story.createdAt).toLocaleDateString("vi-VN")}
                                    </span>
                                </div>
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
