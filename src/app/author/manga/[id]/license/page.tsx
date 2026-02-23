"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import Link from "next/link"
import { X, Clock, ArrowLeft, ShieldCheck, AlertTriangle, UploadCloud, FileText, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { Separator } from "@/components/ui/separator"

type LicenseStatus = "none" | "pending" | "approved" | "rejected"

type LicenseStatusResponse = {
  licenseStatus?: string
  licenseRejectReason?: string
  licenseSubmittedAt?: string
  licenseReviewedAt?: string

  // tolerant legacy
  status?: string
  rejectReason?: string
}

type MangaDetailResponse = {
  _id: string
  title: string
  coverImage?: string
}

const STATUS_CONFIG: Record<LicenseStatus, { color: string; label: string; hint: string }> = {
  none: {
    color: "bg-gray-100 text-gray-800",
    label: "No License",
    hint: "Upload copyright proof to get verified badge.",
  },
  pending: {
    color: "bg-yellow-100 text-yellow-800",
    label: "Under Review",
    hint: "Your submission is being reviewed. Upload is disabled to avoid duplicates.",
  },
  approved: {
    color: "bg-green-100 text-green-800",
    label: "Verified",
    hint: "Approved. Your story can show the verified badge.",
  },
  rejected: {
    color: "bg-red-100 text-red-800",
    label: "Rejected",
    hint: "Please fix issues and re-upload documents.",
  },
}

export default function AuthorLicensePage() {
  const params = useParams()
  const id = Array.isArray((params as any)?.id) ? (params as any).id[0] : (params as any)?.id

  const [story, setStory] = useState<MangaDetailResponse | null>(null)

  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>("none")
  const [rejectReason, setRejectReason] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [reviewedAt, setReviewedAt] = useState<string | null>(null)

  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState("")

  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const [statusError, setStatusError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // ✅ nicer picker: hidden input + dropzone
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
      withCredentials: true,
    })
  }, [])

  const coverUrl = (coverImage?: string) => {
    if (!coverImage) return ""
    return `${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${coverImage}`
  }

  const normalizeStatus = (raw?: string): LicenseStatus => {
    if (!raw) return "none"
    const s = String(raw).trim().toLowerCase()
    if (s === "pending") return "pending"
    if (s === "approved") return "approved"
    if (s === "rejected") return "rejected"
    return "none"
  }

  const fetchStoryInfo = async () => {
    if (!id) return
    try {
      const res = await api.get(`/manga/detail/${id}`)
      setStory({
        _id: res.data?._id || id,
        title: res.data?.title || "Untitled",
        coverImage: res.data?.coverImage,
      })
    } catch {
      setStory({ _id: id, title: "Story", coverImage: "" })
    }
  }

  const fetchLicenseStatus = async () => {
    if (!id) return
    try {
      const res = await api.get<LicenseStatusResponse>(`/manga/${id}/license-status`)

      const rawStatus = res.data.licenseStatus ?? res.data.status
      const rawReject = res.data.licenseRejectReason ?? res.data.rejectReason

      setLicenseStatus(normalizeStatus(rawStatus))
      setRejectReason(rawReject ? String(rawReject) : null)

      setSubmittedAt(res.data.licenseSubmittedAt ? String(res.data.licenseSubmittedAt) : null)
      setReviewedAt(res.data.licenseReviewedAt ? String(res.data.licenseReviewedAt) : null)

      setStatusError(null)
    } catch (err: any) {
      setStatusError(err?.response?.data?.message || "Failed to load license status")
      setLicenseStatus("none")
      setRejectReason(null)
      setSubmittedAt(null)
      setReviewedAt(null)
    }
  }

  useEffect(() => {
    const run = async () => {
      if (!id) return
      setIsInitialLoading(true)
      await Promise.allSettled([fetchStoryInfo(), fetchLicenseStatus()])
      setIsInitialLoading(false)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const canUpload = licenseStatus === "none" || licenseStatus === "rejected"
  const isPending = licenseStatus === "pending"
  const isApproved = licenseStatus === "approved"

  const validateFiles = (incoming: File[]) => {
    const MAX_FILES = 5
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB

    const valid: File[] = []
    const errors: string[] = []

    for (const f of incoming) {
      const isPdf = f.type === "application/pdf"
      const isImg = f.type.startsWith("image/")
      if (!isPdf && !isImg) {
        errors.push(`${f.name}: only PDF or image allowed`)
        continue
      }
      if (f.size > MAX_SIZE) {
        errors.push(`${f.name}: exceeds 10MB`)
        continue
      }
      valid.push(f)
    }

    if (valid.length > MAX_FILES) errors.push(`Max ${MAX_FILES} files allowed`)

    return { valid: valid.slice(0, MAX_FILES), errors }
  }

  const addFiles = (incoming: File[]) => {
    setSuccessMessage(null)

    const merged = [...files, ...incoming]
    const { valid, errors } = validateFiles(merged)

    setFiles(valid)

    if (errors.length) {
      setStatusError(errors.slice(0, 3).join(" • "))
    } else {
      setStatusError(null)
    }
  }

  const onPickClick = () => {
    if (!canUpload) return
    fileInputRef.current?.click()
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : []
    if (list.length) addFiles(list)
    // reset input so selecting same file again still triggers change
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!canUpload) return
    setIsDragging(false)
    const dropped = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : []
    if (dropped.length) addFiles(dropped)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!canUpload) return
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    setSuccessMessage(null)
    setStatusError(null)

    if (!canUpload) {
      setStatusError("Upload is disabled while your license is under review or already verified.")
      return
    }

    if (!files.length) {
      setStatusError("Please add at least one file.")
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))
      formData.append("note", note.trim())

      await api.post(`/manga/${id}/license`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setSuccessMessage("License submitted successfully! Waiting for review...")
      setFiles([])
      setNote("")
      await fetchLicenseStatus()
    } catch (error: any) {
      setStatusError(error?.response?.data?.message || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  const currentStatus = STATUS_CONFIG[licenseStatus] ?? STATUS_CONFIG.none

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-24 flex justify-center items-center h-96">Loading...</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/author/dashboard">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </Link>

                {isApproved && (
                  <Badge className="bg-green-600 text-white gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl font-bold">License Verification</h1>
              <p className="mt-2 text-gray-600">Submit copyright documents for this story to display verified badge.</p>
            </div>
          </div>

          {/* Story preview */}
          <Card>
            <CardHeader>
              <CardTitle>Story</CardTitle>
              <CardDescription>Make sure you are uploading for the correct story.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="w-28 aspect-[3/4] rounded-md overflow-hidden border bg-gray-100 shrink-0">
                {story?.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl(story.coverImage)} alt={story.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No cover</div>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-sm text-gray-500">Title</div>
                <div className="text-lg font-semibold truncate">{story?.title || "Untitled"}</div>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
                  <span className="text-xs text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {currentStatus.hint}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  {submittedAt && <div>Submitted: {new Date(submittedAt).toLocaleString()}</div>}
                  {reviewedAt && <div>Reviewed: {new Date(reviewedAt).toLocaleString()}</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          {statusError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{statusError}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Rejected reason */}
          {licenseStatus === "rejected" && rejectReason && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Rejected Reason</AlertTitle>
              <AlertDescription>{rejectReason}</AlertDescription>
            </Alert>
          )}

          {/* Pending notice */}
          {isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-yellow-900 bg-yellow-50 border border-yellow-200 rounded p-3">
                  Your license is currently <b>under review</b>. Upload is disabled to prevent duplicate submissions.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approved notice */}
          {isApproved && (
            <Card>
              <CardContent className="p-6 text-center text-green-700 font-semibold">
                Your license has been verified successfully.
              </CardContent>
            </Card>
          )}

          {/* Upload form (ONLY none/rejected) */}
          {canUpload && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>PDF or image files only (Max 10MB each, up to 5 files)</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* ✅ Friendly dropzone */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={onPickClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onPickClick()
                  }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={[
                    "w-full rounded-lg border-2 border-dashed p-6 transition cursor-pointer select-none",
                    isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white",
                  ].join(" ")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="rounded-full p-3 bg-gray-100">
                      <UploadCloud className="h-6 w-6 text-gray-700" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      Click to choose files or drag & drop here
                    </div>
                    <div className="text-xs text-gray-500">
                      Accepts PDF / Images · Max 10MB each · Up to 5 files
                    </div>

                    <div className="mt-2">
                      <Button type="button" variant="outline" size="sm" className="gap-2">
                        <UploadCloud className="h-4 w-4" />
                        Choose files
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={onInputChange}
                />

                {/* Selected files list */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Selected files</div>
                    {files.map((file, index) => {
                      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
                      return (
                        <div key={index} className="flex items-center justify-between border p-2 rounded bg-white">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0">
                              {isPdf ? (
                                <FileText className="h-4 w-4 text-red-600" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-blue-600" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm truncate">{file.name}</div>
                              <div className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 rounded hover:bg-gray-100"
                            aria-label="remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  placeholder="Optional note (max 500 chars)..."
                />

                <Separator />

                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                  {loading ? "Submitting..." : "Submit License"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <div className="border p-4 rounded bg-white">
            <Clock className="h-5 w-5 text-blue-600 mb-2" />
            <p className="text-sm text-gray-700">Reviews typically take 3–5 business days.</p>
          </div>
        </div>
      </main>
    </div>
  )
}