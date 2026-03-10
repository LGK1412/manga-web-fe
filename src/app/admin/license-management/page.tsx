"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
  CheckCircle2,
  XCircle,
  FileText,
  ImageIcon,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import AdminLayout from "../adminLayout/page"

type MangaLicenseStatus = "none" | "pending" | "approved" | "rejected"

type LicenseQueueItem = {
  _id: string
  title: string
  coverImage?: string
  isPublish?: boolean
  status?: "ongoing" | "completed" | "hiatus"
  licenseStatus: MangaLicenseStatus
  licenseSubmittedAt?: string
  authorId?: {
    _id: string
    username: string
    email?: string
  }
}

type LicenseDetail = {
  _id: string
  title: string
  coverImage?: string
  isPublish?: boolean
  status?: "ongoing" | "completed" | "hiatus"
  authorId?: {
    _id: string
    username: string
    email?: string
  }
  licenseStatus: MangaLicenseStatus
  licenseFiles: string[]
  licenseNote?: string
  licenseRejectReason?: string
  licenseSubmittedAt?: string
  licenseReviewedAt?: string
  licenseReviewedBy?: {
    _id: string
    username: string
  }
}

type LicenseQueueResponse = {
  data: LicenseQueueItem[]
  total: number
  page: number
  limit: number
  stats: Record<MangaLicenseStatus, number>
}

function normalizePath(path?: string) {
  if (!path) return ""
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^public\//, "")
    .replace(/^\/+/, "")
}

function isAbsoluteUrl(path: string) {
  return /^https?:\/\//i.test(path)
}

function getAssetCandidates(baseUrl: string, filePath?: string, fallbackFolder?: string) {
  const cleaned = normalizePath(filePath)
  if (!cleaned) return []

  if (isAbsoluteUrl(cleaned)) return [cleaned]

  const base = (baseUrl || "").replace(/\/+$/, "")

  const candidates = new Set<string>()

  // path gốc
  candidates.add(`${base}/${cleaned}`)

  // nếu path đã là assets/...
  if (cleaned.startsWith("assets/")) {
    candidates.add(`${base}/${cleaned}`)
  }

  // nếu path chưa có assets mà chỉ là filename
  if (fallbackFolder && !cleaned.startsWith("assets/")) {
    candidates.add(`${base}/${fallbackFolder}/${cleaned}`)
  }

  // đôi khi backend lưu /assets/... hoặc public/assets/...
  const withoutAssetsPrefix = cleaned.replace(/^assets\//, "")
  if (fallbackFolder) {
    candidates.add(`${base}/${fallbackFolder}/${withoutAssetsPrefix}`)
  }

  return Array.from(candidates)
}

function PreviewImage({
  urls,
  alt,
  className,
  emptyText = "Image not available",
}: {
  urls: string[]
  alt: string
  className?: string
  emptyText?: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [urls.join("|")])

  if (!urls.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
        {emptyText}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[index]}
      alt={alt}
      className={className}
      onError={() => {
        if (index < urls.length - 1) setIndex(index + 1)
      }}
    />
  )
}

function PreviewPdf({
  urls,
  title,
}: {
  urls: string[]
  title: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [urls.join("|")])

  if (!urls.length) {
    return (
      <div className="text-sm text-gray-500">
        PDF not available
      </div>
    )
  }

  return (
    <iframe
      src={`${urls[index]}#toolbar=1&navpanes=0&scrollbar=1`}
      className="w-full h-[520px] rounded"
      title={title}
      onError={() => {
        if (index < urls.length - 1) setIndex(index + 1)
      }}
    />
  )
}

export default function ContentManagementPage() {
  const [items, setItems] = useState<LicenseQueueItem[]>([])
  const [selected, setSelected] = useState<LicenseDetail | null>(null)

  const [statusFilter, setStatusFilter] = useState<"all" | MangaLicenseStatus>("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const limit = 20

  const [stats, setStats] = useState<Record<MangaLicenseStatus, number>>({
    none: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectBox, setShowRejectBox] = useState(false)

  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [publishAfterApprove, setPublishAfterApprove] = useState(true)

  const apiBase = useMemo(() => {
    return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")
  }, [])

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${apiBase}/api`,
      withCredentials: true,
    })
  }, [apiBase])

  const getFileUrls = (filePath?: string) => {
    return getAssetCandidates(apiBase, filePath, "assets/licenses")
  }

  const getCoverUrls = (coverImage?: string) => {
    return getAssetCandidates(apiBase, coverImage, "assets/coverImages")
  }

  const fetchQueue = async (nextPage = page) => {
    try {
      setLoading(true)
      const res = await api.get<LicenseQueueResponse>("/manga/admin/licenses", {
        params: {
          status: statusFilter,
          q: searchQuery,
          page: nextPage,
          limit,
        },
      })

      setItems(res.data.data)
      setStats(res.data.stats)
      setPage(res.data.page)
      setError(null)

      if (res.data.data.length > 0) {
        const first = res.data.data[0]
        if (!selected || !res.data.data.some((x) => x._id === selected._id)) {
          await fetchDetail(first._id)
        }
      } else {
        setSelected(null)
      }
    } catch (err: any) {
      console.error("Failed to fetch queue", err)
      setError(err?.response?.data?.message || "Failed to load moderation queue")
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (mangaId: string) => {
    try {
      setDetailLoading(true)
      const res = await api.get<LicenseDetail>(`/manga/admin/license/${mangaId}`)
      setSelected(res.data)
      setSelectedFileIndex(0)
      setShowRejectBox(false)
      setRejectionReason("")
      setPublishAfterApprove(true)
    } catch (err) {
      console.error("Failed to fetch detail", err)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchQueue(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    fetchQueue(1)
  }, [statusFilter])

  const currentFile =
    selected &&
    selected.licenseFiles?.length > 0 &&
    selectedFileIndex < selected.licenseFiles.length
      ? selected.licenseFiles[selectedFileIndex]
      : undefined

  const isCurrentFilePdf = typeof currentFile === "string" && currentFile.toLowerCase().endsWith(".pdf")

  const currentFileUrls = getFileUrls(currentFile)

  const getLicenseBadgeClass = (s: MangaLicenseStatus) => {
    if (s === "pending") return "bg-yellow-50 text-yellow-700 border border-yellow-200"
    if (s === "approved") return "bg-green-50 text-green-700 border border-green-200"
    if (s === "rejected") return "bg-red-50 text-red-700 border border-red-200"
    return "bg-gray-50 text-gray-700 border border-gray-200"
  }

  const getPublishBadgeClass = (published?: boolean) => {
    if (published) return "bg-blue-50 text-blue-700 border border-blue-200"
    return "bg-gray-50 text-gray-700 border border-gray-200"
  }

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selected) return

    if (status === "rejected" && !rejectionReason.trim()) {
      alert("Please provide rejection reason")
      return
    }

    try {
      await api.patch(`/manga/admin/license/${selected._id}/review`, {
        status,
        rejectReason: status === "rejected" ? rejectionReason : "",
        publishAfterApprove: status === "approved" ? publishAfterApprove : false,
      })

      await fetchQueue(page)
      await fetchDetail(selected._id)
    } catch (err: any) {
      alert(err?.response?.data?.message || "Review failed")
    }
  }

  const handleTogglePublish = async (nextPublish: boolean) => {
    if (!selected) return
    console.log("hhhhhhh")
    try {
      await api.patch(`/manga/admin/story/${selected._id}/publish`, {
        isPublish: nextPublish,
      })
      await fetchQueue(page)
      await fetchDetail(selected._id)
    } catch (err: any) {
      alert(err?.response?.data?.message || "Update publish status failed")
    }
  }

  const renderStatusFilterButton = (label: string, value: typeof statusFilter) => {
    const active = statusFilter === value
    return (
      <button
        onClick={() => setStatusFilter(value)}
        className={[
          "px-3 py-1.5 rounded-full text-sm border transition-colors",
          active ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </button>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Management</h1>
            <p className="text-sm text-gray-600">
              Moderation workspace: verify license, control publishing, and show verified badge on cover.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border bg-white px-3 py-2">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-lg font-semibold">{stats.pending || 0}</div>
            </div>
            <div className="rounded-lg border bg-white px-3 py-2">
              <div className="text-xs text-gray-500">Approved</div>
              <div className="text-lg font-semibold">{stats.approved || 0}</div>
            </div>
            <div className="rounded-lg border bg-white px-3 py-2">
              <div className="text-xs text-gray-500">Rejected</div>
              <div className="text-lg font-semibold">{stats.rejected || 0}</div>
            </div>
            <div className="rounded-lg border bg-white px-3 py-2">
              <div className="text-xs text-gray-500">None</div>
              <div className="text-lg font-semibold">{stats.none || 0}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">Loading moderation queue...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Moderation Queue</CardTitle>
                  <CardDescription>
                    Total: {items.length} (page {page})
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {renderStatusFilterButton("All", "all")}
                    {renderStatusFilterButton("Pending", "pending")}
                    {renderStatusFilterButton("Approved", "approved")}
                    {renderStatusFilterButton("Rejected", "rejected")}
                    {renderStatusFilterButton("None", "none")}
                  </div>

                  <Input
                    placeholder="Search by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  {items.length === 0 ? (
                    <div className="py-10 text-center text-gray-500 text-sm">
                      No items found.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[540px] overflow-y-auto">
                      {items.map((it) => {
                        const active = selected?._id === it._id
                        return (
                          <button
                            key={it._id}
                            onClick={() => fetchDetail(it._id)}
                            className={[
                              "w-full p-3 border rounded-lg text-left transition-colors",
                              active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-16 rounded overflow-hidden border bg-gray-100 shrink-0">
                                {it.coverImage ? (
                                  <PreviewImage
                                    urls={getCoverUrls(it.coverImage)}
                                    alt={it.title}
                                    className="w-full h-full object-cover"
                                    emptyText="No cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                    No cover
                                  </div>
                                )}

                                {it.licenseStatus === "approved" && (
                                  <div className="absolute bottom-1 right-1 bg-green-600 text-white rounded-full p-1">
                                    <ShieldCheck className="h-3 w-3" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{it.title}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {it.authorId?.username || "Unknown author"}
                                </p>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge className={`text-xs ${getLicenseBadgeClass(it.licenseStatus)}`}>
                                    license: {it.licenseStatus}
                                  </Badge>
                                  <Badge className={`text-xs ${getPublishBadgeClass(it.isPublish)}`}>
                                    {it.isPublish ? (
                                      <span className="inline-flex items-center gap-1">
                                        <Eye className="h-3 w-3" /> published
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1">
                                        <EyeOff className="h-3 w-3" /> draft
                                      </span>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => {
                        const next = Math.max(1, page - 1)
                        setPage(next)
                        fetchQueue(next)
                      }}
                    >
                      ← Prev
                    </Button>

                    <div className="text-xs text-gray-500">
                      Page {page}
                    </div>

                    <Button
                      variant="outline"
                      disabled={items.length < limit}
                      onClick={() => {
                        const next = page + 1
                        setPage(next)
                        fetchQueue(next)
                      }}
                    >
                      Next →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {!selected ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-gray-500">Select an item from the queue</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span className="truncate">{selected.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-xs ${getLicenseBadgeClass(selected.licenseStatus)}`}>
                          license: {selected.licenseStatus}
                        </Badge>
                        <Badge className={`text-xs ${getPublishBadgeClass(selected.isPublish)}`}>
                          {selected.isPublish ? "published" : "draft"}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {selected.licenseSubmittedAt
                        ? `Submitted: ${new Date(selected.licenseSubmittedAt).toLocaleString()}`
                        : "Not submitted"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {detailLoading ? (
                      <div className="py-12 text-center text-gray-500">Loading detail...</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border bg-gray-100">
                              {selected.coverImage ? (
                                <PreviewImage
                                  urls={getCoverUrls(selected.coverImage)}
                                  alt={selected.title}
                                  className="w-full h-full object-cover"
                                  emptyText="No cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                                  No cover
                                </div>
                              )}

                              {selected.licenseStatus === "approved" && (
                                <div className="absolute bottom-2 right-2 bg-green-600 text-white rounded-full p-2 shadow">
                                  <ShieldCheck className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-3">
                            <div>
                              <p className="text-sm font-medium mb-1">Author</p>
                              <div className="p-3 bg-gray-50 border rounded text-sm">
                                <div className="font-medium">{selected.authorId?.username || "Unknown"}</div>
                                {selected.authorId?.email && (
                                  <div className="text-xs text-gray-500">{selected.authorId.email}</div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 bg-gray-50 border rounded">
                                <div className="text-xs text-gray-500">Story status</div>
                                <div className="text-sm font-medium">{selected.status || "ongoing"}</div>
                              </div>
                              <div className="p-3 bg-gray-50 border rounded">
                                <div className="text-xs text-gray-500">Visibility</div>
                                <div className="text-sm font-medium">
                                  {selected.isPublish ? "Published" : "Draft"}
                                </div>
                              </div>
                            </div>

                            
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              License Files ({selected.licenseFiles?.length || 0})
                            </p>

                            {currentFileUrls.length > 0 && (
                              <a
                                href={currentFileUrls[0]}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="outline" size="sm">
                                  📥 Download
                                </Button>
                              </a>
                            )}
                          </div>

                          {selected.licenseFiles?.length ? (
                            <div className="space-y-4">
                              <div className="border rounded-lg bg-gray-50 p-4 min-h-[420px] flex items-center justify-center overflow-auto">
                                {isCurrentFilePdf ? (
                                  <PreviewPdf
                                    urls={currentFileUrls}
                                    title={`PDF - ${currentFile ?? ""}`}
                                  />
                                ) : (
                                  <PreviewImage
                                    urls={currentFileUrls}
                                    alt={currentFile ?? ""}
                                    className="max-w-full max-h-[520px] rounded"
                                    emptyText="Cannot load image"
                                  />
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setSelectedFileIndex((i) =>
                                      i > 0 ? i - 1 : selected.licenseFiles.length - 1
                                    )
                                  }
                                >
                                  ← Previous
                                </Button>

                                <div className="text-sm text-gray-600">
                                  File {selectedFileIndex + 1} / {selected.licenseFiles.length}
                                </div>

                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setSelectedFileIndex((i) =>
                                      i < selected.licenseFiles.length - 1 ? i + 1 : 0
                                    )
                                  }
                                >
                                  Next →
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-600">All Files</p>
                                <div className="grid grid-cols-6 gap-2">
                                  {selected.licenseFiles.map((file, index) => (
                                    <button
                                      key={index}
                                      onClick={() => setSelectedFileIndex(index)}
                                      className={[
                                        "p-2 border rounded text-center flex flex-col items-center justify-center gap-1 transition-colors",
                                        selectedFileIndex === index
                                          ? "border-blue-500 bg-blue-50"
                                          : "border-gray-200 hover:bg-gray-100",
                                      ].join(" ")}
                                    >
                                      {file.toLowerCase().endsWith(".pdf") ? (
                                        <FileText className="h-4 w-4 text-red-600" />
                                      ) : (
                                        <ImageIcon className="h-4 w-4 text-blue-600" />
                                      )}
                                      <span className="text-xs truncate">{index + 1}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              No license files uploaded.
                            </div>
                          )}
                        </div>

                        {selected.licenseNote && (
                          <div>
                            <p className="text-sm font-medium mb-2">Author Note</p>
                            <div className="p-3 bg-gray-50 border rounded text-sm">
                              {selected.licenseNote}
                            </div>
                          </div>
                        )}

                        {(selected.licenseReviewedAt || selected.licenseReviewedBy) && (
                          <div className="p-3 bg-gray-50 border rounded text-sm">
                            <div className="text-xs text-gray-500">Reviewed</div>
                            <div className="font-medium">
                              {selected.licenseReviewedBy?.username || "Unknown"}{" "}
                              {selected.licenseReviewedAt
                                ? `— ${new Date(selected.licenseReviewedAt).toLocaleString()}`
                                : ""}
                            </div>
                          </div>
                        )}

                        {selected.licenseStatus === "rejected" && selected.licenseRejectReason && (
                          <div>
                            <p className="text-sm font-medium mb-2">Rejection Reason</p>
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              {selected.licenseRejectReason}
                            </div>
                          </div>
                        )}

                        <Separator />

                        {selected.licenseStatus === "pending" && (
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
                                  onChange={(e) => setRejectionReason(e.target.value)}
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

                        {selected.licenseStatus === "approved" && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              License approved — users will see the verified badge on cover.
                            </span>
                          </div>
                        )}

                        {selected.licenseStatus === "rejected" && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <span className="text-sm font-medium text-red-700">
                              License rejected
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}