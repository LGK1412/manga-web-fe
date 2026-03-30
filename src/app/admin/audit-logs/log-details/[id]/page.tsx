"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  EyeOff,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

import AdminLayout from "@/app/admin/adminLayout/page"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

import {
  buildHumanMessage,
  normalizeDiff,
  prettyAction,
  prettyFieldLabel,
  prettyFieldValue,
  prettyRole,
  resolveAuditActorAvatar,
} from "@/lib/audit-ui"

const surfaceClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur"
const insetSurfaceClass = "rounded-xl border border-slate-200/70 bg-slate-50/80"

type Me = {
  userId?: string
  email?: string
  role?: string
}

function getActionTone(action: string) {
  switch (action) {
    case "approve":
    case "report_status_resolved":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "reject":
    case "report_status_rejected":
    case "delete_comment":
    case "ban_user":
    case "auto_reject":
      return "border border-rose-200 bg-rose-50 text-rose-700"
    case "hide_content":
    case "comment_hidden":
    case "reply_hidden":
      return "border border-orange-200 bg-orange-50 text-orange-700"
    case "warn_user":
      return "border border-amber-200 bg-amber-50 text-amber-700"
    case "mute_user":
      return "border border-blue-200 bg-blue-50 text-blue-700"
    case "request_changes":
      return "border border-violet-200 bg-violet-50 text-violet-700"
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700"
  }
}

function ValueView({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <p className="text-xs text-slate-500">--</p>
  }

  if (typeof value === "string") {
    return (
      <Textarea
        value={value}
        readOnly
        className="min-h-[120px] resize-none rounded-xl border-slate-200 bg-white/80 text-xs text-slate-700"
      />
    )
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm text-slate-700">{String(value)}</p>
  }

  return (
    <ScrollArea className="h-44 rounded-xl border border-slate-200/70 bg-white/80">
      <pre className="whitespace-pre-wrap break-words p-3 text-xs text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </ScrollArea>
  )
}

function DiffObjectView({ obj }: { obj: Record<string, any> }) {
  const keys = Object.keys(obj || {})
  if (!keys.length) return <p className="text-sm text-slate-500">No changes available.</p>

  return (
    <div className="space-y-3">
      {keys.map((key) => (
        <div key={key} className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {prettyFieldLabel(key)}
          </p>
          <ValueView value={prettyFieldValue(key, obj[key])} />
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

  const roleNormalized = useMemo(() => String(me?.role || "").toLowerCase(), [me?.role])
  const isAdmin = useMemo(() => roleNormalized === "admin", [roleNormalized])
  const canAttemptAdminActions = useMemo(
    () => isAdmin || Boolean(meError),
    [isAdmin, meError],
  )

  const actorName = log?.actor_id?.username || log?.actor_name || "System"
  const actorEmail = log?.actor_id?.email || log?.actor_email || "--"
  const actorRole = log?.actor_role || log?.actor_id?.role || "system"
  const actorAvatar = log?.actor_id?.avatar || log?.actor_avatar || log?.actorAvatar

  const timeText = log?.createdAt
    ? new Date(log.createdAt).toLocaleString("vi-VN", { hour12: false })
    : "--"

  const riskBadge = useMemo(() => {
    const risk = log?.risk ?? "low"
    if (risk === "high") return "border border-rose-200 bg-rose-50 text-rose-700"
    if (risk === "medium") return "border border-amber-200 bg-amber-50 text-amber-700"
    return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  }, [log?.risk])

  const approvalBadge = useMemo(() => {
    return log?.approval === "approved"
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border border-amber-200 bg-amber-50 text-amber-700"
  }, [log?.approval])

  const seenBadge = useMemo(() => {
    return log?.seen
      ? "border border-slate-200 bg-slate-100 text-slate-700"
      : "border border-orange-200 bg-orange-50 text-orange-700"
  }, [log?.seen])

  const fetchMe = async () => {
    if (!API) return

    try {
      setMeError(null)
      const res = await axios.get(`${API}/api/auth/me`, { withCredentials: true })
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

  const fetchLog = async () => {
    if (!API || !id) return

    try {
      setError(null)
      const res = await axios.get(`${API}/api/audit-logs/${id}`, { withCredentials: true })
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
    if (!canAttemptAdminActions) {
      toast.error("Admin only")
      return
    }

    try {
      setLoading(true)
      const res = await axios.patch(
        `${API}/api/audit-logs/${id}/approve`,
        { adminNote },
        { withCredentials: true },
      )
      setLog(res.data)
      setAdminNote(res.data?.adminNote ?? adminNote)
      toast.success("Approved")
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Approve failed"
      toast.error(msg)
      console.error("[AuditLogDetails] APPROVE ERROR", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkSeen = async () => {
    if (!API || !id) return
    if (!canAttemptAdminActions) {
      toast.error("Admin only")
      return
    }

    try {
      setLoading(true)
      const res = await axios.patch(`${API}/api/audit-logs/${id}/seen`, {}, { withCredentials: true })
      setLog(res.data)
      toast.success("Marked as seen")
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Mark seen failed"
      toast.error(msg)
      console.error("[AuditLogDetails] SEEN ERROR", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  if (!log && !error) {
    return (
      <AdminLayout>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-2 py-2">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Skeleton className="h-[560px] rounded-2xl" />
            <Skeleton className="h-[560px] rounded-2xl" />
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-3xl px-2 py-2">
          <Card className={surfaceClass}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
                Cannot load audit log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{String(error)}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  onClick={fetchLog}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  const targetType = log?.target_type ? String(log.target_type) : "--"
  const reportCode = log?.reportCode ? String(log.reportCode) : "--"
  const targetTypeLabel = targetType === "--" ? "--" : targetType.replaceAll("_", " ")
  const beforeObj: Record<string, any> = normalizeDiff(log, log?.before || {})
  const afterObj: Record<string, any> = normalizeDiff(log, log?.after || {})
  const canOpenReport =
    String(log?.target_type || "").toLowerCase() === "report" && Boolean(log?.target_id)
  const canEditAdminNote = canAttemptAdminActions && log?.approval !== "approved"
  const hasDiff = Object.keys(beforeObj).length > 0 || Object.keys(afterObj).length > 0
  const evidenceImages = Array.isArray(log?.evidenceImages) ? log.evidenceImages : []

  return (
    <AdminLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-2 py-2">
        <Card className={surfaceClass}>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
                  Audit review
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{prettyAction(log.action)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className={riskBadge}>
                  {log.risk === "high" ? (
                    <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  )}
                  {log.risk ?? "low"}
                </Badge>
                <Badge className={seenBadge}>{log.seen ? "Seen" : "Unseen"}</Badge>
                <Badge className={approvalBadge}>{String(log.approval ?? "pending")}</Badge>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-slate-700">
                {buildHumanMessage(log)}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-700">
                  {reportCode}
                </span>

                {reportCode !== "--" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => copyText(reportCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}

                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                  {timeText}
                </span>

                {canOpenReport && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => router.push("/admin/report")}
                  >
                    Open report workspace
                  </Button>
                )}
              </div>

              {meError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800">
                  Role verification is temporarily unavailable. Backend will still validate any
                  action you submit.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs leading-5 text-slate-600">
                  Reviewing as{" "}
                  <b className="font-semibold text-slate-900">
                    {prettyRole(roleNormalized || "unknown")}
                  </b>
                  .
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => router.back()}
              className="gap-2 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-950">
                      Record details
                    </CardTitle>
                    <p className="text-sm leading-6 text-slate-500">
                      Core metadata for this audit entry.
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="w-fit border-slate-200 bg-slate-100 text-slate-700"
                  >
                    {targetTypeLabel}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className={`${insetSurfaceClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Action
                    </p>
                    <Badge className={`mt-3 text-xs ${getActionTone(log.action)}`}>
                      {prettyAction(log.action)}
                    </Badge>
                  </div>

                  <div className={`${insetSurfaceClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Logged at
                    </p>
                    <p className="mt-3 text-sm font-medium text-slate-900">{timeText}</p>
                  </div>

                  <div className={`${insetSurfaceClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Report code
                    </p>
                    <p className="mt-3 font-mono text-xs text-slate-700">{reportCode}</p>
                  </div>

                  <div className={`${insetSurfaceClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Target
                    </p>
                    <p className="mt-3 text-sm font-medium text-slate-900">{targetTypeLabel}</p>
                  </div>
                </div>

                {log?.note && (
                  <div className={`${insetSurfaceClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Moderator note
                    </p>
                    <Textarea
                      value={String(log.note)}
                      readOnly
                      className="mt-3 min-h-[120px] resize-none rounded-xl border-slate-200 bg-white/80 text-xs text-slate-700"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={surfaceClass}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-slate-950">
                  Change details
                </CardTitle>
                <p className="text-sm leading-6 text-slate-500">
                  Compare snapshots and inspect any evidence attached to this record.
                </p>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="diff" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
                    <TabsTrigger value="diff" className="rounded-lg">
                      Before / After
                    </TabsTrigger>
                    <TabsTrigger value="evidence" className="rounded-lg">
                      Evidence
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="diff" className="mt-4">
                    {hasDiff ? (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4">
                          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                            Before
                          </div>
                          <DiffObjectView obj={beforeObj} />
                        </div>

                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4">
                          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            After
                          </div>
                          <DiffObjectView obj={afterObj} />
                        </div>
                      </div>
                    ) : (
                      <div className={`${insetSurfaceClass} p-4 text-sm text-slate-500`}>
                        No before/after snapshot was recorded for this entry.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="evidence" className="mt-4">
                    {evidenceImages.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {evidenceImages.map((src: string, idx: number) => (
                          <div
                            key={idx}
                            className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/60"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`evidence-${idx}`}
                              className="h-40 w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`${insetSurfaceClass} p-4 text-sm text-slate-500`}>
                        No evidence attached.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card className={`${surfaceClass} lg:sticky lg:top-4 lg:self-start`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-950">
                Review panel
              </CardTitle>
              <p className="text-sm leading-6 text-slate-500">
                Actor context, admin note, and moderation actions in one place.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className={`${insetSurfaceClass} flex items-center gap-3 p-3`}>
                <Avatar className="h-11 w-11 border border-slate-200">
                  <AvatarImage
                    src={resolveAuditActorAvatar(actorAvatar, API)}
                    alt={actorName}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                    {String(actorName)
                      .split(" ")
                      .filter(Boolean)
                      .map((part: string) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{actorName}</p>
                  <p className="truncate text-xs text-slate-500">{actorEmail}</p>
                  <Badge
                    variant="outline"
                    className="mt-2 border-slate-200 bg-white text-slate-700"
                  >
                    {prettyRole(actorRole)}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-slate-200/80" />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Admin note</p>
                  <Badge className={approvalBadge}>{String(log.approval ?? "pending")}</Badge>
                </div>

                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  disabled={loading || !canEditAdminNote}
                  className="min-h-[140px] rounded-xl border-slate-200 bg-white/80 text-sm text-slate-700"
                  placeholder={
                    !canAttemptAdminActions
                      ? "Admin only"
                      : log?.approval === "approved"
                        ? "This log is already approved."
                        : "Write admin note before approving..."
                  }
                />
                <p className="text-xs leading-5 text-slate-500">
                  {log?.approval === "approved"
                    ? "This note is no longer editable after approval."
                    : "This note is submitted together with Approve. Backend still enforces permission for approve and seen actions."}
                </p>
              </div>

              <Separator className="bg-slate-200/80" />

              <div className="space-y-2">
                {!log.seen && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    onClick={handleMarkSeen}
                    disabled={loading || !canAttemptAdminActions}
                    title={!canAttemptAdminActions ? "Admin only" : ""}
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Mark seen
                  </Button>
                )}

                {log.approval === "pending" && (
                  <Button
                    className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                    onClick={handleApprove}
                    disabled={loading || !canAttemptAdminActions}
                    title={!canAttemptAdminActions ? "Admin only" : ""}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                )}

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    onClick={fetchLog}
                    disabled={loading}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh record
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    onClick={fetchMe}
                    disabled={loading}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Retry role check
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
