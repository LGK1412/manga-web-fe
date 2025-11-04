"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { AlertTriangle, Eye, CheckCircle, XCircle, Clock, Search, BookOpen, FileText, MessageSquare, } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,} from "@/components/ui/dialog"
import AdminLayout from "../adminLayout/page"
import ReportModal from "@/components/ui/report-modal"

interface Report {
  _id: string
  reportCode?: string
  reporter_id?: {
    username: string
    email: string
    role?: string
  }
  target_type: string
  target_id?: {
    _id?: string
    title?: string
    content?: string
    authorId?: {
      username?: string
      email?: string
    }
    user?: {
      username?: string
      email?: string
    }
  }

  target_detail?: {
    title?: string
    target_human?: {
      username?: string
      email?: string
    }
  }

  reason: string
  description?: string
  status: string
  createdAt?: string
  updatedAt?: string

  // 🟢 Thêm 2 dòng này để TypeScript nhận diện
  resolver_id?: string
  resolution_note?: string
}



export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const reportsPerPage = 10

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const res = await axios.get("http://localhost:3333/api/reports")
        setReports(res.data)
      } catch (err) {
        console.error("❌ Failed to load reports:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus?: string, note?: string) => {
  try {
    setLoading(true)
    const payload: any = {}
    if (newStatus) payload.status = newStatus
    if (note !== undefined) payload.resolution_note = note

    await axios.put(`http://localhost:3333/api/reports/${id}`, payload)

    setReports((prev) =>
      prev.map((r) =>
        r._id === id
          ? { ...r, status: newStatus ?? r.status, resolution_note: note ?? r.resolution_note }
          : r
      )
    )
    setIsModalOpen(false)
  } catch (err) {
    console.error("❌ Failed to update status:", err)
    alert("Update failed")
  } finally {
    setLoading(false)
  }
}


  // ✅ Filter logic
  const filteredReports = reports.filter((r) => {
    const term = searchTerm.toLowerCase()
    const matchSearch =
      r.reason?.toLowerCase().includes(term) ||
      r.reporter_id?.username?.toLowerCase().includes(term) ||
      r.reporter_id?.email?.toLowerCase().includes(term) ||
      r.target_id?.title?.toLowerCase().includes(term) ||
      r.target_id?.content?.toLowerCase().includes(term)

    const matchStatus = statusFilter === "all" || r.status === statusFilter
    const matchType = typeFilter === "all" || r.target_type === typeFilter

    return matchSearch && matchStatus && matchType
  })

  const indexOfLast = currentPage * reportsPerPage
  const indexOfFirst = indexOfLast - reportsPerPage
  const currentReports = filteredReports.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage)

  const handlePageChange = (page: number) => setCurrentPage(page)

  const statusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-yellow-100 text-yellow-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const targetTypeBadge = (type: string) => {
    switch (type) {
      case "Manga":
        return (
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Manga
          </Badge>
        )
      case "Chapter":
        return (
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Chapter
          </Badge>
        )
      case "Comment":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Comment
          </Badge>
        )
      default:
        return <Badge className="bg-gray-100 text-gray-700">{type}</Badge>
    }
  }

  const openModal = (report: Report) => {
    setSelectedReport(report)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReport(null)
  }

  const totalReports = reports.length
  const newReports = reports.filter((r) => r.status === "new").length
  const unresolvedReports = reports.filter((r) => r.status === "in-progress").length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-500">Admin / Reports</p>
          <h1 className="text-3xl font-bold text-gray-900">Reported Stories Management</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Reports</CardTitle>
              <AlertTriangle className="h-5 w-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalReports}</div>
              <p className="text-xs text-gray-600 mt-1">+12 from last month</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">New Reports</CardTitle>
              <Clock className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{newReports}</div>
              <p className="text-xs text-gray-600 mt-1">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Unresolved Reports</CardTitle>
              <Eye className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{unresolvedReports}</div>
              <p className="text-xs text-gray-600 mt-1">Currently under review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Reports List</CardTitle>
            <CardDescription>Manage and resolve story violation reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user, reason, or content..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Manga">Manga</SelectItem>
                    <SelectItem value="Chapter">Chapter</SelectItem>
                    <SelectItem value="Comment">Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Code</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reported Against</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Title / Content</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : currentReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">
                        No reports found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentReports.map((r) => {
                      const reportedAgainst =
                        r.target_detail?.target_human?.username ||
                        r.target_id?.authorId?.username ||
                        r.target_id?.user?.username ||
                        "—"

                      const reportedAgainstEmail =
                        r.target_detail?.target_human?.email ||
                        r.target_id?.authorId?.email ||
                        r.target_id?.user?.email ||
                        null

                      const targetTitle =
                        r.target_detail?.title ||
                        r.target_id?.title ||
                        r.target_id?.content?.slice(0, 50) ||
                        "—"

                      return (
                        <TableRow key={r._id}>
                          <TableCell>{r.reportCode}</TableCell>

                          {/* Reporter */}
                          <TableCell>
                            <div>
                              <div className="font-semibold">{r.reporter_id?.username}</div>
                              <div className="text-xs text-gray-500">{r.reporter_id?.email}</div>
                            </div>
                          </TableCell>

                          {/* ✅ Reported Against */}
                          <TableCell>
                            <div>
                              <div className="font-semibold">{reportedAgainst}</div>
                              {reportedAgainstEmail && (
                                <div className="text-xs text-gray-500">{reportedAgainstEmail}</div>
                              )}
                            </div>
                          </TableCell>

                          {/* Target Type */}
                          <TableCell>{targetTypeBadge(r.target_type)}</TableCell>

                          {/* Title / Content */}
                          <TableCell>{targetTitle}</TableCell>

                          {/* Reason */}
                          <TableCell>{r.reason}</TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge className={statusColor(r.status)}>{r.status}</Badge>
                          </TableCell>

                          {/* Created Date */}
                          <TableCell>
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString("en-GB")
                              : "—"}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openModal(r)}
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}

                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-4 space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Modal */}
        <ReportModal 
          open={isModalOpen}
          report={selectedReport}
          loading={loading}
          onClose={closeModal}
          onUpdateStatus={handleUpdateStatus}
          statusColor={statusColor}
        />
      </div>
    </AdminLayout>
  )
}
