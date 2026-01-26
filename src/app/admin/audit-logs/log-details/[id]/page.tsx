"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Copy,
  RefreshCcw,
} from "lucide-react"

import AdminLayout from "@/app/admin/adminLayout/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

type Me = {
  userId?: string
  email?: string
  role?: string
}

/** ✅ Helper: render value giống ReportModal (multiline friendly) */
function ValueView({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <p className="text-xs text-gray-500">—</p>
  }

  if (typeof value === "string") {
    return (
      <Textarea
        value={value}
        readOnly
        className="text-xs min-h-[120px] resize-none bg-white"
      />
    )
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm text-gray-800">{String(value)}</p>
  }

  // object / array
  return (
    <ScrollArea className="h-44 border rounded-lg bg-white">
      <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words p-3">
        {JSON.stringify(value, null, 2)}
      </pre>
    </ScrollArea>
  )
}

/** ✅ Helper: render object fields theo dạng form */
function DiffObjectView({ obj }: { obj: Record<string, any> }) {
  const keys = Object.keys(obj || {})
  if (!keys.length) return <p className="text-sm text-gray-500">No data.</p>

  return (
    <div className="space-y-3">
      {keys.map((k) => (
        <div key={k} className="space-y-1">
          <p className="text-xs font-semibold text-gray-700">{k}</p>
          <ValueView value={obj[k]} />
        </div>
      ))}
    </div>
  )
}

export default function AuditLogDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const API = process.env.NEXT_PUBLIC_API_URL

  const [log, setLog] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")
  const [loading, setLoading] = useState(false)

  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** ✅ role normalized */
  const roleNormalized = useMemo(() => {
    return String(me?.role || "").toLowerCase()
  }, [me?.role])

  const isAdmin = useMemo(() => roleNormalized === "admin", [roleNormalized])

  const actorName = log?.actor_id?.username || log?.actor_name || "System"
  const actorEmail = log?.actor_id?.email || log?.actor_email || "—"
  const actorRole = log?.actor_role || log?.actor_id?.role || "system"

  const timeText = log?.createdAt
    ? new Date(log.createdAt).toLocaleString("vi-VN", { hour12: false })
    : "—"

  const riskBadge = useMemo(() => {
    const risk = log?.risk ?? "low"
    if (risk === "high") return "bg-red-100 text-red-800 border border-red-200"
    if (risk === "medium")
      return "bg-yellow-100 text-yellow-800 border border-yellow-200"
    return "bg-green-100 text-green-800 border border-green-200"
  }, [log?.risk])

  const approvalBadge = useMemo(() => {
    return log?.approval === "approved"
      ? "bg-green-100 text-green-800 border border-green-200"
      : "bg-yellow-100 text-yellow-800 border border-yellow-200"
  }, [log?.approval])

  const seenBadge = useMemo(() => {
    return log?.seen
      ? "bg-slate-100 text-slate-700 border border-slate-200"
      : "bg-orange-100 text-orange-800 border border-orange-200"
  }, [log?.seen])

  /** ✅ fetch me (role) */
  const fetchMe = async () => {
    if (!API) return
    try {
      setMeError(null)
      const res = await axios.get(`${API}/api/auth/me`, {
        withCredentials: true,
      })
      setMe(res.data)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Cannot fetch /me"

      console.error("[ME] FETCH ERROR:", err?.response?.data || err?.message)
      setMe(null)
      setMeError(msg)
    }
  }

  /** ✅ fetch log detail */
  const fetchLog = async () => {
    if (!API || !id) return
    try {
      setError(null)
      const res = await axios.get(`${API}/api/audit-logs/${id}`, {
        withCredentials: true,
      })
      setLog(res.data)
      setAdminNote(res.data?.adminNote ?? "")
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Fetch failed"
      setError(msg)
      console.error("[AuditLogDetails] FETCH ERROR", err?.response?.data || err?.message)
    }
  }

  useEffect(() => {
    fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API])

  useEffect(() => {
    fetchLog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, id])

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch {
      toast.error("Copy failed")
    }
  }

  const handleApprove = async () => {
    if (!API || !id) return

    try {
      setLoading(true)
      const res = await axios.patch(
        `${API}/api/audit-logs/${id}/approve`,
        { adminNote },
        { withCredentials: true },
      )
      setLog(res.data)
      toast.success("Approved")
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Approve failed"

      toast.error(msg)
      console.error("[AuditLogDetails] APPROVE ERROR", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkSeen = async () => {
    if (!API || !id) return

    try {
      setLoading(true)
      const res = await axios.patch(
        `${API}/api/audit-logs/${id}/seen`,
        {},
        { withCredentials: true },
      )
      setLog(res.data)
      toast.success("Marked as seen")
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Mark seen failed"

      toast.error(msg)
      console.error("[AuditLogDetails] SEEN ERROR", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  if (!log && !error) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-[520px] lg:col-span-2" />
            <Skeleton className="h-[520px]" />
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Cannot load audit log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{String(error)}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={fetchLog}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  // ✅ keys union cho before/after nếu bạn muốn match field 2 bên (optional)
  const beforeObj: Record<string, any> = log?.before || {}
  const afterObj: Record<string, any> = log?.after || {}

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">
              Admin / Audit Logs / <span className="text-gray-800">Details</span>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
              <Badge className={riskBadge}>
                {log.risk === "high" ? (
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                )}
                {log.risk ?? "low"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-mono text-xs bg-gray-50 border px-2 py-1 rounded">
                {String(log?._id || id)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyText(String(log?._id || id))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              Logged in as{" "}
              <b className="text-gray-800">{roleNormalized || "unknown"}</b>
              {meError && (
                <span className="ml-2 text-red-600">(me API error: {meError})</span>
              )}
            </div>
          </div>

          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Action</p>
                    <Badge className="mt-1">{String(log.action)}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="mt-1 font-medium">{timeText}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-gray-500 mb-1">Message</p>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {String(log.summary ?? "—")}
                  </p>
                </div>

                {/* ✅ Nếu muốn show note (moderator note) dạng multiline */}
                {log?.note && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Moderator Note
                    </p>
                    <Textarea
                      value={String(log.note)}
                      readOnly
                      className="text-xs min-h-[120px] resize-none bg-white"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="diff">Before/After</TabsTrigger>
                    <TabsTrigger value="evidence">Evidence</TabsTrigger>
                    <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={seenBadge}>{log.seen ? "Seen" : "Unseen"}</Badge>
                      <Badge className={approvalBadge}>{String(log.approval ?? "pending")}</Badge>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>
                        <span className="text-gray-500">Actor:</span>{" "}
                        <span className="font-medium text-gray-900">{actorName}</span>{" "}
                        <span className="text-gray-400">({actorRole})</span>
                      </p>
                      <p className="text-xs">{actorEmail}</p>
                    </div>
                  </TabsContent>

                  {/* ✅ UPDATED: Before/After hiển thị multiline dễ đọc */}
                  <TabsContent value="diff" className="mt-4">
                    {log.before || log.after ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-red-50">
                          <div className="px-3 py-2 text-xs font-semibold text-red-800 border-b">
                            Before
                          </div>
                          <div className="p-3">
                            <DiffObjectView obj={beforeObj} />
                          </div>
                        </div>

                        <div className="rounded-lg border bg-green-50">
                          <div className="px-3 py-2 text-xs font-semibold text-green-800 border-b">
                            After
                          </div>
                          <div className="p-3">
                            <DiffObjectView obj={afterObj} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-3">No before/after data.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="evidence" className="mt-4">
                    {Array.isArray(log.evidenceImages) && log.evidenceImages.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {log.evidenceImages.map((src: string, idx: number) => (
                          <div
                            key={idx}
                            className="border rounded-lg overflow-hidden bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`evidence-${idx}`}
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No evidence attached.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="raw" className="mt-4">
                    <ScrollArea className="h-80 border rounded-lg p-3 bg-gray-50">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                        {JSON.stringify(log, null, 2)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right */}
          <div className="space-y-4">
            {/* Actor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actor</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {actorName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="font-semibold text-sm">{actorName}</p>
                  <p className="text-xs text-gray-500">{actorEmail}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {actorRole}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Admin note */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Admin Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  disabled={loading}
                  placeholder={
                    meError
                      ? "⚠ Cannot verify role (/me 403), but you can still try actions..."
                      : isAdmin
                        ? "Write admin note..."
                        : "Write admin note..."
                  }
                />
                <p className="text-xs text-gray-500">
                  * Quyền thật sẽ do backend quyết định khi Approve/Seen.
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!log.seen && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleMarkSeen}
                    disabled={loading}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Mark Seen
                  </Button>
                )}

                {log.approval === "pending" && (
                  <Button
                    className="w-full"
                    onClick={handleApprove}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={fetchLog}
                  disabled={loading}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={fetchMe}
                  disabled={loading}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh Role (/me)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
