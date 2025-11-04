"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, CheckCircle2, Eye, FileText, Clock, CheckCircle, Pause } from "lucide-react"
import axios from "axios"
import { useToast } from "@/hooks/use-toast"

interface AuthorStats {
  totalStories: number
  publishedStories: number
  totalViews: number
  totalChapters: number
  avgViewsPerStory: number
  statusBreakdown: {
    ongoing: number
    completed: number
    hiatus: number
  }
}

export default function AuthorStatisticsPage() {
  const [stats, setStats] = useState<AuthorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  const decodeToken = (): any | null => {
    const raw = Cookies.get("user_normal_info")
    if (raw) {
      try {
        return JSON.parse(decodeURIComponent(raw))
      } catch (e) {
        console.error("Invalid cookie data")
        return null
      }
    }
    return null
  }

  useEffect(() => {
    const fetchStats = async () => {
      const payload = decodeToken()
      if (!payload) {
        router.push("/login")
        return
      }

      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/manga/author/${payload.user_id}/stats`,
          { withCredentials: true },
        )
        setStats(data)
      } catch (err: any) {
        console.error("Lỗi khi fetch stats:", err)
        toast({
          title: "Lỗi",
          description: "Không thể tải thống kê. Vui lòng thử lại.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router, toast])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Thống kê</h1>
          <p className="text-muted-foreground text-base">Theo dõi hiệu suất của tác phẩm của bạn</p>
          <div className="mt-8 flex justify-end">
            <Button variant="outline" onClick={() => router.push("/author/dashboard")}>
              Quay lại Dashboard
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-3 border-muted-foreground border-t-foreground rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Tổng Truyện</CardTitle>
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalStories}</div>
                  <p className="text-xs text-muted-foreground mt-2">Tổng số truyện đã tạo</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Đã Publish</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.publishedStories}</div>
                  <p className="text-xs text-muted-foreground mt-2">Truyện đã xuất bản</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Tổng Lượt Xem</CardTitle>
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-2">Tất cả truyện</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Tổng Chapters</CardTitle>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalChapters}</div>
                  <p className="text-xs text-muted-foreground mt-2">Đã publish</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Đang Cập Nhật</CardTitle>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.statusBreakdown.ongoing}</div>
                  <p className="text-xs text-muted-foreground mt-2">Truyện ongoing</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Hoàn Thành</CardTitle>
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.statusBreakdown.completed}</div>
                  <p className="text-xs text-muted-foreground mt-2">Truyện hoàn thành</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium">Tạm Ngưng</CardTitle>
                  <Pause className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.statusBreakdown.hiatus}</div>
                  <p className="text-xs text-muted-foreground mt-2">Truyện hiatus</p>
                </CardContent>
              </Card>
            </div>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">Trung bình lượt xem</CardTitle>
                <CardDescription>Số lượt xem trung bình mỗi truyện đã publish</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold">{stats.avgViewsPerStory.toLocaleString()}</div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center py-24">
            <p className="text-muted-foreground text-lg">Không có dữ liệu thống kê</p>
          </div>
        )}
      </main>
    </div>
  )
}
