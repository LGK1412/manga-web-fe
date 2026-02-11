"use client"

import type React from "react"
import { useState } from "react"
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  FileText,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Navbar } from "@/components/navbar"


type LicenseStatus = "pending" | "approved" | "rejected"

type License = {
  id: string
  mangaTitle: string
  author: string
  submittedDate: string
  status: LicenseStatus
  coverImage: string
  files: Array<{ id: string; name: string; type: "pdf" | "image" }>
  authorNote: string
  rejectionReason?: string
}

const mockLicenses: License[] = [
  {
    id: "LIC-001",
    mangaTitle: "The Celestial Atlas",
    author: "Sarah Chen",
    submittedDate: "2025-01-24",
    status: "pending",
    coverImage: "https://images.unsplash.com/photo-1536431311719-398e83ee172b?w=300&h=400&fit=crop",
    files: [
      { id: "f1", name: "copyright_certificate.pdf", type: "pdf" },
      { id: "f2", name: "author_agreement.pdf", type: "pdf" },
      { id: "f3", name: "cover_art.png", type: "image" },
    ],
    authorNote:
      "I have owned the copyright to this manga series since 2020. All necessary documentation is included in the submitted files.",
  },
  {
    id: "LIC-002",
    mangaTitle: "Neon Dreams",
    author: "Marcus Rivera",
    submittedDate: "2025-01-20",
    status: "pending",
    coverImage: "https://images.unsplash.com/photo-1609287326669-16cf4242dd6d?w=300&h=400&fit=crop",
    files: [
      { id: "f4", name: "license_agreement.pdf", type: "pdf" },
      { id: "f5", name: "cover.jpg", type: "image" },
    ],
    authorNote: "Original work, all rights reserved. Ready for publication.",
  },
  {
    id: "LIC-003",
    mangaTitle: "Ancient Legends",
    author: "Yuki Tanaka",
    submittedDate: "2025-01-18",
    status: "approved",
    coverImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=400&fit=crop",
    files: [
      { id: "f6", name: "copyright_cert.pdf", type: "pdf" },
    ],
    authorNote: "Traditional manga adaptation of historical tales.",
  },
  {
    id: "LIC-004",
    mangaTitle: "Urban Warriors",
    author: "Alex Johnson",
    submittedDate: "2025-01-15",
    status: "rejected",
    coverImage: "https://images.unsplash.com/photo-1517604931442-7e0c6676ecd1?w=300&h=400&fit=crop",
    files: [
      { id: "f7", name: "submission.pdf", type: "pdf" },
    ],
    authorNote: "Action-packed modern manga series.",
    rejectionReason: "Insufficient copyright documentation. Please resubmit with valid ownership proof.",
  },
  {
    id: "LIC-005",
    mangaTitle: "Quantum Paradox",
    author: "Dr. Elena Vasquez",
    submittedDate: "2025-01-22",
    status: "pending",
    coverImage: "https://images.unsplash.com/photo-1578926078328-123456789012?w=300&h=400&fit=crop",
    files: [
      { id: "f8", name: "copyright_proof.pdf", type: "pdf" },
      { id: "f9", name: "author_id.jpg", type: "image" },
      { id: "f10", name: "contract.pdf", type: "pdf" },
    ],
    authorNote: "Science fiction manga with original storyline and artwork.",
  },
  {
    id: "LIC-006",
    mangaTitle: "Love in Spring",
    author: "Jessica Liu",
    submittedDate: "2025-01-19",
    status: "approved",
    coverImage: "https://images.unsplash.com/photo-1535016120754-fd58615602c0?w=300&h=400&fit=crop",
    files: [
      { id: "f11", name: "license.pdf", type: "pdf" },
    ],
    authorNote: "Romance manga series with beautiful illustrations.",
  },
]

export default function LicenseManagementPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | LicenseStatus>("all")
  const [selectedLicense, setSelectedLicense] = useState<License | null>(mockLicenses[0])
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectionForm, setShowRejectionForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const filteredLicenses = mockLicenses.filter((license) => {
    const matchesSearch =
      license.mangaTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || license.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage)
  const paginatedLicenses = filteredLicenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const stats = {
    pending: mockLicenses.filter((l) => l.status === "pending").length,
    approved: mockLicenses.filter((l) => l.status === "approved").length,
    rejected: mockLicenses.filter((l) => l.status === "rejected").length,
  }

  const getStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200"
      case "approved":
        return "bg-green-50 text-green-700 border border-green-200"
      case "rejected":
        return "bg-red-50 text-red-700 border border-red-200"
    }
  }

  const getStatusIcon = (status: LicenseStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "approved":
        return <CheckCircle2 className="h-4 w-4" />
      case "rejected":
        return <XCircle className="h-4 w-4" />
    }
  }

  return (
    
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">License Management</h1>
        <p className="text-sm text-gray-600 mt-1">Review and verify copyright submissions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL - License List */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Submissions</CardTitle>
              <CardDescription>{filteredLicenses.length} found</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or author…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9"
                />
              </div>

              {/* Filter */}
              <Select value={statusFilter} onValueChange={(v: any) => {
                setStatusFilter(v)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* License List */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {paginatedLicenses.map((license) => (
                  <button
                    key={license.id}
                    onClick={() => setSelectedLicense(license)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      selectedLicense?.id === license.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{license.mangaTitle}</p>
                        <p className="text-xs text-gray-600 truncate">{license.author}</p>
                      </div>
                      {getStatusIcon(license.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{license.submittedDate}</span>
                      <Badge className={`text-xs ${getStatusColor(license.status)}`}>
                        {license.status === "pending" && "Pending"}
                        {license.status === "approved" && "Approved"}
                        {license.status === "rejected" && "Rejected"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xs text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL - License Details */}
        {selectedLicense && (
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedLicense.mangaTitle}</CardTitle>
                    <CardDescription>License ID: {selectedLicense.id}</CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(selectedLicense.status)}`}>
                    {selectedLicense.status === "pending" && "Pending Review"}
                    {selectedLicense.status === "approved" && "Approved"}
                    {selectedLicense.status === "rejected" && "Rejected"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-6 overflow-y-auto">
                {/* Cover Preview & Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="bg-gray-100 rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedLicense.coverImage || "/placeholder.svg"}
                        alt={selectedLicense.mangaTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Author</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {selectedLicense.author
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{selectedLicense.author}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Submitted Date</p>
                      <p className="text-sm text-gray-900">{selectedLicense.submittedDate}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Status</p>
                      <Badge className={`text-xs ${getStatusColor(selectedLicense.status)}`}>
                        {selectedLicense.status === "pending" && "Pending Review"}
                        {selectedLicense.status === "approved" && "Approved"}
                        {selectedLicense.status === "rejected" && "Rejected"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Files */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Uploaded Files ({selectedLicense.files.length})
                  </p>
                  <div className="space-y-1">
                    {selectedLicense.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        {file.type === "pdf" ? (
                          <FileText className="h-4 w-4 text-red-600" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Author Note */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Author Note</p>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedLicense.authorNote}
                  </div>
                </div>

                {/* Rejection Reason (if applicable) */}
                {selectedLicense.status === "rejected" && selectedLicense.rejectionReason && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-2">Rejection Reason</p>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                        {selectedLicense.rejectionReason}
                      </div>
                    </div>
                  </>
                )}

                {/* Moderator Actions */}
                {selectedLicense.status === "pending" && (
                  <>
                    <Separator className="mt-auto" />
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setShowRejectionForm(!showRejectionForm)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>

                      {showRejectionForm && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Provide rejection reason…"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            className="w-full bg-red-600 hover:bg-red-700"
                          >
                            Submit Rejection
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
