"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import AdminLayout from "../adminLayout/page"
import { CommentFilters, type FilterState } from "@/components/comment/comment-filters"
import { CommentTable, type Comment } from "@/components/comment/comment-table"
import { CommentModal } from "@/components/comment/comment-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 10

// [31/10/2025] Hằng số “All …” dùng chuỗi rỗng trong state
const ALL = {
  MANGA: "",
  CHAPTER: "",
  STATUS: "",
} as const

type Me = {
  userId?: string
  email?: string
  role?: string
}

export default function CommentsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL

  const [me, setMe] = useState<Me | null>(null)
  const roleNormalized = useMemo(() => String(me?.role || "").toLowerCase(), [me?.role])

  const [comments, setComments] = useState<Comment[]>([])
  const [mangas, setMangas] = useState<{ id: string; title: string }[]>([])
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([])
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [filters, setFilters] = useState<FilterState>({
    manga: ALL.MANGA,
    chapter: ALL.CHAPTER,
    user: "",
    status: ALL.STATUS,
    search: "",
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ✅ fetch me (role) - optional UI info
  useEffect(() => {
    if (!API) return
    axios
      .get(`${API}/api/auth/me`, { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch(() => setMe(null))
  }, [API])

  // ✅ Load comments + manga (BE: /api/comment/all + /api/manga)
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      if (!API) {
        setError("Thiếu biến môi trường NEXT_PUBLIC_API_URL")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const [commentRes, mangaRes] = await Promise.all([
          axios.get(`${API}/api/comment/all`, {
            withCredentials: true,
            signal: controller.signal,
          }),
          axios.get(`${API}/api/manga`, {
            withCredentials: true,
            signal: controller.signal,
          }),
        ])

        const mappedComments: Comment[] = (commentRes.data || []).map((c: any) => ({
          id: c._id,
          commentId: c._id?.slice(-6)?.toUpperCase?.() ?? "—",
          username: c.user_id?.username || "Unknown",
          storyTitle: c.chapter_id?.manga_id?.title || "Unknown",
          storyId: c.chapter_id?.manga_id?._id || "",
          chapter: c.chapter_id?.title || "—",
          chapterId: c.chapter_id?._id || "",
          content: c.content ?? "",
          date: (() => {
            const d = new Date(c.createdAt)
            return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", { hour12: false })
          })(),
          status: c.is_delete ? "hidden" : "visible",
        }))

        const mappedManga = (mangaRes.data || []).map((m: any) => ({
          id: m._id,
          title: m.title,
        }))

        setComments(mappedComments)
        setMangas(mappedManga)
      } catch (err: any) {
        if (axios.isCancel(err)) return
        console.error("❌ Lỗi tải dữ liệu:", err.response?.status, err.response?.data || err.message)
        setError(`Lỗi tải dữ liệu: ${err.response?.status || ""} ${err.message}`)
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [API])

  // ✅ When select Manga -> load chapters by manga (BE: /api/chapter/by-manga/:id)
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      if (!API) return

      if (!filters.manga || filters.manga === ALL.MANGA) {
        setChapters([])
        return
      }

      try {
        const res = await axios.get(`${API}/api/chapter/by-manga/${filters.manga}`, {
          withCredentials: true,
          signal: controller.signal,
        })

        const list = (res.data || []).map((ch: any) => ({
          id: ch._id?.toString?.() ?? ch._id,
          title: ch.title,
        }))
        setChapters(list)
      } catch (err) {
        console.error("❌ Lỗi tải chapter theo manga:", err)
        setChapters([])
      }
    })()

    return () => controller.abort()
  }, [API, filters.manga])

  // ✅ Client-side filter
  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      if (filters.manga !== ALL.MANGA && c.storyId !== filters.manga) return false
      if (filters.chapter !== ALL.CHAPTER && c.chapterId !== filters.chapter) return false
      if (filters.status !== ALL.STATUS && c.status !== filters.status) return false
      if (filters.user && !c.username.toLowerCase().includes(filters.user.toLowerCase())) return false

      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!c.content.toLowerCase().includes(q) && !c.username.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [comments, filters])

  const totalPages = Math.max(1, Math.ceil(filteredComments.length / ITEMS_PER_PAGE))
  const paginatedComments = filteredComments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const handleFilter = (newFilters: FilterState) => {
    // ✅ nếu đổi manga về ALL thì reset chapter về ALL luôn (tránh filter bị “kẹt”)
    if (!newFilters.manga || newFilters.manga === ALL.MANGA) {
      newFilters = { ...newFilters, chapter: ALL.CHAPTER }
    }
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleViewDetails = (comment: Comment) => {
    setSelectedComment(comment)
    setModalOpen(true)
  }

  // ✅ Toggle comment visibility (BE: /api/comment/toggle/:id) -> BE tự ghi audit log
  const handleToggleVisibility = async (id: string, currentStatus: string) => {
    try {
      if (!API) return
      setActionLoading(id)

      await axios.patch(`${API}/api/comment/toggle/${id}`, {}, { withCredentials: true })

      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: currentStatus === "visible" ? "hidden" : "visible" } : c,
        ),
      )

      toast.success("Cập nhật trạng thái bình luận thành công")
    } catch (err) {
      console.error("Lỗi toggle comment:", err)
      toast.error("Không thể cập nhật trạng thái bình luận")
    } finally {
      setActionLoading(null)
    }
  }

  // BE chưa có DELETE comment
  const handleDelete = async (_id: string) => {
    toast.error("Back-end chưa có API xóa comment. Vui lòng bổ sung nếu cần.")
  }

  const visibleCount = comments.filter((c) => c.status === "visible").length
  const hiddenCount = comments.filter((c) => c.status === "hidden").length

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-500">⏳ Đang tải dữ liệu...</div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-red-500">❌ {error}</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Comment Management</h1>
            <p className="text-gray-600">Manage and moderate all comments on your manga/novel platform.</p>
            {me?.role && (
              <p className="text-xs text-gray-500 mt-1">
                Logged in as <b>{roleNormalized}</b>
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{comments.length}</div>
              <p className="text-xs text-gray-500">in the system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visible Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{visibleCount}</div>
              <p className="text-xs text-gray-500">currently visible</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hidden Comments</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{hiddenCount}</div>
              <p className="text-xs text-gray-500">pending review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <CommentFilters onFilter={handleFilter} mangas={mangas} chapters={chapters} />

        {/* Table */}
        <CommentTable
          comments={paginatedComments}
          onViewDetails={handleViewDetails}
          onToggleVisibility={handleToggleVisibility}
          onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          actionLoading={actionLoading}
        />

        {/* Modal */}
        <CommentModal
          open={modalOpen}
          comment={selectedComment}
          onClose={() => setModalOpen(false)}
          onToggleVisibility={handleToggleVisibility}
          onDelete={handleDelete}
        />
      </div>
    </AdminLayout>
  )
}
