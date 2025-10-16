"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import AdminLayout from "../adminLayout/page"

interface Report {
  _id: string
  reportCode?: string
  reporter_id?: { username: string; email: string }
  target_type: string
  target_id?: {
    title?: string
    content?: string
    authorId?: string
    summary?: string
    coverImage?: string
  }
  reason: string
  description?: string
  status: string
  createdAt: string
  target_detail?: {
    title?: string
    content?: string
    author?: {
      authorId?: string
      username: string
      email: string
    }
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  /** ✅ Fetch reports from BE */
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axios.get("http://localhost:3333/api/reports")
        setReports(res.data)
      } catch (err) {
        console.error("❌ Failed to load reports:", err)
      }
    }
    fetchReports()
  }, [])

  /** ✅ Filter reports */
  const filteredReports = reports.filter((r) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      r.target_id?.title?.toLowerCase().includes(searchLower) ||
      r.target_id?.content?.toLowerCase().includes(searchLower) ||
      r.reporter_id?.email?.toLowerCase().includes(searchLower)
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  /** ✅ Update report status (PUT /api/reports/:id) */
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true)
      await axios.put(`http://localhost:3333/api/reports/${id}`, { status: newStatus })
      setReports((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r)),
      )
      setIsModalOpen(false)
    } catch (err) {
      console.error("❌ Failed to update status:", err)
      alert("Update failed. See console for details.")
    } finally {
      setLoading(false)
    }
  }

  /** ✅ Status badge */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Clock className="h-3 w-3 mr-1" /> New
          </span>
        )
      case "in-progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Eye className="h-3 w-3 mr-1" /> In Progress
          </span>
        )
      case "resolved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" /> Resolved
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </span>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        {/* Header */}
        <div className="mb-2">
          <p className="text-sm text-gray-500">Admin / Reports</p>
        </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Reported Stories Management</h1>

          {/* Search + Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by story or reporter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-white"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Reports</CardTitle>
              <AlertTriangle className="h-5 w-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{reports.length}</div>
              <p className="text-xs text-gray-600 mt-1">+12 from last month</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">New Reports</CardTitle>
              <Clock className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {reports.filter((r) => r.status === "new").length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Unresolved Reports</CardTitle>
              <Eye className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {reports.filter((r) => r.status === "in-progress").length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Currently under review</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Reports List</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Manage and resolve story violation reports
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Code</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Story/Comment</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report._id} className="hover:bg-gray-50">
                    <TableCell>{report.reportCode}</TableCell>
                    <TableCell>{report.reporter_id?.username}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {report.target_type === "Manga" && report.target_detail?.title ? (
                        <>
                          <p>{report.target_detail.title}</p>
                          <p className="text-sm text-gray-600">
                            Author: {report.target_detail.author?.username} ({report.target_detail.author?.email})
                          </p>
                        </>
                      ) : report.target_type === "Chapter" && report.target_detail?.title ? (
                        <>
                          <p>{report.target_detail.title}</p>
                          <p className="text-sm text-gray-600">
                            Author: {report.target_detail.author?.username} ({report.target_detail.author?.email})
                          </p>
                        </>
                      ) : report.target_type === "Comment" && report.target_detail?.content ? (
                        <>
                          <p className="text-sm text-gray-600">
                            Comment by: {report.target_detail.author?.username} ({report.target_detail.author?.email})
                          </p>
                          <p>{report.target_detail.content}</p>
                        </>
                      ) : "N/A"}
                    </TableCell>
                    <TableCell>{report.reason}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report)
                            setIsModalOpen(true)
                          }}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleUpdateStatus(report._id, "resolved")}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleUpdateStatus(report._id, "rejected")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Report Details
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Review and take action on this report
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Report Code</p>
                    <p className="text-sm text-gray-900">{selectedReport.reportCode}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Status</p>
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Reporter</p>
                    <p className="text-sm text-gray-900">
                      {selectedReport.reporter_id?.username} ({selectedReport.reporter_id?.email})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Type</p>
                    <p className="text-sm text-gray-900">{selectedReport.target_type}</p>
                  </div>
                </div>

                {/* Story Title and Author */}
                {selectedReport.target_type === "Manga" && selectedReport.target_detail?.title && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Story Title</p>
                    <p className="text-sm text-gray-900">{selectedReport.target_detail.title}</p>
                    <p className="text-sm font-semibold text-gray-700">Author</p>
                    <p className="text-sm text-gray-900">
                      {selectedReport.target_detail.author?.username} ({selectedReport.target_detail.author?.email})
                    </p>
                  </div>
                )}

                {selectedReport.target_type === "Chapter" && selectedReport.target_detail?.title && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Chapter Title</p>
                    <p className="text-sm text-gray-900">{selectedReport.target_detail.title}</p>
                    <p className="text-sm font-semibold text-gray-700">Author</p>
                    <p className="text-sm text-gray-900">
                      {selectedReport.target_detail.author?.username} ({selectedReport.target_detail.author?.email})
                    </p>
                  </div>
                )}

                {selectedReport.target_type === "Comment" && selectedReport.target_detail?.content && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Comment by</p>
                    <p className="text-sm text-gray-900">
                      {selectedReport.target_detail.author?.username} ({selectedReport.target_detail.author?.email})
                    </p>
                    <p className="text-sm font-semibold text-gray-700">Comment</p>
                    <p className="text-sm text-gray-900">{selectedReport.target_detail.content}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-gray-700">Reason</p>
                  <p className="text-sm text-gray-900">{selectedReport.reason}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700">Description</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedReport.description ?? "No description"}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="outline"
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                onClick={() =>
                  selectedReport && handleUpdateStatus(selectedReport._id, "in-progress")
                }
                disabled={loading}
              >
                {loading ? "Updating..." : "Mark In Progress"}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() =>
                  selectedReport && handleUpdateStatus(selectedReport._id, "resolved")
                }
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Resolve
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  selectedReport && handleUpdateStatus(selectedReport._id, "rejected")
                }
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}