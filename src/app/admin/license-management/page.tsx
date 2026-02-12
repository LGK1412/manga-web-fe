"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  ImageIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import AdminLayout from "../adminLayout/page"

type LicenseStatus = "pending" | "approved" | "rejected"

type License = {
  _id: string
  title: string
  authorId: {
    _id: string
    username: string
    email?: string
  }
  licenseStatus: LicenseStatus
  licenseFiles: string[]
  licenseNote?: string
  licenseRejectReason?: string
  licenseSubmittedAt: string
  licenseReviewedAt?: string
  licenseReviewedBy?: {
    _id: string
    username: string
  }
  coverImage?: string
}

export default function LicenseManagementPage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
      withCredentials: true,
    })
  }, [])

  // ================= FETCH LICENSES =================
  const fetchLicenses = async () => {
    try {
      setLoading(true)
      const res = await api.get("/manga/admin/licenses/pending")
      setLicenses(res.data)
      if (res.data.length > 0) {
        await fetchLicenseDetail(res.data[0]._id)
      }
      setError(null)
    } catch (err: any) {
      console.error("Failed to fetch licenses", err)
      setError(err?.response?.data?.message || "Failed to load licenses")
    } finally {
      setLoading(false)
    }
  }

  // ================= FETCH LICENSE DETAIL =================
  const fetchLicenseDetail = async (mangaId: string) => {
    try {
      const res = await api.get(`/manga/admin/license/${mangaId}`)
      setSelectedLicense(res.data)
      setSelectedFileIndex(0)
    } catch (err: any) {
      console.error("Failed to fetch license detail", err)
    }
  }

  // ================= BUILD FILE URL =================
  const getFileUrl = (filePath: string) => {
    // filePath dạng: "assets/licenses/{mangaId}/{filename}"
    return `${process.env.NEXT_PUBLIC_API_URL}/${filePath}`
  }

  const currentFile = selectedLicense?.licenseFiles[selectedFileIndex]
  const isCurrentFilePdf = currentFile?.endsWith(".pdf")

  useEffect(() => {
    fetchLicenses()
  }, [])

  // ================= REVIEW ACTION =================
  const handleReview = async (status: LicenseStatus) => {
    if (!selectedLicense) return

    if (status === "rejected" && !rejectionReason.trim()) {
      alert("Please provide rejection reason")
      return
    }

    try {
      await api.patch(
        `/manga/admin/license/${selectedLicense._id}/review`,
        {
          status: status,
          rejectReason: rejectionReason,
        }
      )

      await fetchLicenses()
      setShowRejectBox(false)
      setRejectionReason("")
    } catch (err: any) {
      alert(err?.response?.data?.message || "Review failed")
    }
  }

  const filtered = licenses.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: LicenseStatus) => {
    if (status === "pending")
      return "bg-yellow-50 text-yellow-700 border border-yellow-200"
    if (status === "approved")
      return "bg-green-50 text-green-700 border border-green-200"
    return "bg-red-50 text-red-700 border border-red-200"
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">License Management</h1>
          <p className="text-sm text-gray-600">
            Review and verify copyright submissions
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">Loading licenses...</p>
          </div>
        ) : licenses.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No pending licenses to review</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT LIST */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Pending Licenses</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Total: {filtered.length} / {licenses.length}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filtered.map((license) => (
                      <button
                        key={license._id}
                        onClick={() => fetchLicenseDetail(license._id)}
                        className={`w-full p-3 border rounded-lg text-left transition-colors ${
                          selectedLicense?._id === license._id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-sm truncate">{license.title}</p>
                        <p className="text-xs text-gray-500">
                          {license.authorId?.username}
                        </p>
                        <Badge className={`mt-2 text-xs ${getStatusColor(license.licenseStatus)}`}>
                          {license.licenseStatus}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT DETAILS */}
            {selectedLicense && (
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedLicense.title}</CardTitle>
                    <CardDescription>
                      Submitted: {new Date(selectedLicense.licenseSubmittedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Author Info */}
                    <div>
                      <p className="text-sm font-medium mb-2">Author</p>
                      <div className="p-3 bg-gray-50 border rounded text-sm">
                        {selectedLicense.authorId?.username}
                      </div>
                    </div>

                    {/* Files Preview */}
                    <div>
                      <p className="text-sm font-medium mb-3">
                        License Files ({selectedLicense.licenseFiles.length})
                      </p>

                      {selectedLicense.licenseFiles.length > 0 && (
                        <div className="space-y-4">
                          {/* Main Preview */}
                          <div className="border rounded-lg bg-gray-50 p-4 min-h-[400px] flex items-center justify-center overflow-auto">
                            {isCurrentFilePdf ? (
                              <iframe
                                src={`${getFileUrl(currentFile)}#toolbar=1&navpanes=0&scrollbar=1`}
                                className="w-full h-[500px] rounded"
                                title={`PDF - ${currentFile}`}
                              />
                            ) : (
                              <img
                                src={getFileUrl(currentFile || "")}
                                alt={currentFile}
                                className="max-w-full max-h-[500px] rounded"
                              />
                            )}
                          </div>

                          {/* File Navigation */}
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setSelectedFileIndex((i) =>
                                  i > 0 ? i - 1 : selectedLicense.licenseFiles.length - 1
                                )
                              }
                            >
                              ← Previous
                            </Button>

                            <div className="text-sm text-gray-600">
                              File {selectedFileIndex + 1} / {selectedLicense.licenseFiles.length}
                            </div>

                            <Button
                              variant="outline"
                              onClick={() =>
                                setSelectedFileIndex((i) =>
                                  i < selectedLicense.licenseFiles.length - 1 ? i + 1 : 0
                                )
                              }
                            >
                              Next →
                            </Button>
                          </div>

                          {/* File Thumbnails / List */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">All Files</p>
                            <div className="grid grid-cols-4 gap-2">
                              {selectedLicense.licenseFiles.map((file, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSelectedFileIndex(index)}
                                  className={`p-2 border rounded text-center flex flex-col items-center justify-center gap-1 transition-colors ${
                                    selectedFileIndex === index
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:bg-gray-100"
                                  }`}
                                >
                                  {file.endsWith(".pdf") ? (
                                    <FileText className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-blue-600" />
                                  )}
                                  <span className="text-xs truncate">
                                    {index + 1}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Download Link */}
                          <a
                            href={getFileUrl(currentFile || "")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <Button variant="outline" size="sm">
                              📥 Download File
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Author Note */}
                    {selectedLicense.licenseNote && (
                      <div>
                        <p className="text-sm font-medium mb-2">Author Note</p>
                        <div className="p-3 bg-gray-50 border rounded text-sm">
                          {selectedLicense.licenseNote}
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason (if rejected) */}
                    {selectedLicense.licenseStatus === "rejected" && selectedLicense.licenseRejectReason && (
                      <div>
                        <p className="text-sm font-medium mb-2">Rejection Reason</p>
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {selectedLicense.licenseRejectReason}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* ACTIONS */}
                    {selectedLicense.licenseStatus === "pending" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleReview("approved")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => setShowRejectBox(!showRejectBox)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>

                        {showRejectBox && (
                          <div className="space-y-2 p-3 bg-gray-50 rounded border">
                            <p className="text-sm font-medium">Rejection Reason</p>
                            <Textarea
                              placeholder="Explain why this license is rejected..."
                              value={rejectionReason}
                              onChange={(e) =>
                                setRejectionReason(e.target.value)
                              }
                              className="resize-none"
                              rows={4}
                            />
                            <div className="flex gap-2">
                              <Button
                                className="flex-1 bg-red-600 hover:bg-red-700"
                                onClick={() => handleReview("rejected")}
                              >
                                Confirm Rejection
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowRejectBox(false)
                                  setRejectionReason("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedLicense.licenseStatus === "approved" && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          License approved
                        </span>
                      </div>
                    )}

                    {selectedLicense.licenseStatus === "rejected" && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-700">
                          License rejected
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
