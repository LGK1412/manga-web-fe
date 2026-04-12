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
  MessageSquareText,
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
  resolveAuditTarget,
  resolveAuditActorAvatar,
} from "@/lib/audit-ui"

const surfaceClass =
  "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur"
const insetSurfaceClass =
  "rounded-xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/85"

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
    case "request_changes":
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
    case "admin_reset_user_status":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "admin_update_staff_status":
      return "border border-indigo-200 bg-indigo-50 text-indigo-700"
    case "admin_set_role":
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

function firstNonEmpty(...values: Array<unknown>) {
  for (const value of values) {
    const text = String(value ?? "").trim()
    if (text) return text
  }
  return ""
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function extractCommentPlainText(content: string) {
  return decodeHtmlEntities(String(content || ""))
    .replace(/<div><br\s*\/?><\/div>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|blockquote|section|article|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function escapePlainText(content: string) {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />")
}

function normalizeCommentHtml(content: string, apiUrl?: string) {
  const decodedContent = decodeHtmlEntities(content)
  const normalizedApi = (apiUrl || "").replace(/\/+$/, "")
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(decodedContent)

  let html = hasHtml ? decodedContent : escapePlainText(decodedContent)
  html = html.replace(/<div><br\s*\/?><\/div>/gi, "<br />")

  if (normalizedApi) {
    html = html.replace(/https?:\/\/localhost:\d+/gi, normalizedApi)
    html = html.replace(
      /src=(['"])\/(assets\/emoji\/[^'"]+)\1/gi,
      `src=$1${normalizedApi}/$2$1`
    )
    html = html.replace(
      /src=(['"])(assets\/emoji\/[^'"]+)\1/gi,
      `src=$1${normalizedApi}/$2$1`
    )
  }

  return html
}

function normalizeContentAssetUrl(value: string, apiUrl?: string) {
  const raw = String(value || "").trim()
  const normalizedApi = (apiUrl || "").replace(/\/+$/, "")

  if (!raw) return ""

  const localhostNormalized = normalizedApi
    ? raw.replace(/https?:\/\/localhost:\d+/gi, normalizedApi)
    : raw

  if (/^data:image\//i.test(localhostNormalized)) return localhostNormalized
  if (/^https?:\/\//i.test(localhostNormalized)) return localhostNormalized

  if (localhostNormalized.startsWith("/") && normalizedApi) {
    return `${normalizedApi}${localhostNormalized}`
  }

  if (normalizedApi && /^assets\//i.test(localhostNormalized)) {
    return `${normalizedApi}/${localhostNormalized.replace(/^\/+/, "")}`
  }

  return localhostNormalized
}

function sanitizeAuditCommentHtml(content: string, apiUrl?: string) {
  if (typeof window === "undefined") return ""

  const allowedTags = new Set([
    "a",
    "b",
    "blockquote",
    "br",
    "div",
    "em",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "span",
    "strong",
    "u",
    "ul",
  ])
  const blockedTags = new Set(["iframe", "object", "embed", "script", "style", "link", "meta"])
  const parser = new window.DOMParser()
  const doc = parser.parseFromString(`<div>${normalizeCommentHtml(content, apiUrl)}</div>`, "text/html")
  const root = doc.body.firstElementChild

  if (!root) return ""

  const sanitizeNode = (node: Node, ownerDocument: Document): Node | null => {
    if (node.nodeType === window.Node.TEXT_NODE) {
      return ownerDocument.createTextNode(node.textContent || "")
    }

    if (node.nodeType !== window.Node.ELEMENT_NODE) return null

    const element = node as HTMLElement
    const tag = element.tagName.toLowerCase()

    if (blockedTags.has(tag)) return null

    if (!allowedTags.has(tag)) {
      const fragment = ownerDocument.createDocumentFragment()
      Array.from(element.childNodes).forEach((child) => {
        const safeChild = sanitizeNode(child, ownerDocument)
        if (safeChild) fragment.appendChild(safeChild)
      })
      return fragment
    }

    const cleanElement = ownerDocument.createElement(tag)

    if (tag === "img") {
      const normalizedSrc = normalizeContentAssetUrl(element.getAttribute("src") || "", apiUrl)
      if (!normalizedSrc) return null
      cleanElement.setAttribute("src", normalizedSrc)
      cleanElement.setAttribute("alt", element.getAttribute("alt") || "comment-media")
      cleanElement.setAttribute("loading", "lazy")
      cleanElement.setAttribute("referrerpolicy", "no-referrer")
    }

    if (tag === "a") {
      const normalizedHref = normalizeContentAssetUrl(element.getAttribute("href") || "", apiUrl)
      if (normalizedHref) {
        cleanElement.setAttribute("href", normalizedHref)
        cleanElement.setAttribute("target", "_blank")
        cleanElement.setAttribute("rel", "noreferrer noopener")
      }
    }

    Array.from(element.childNodes).forEach((child) => {
      const safeChild = sanitizeNode(child, ownerDocument)
      if (safeChild) cleanElement.appendChild(safeChild)
    })

    return cleanElement
  }

  const safeRoot = document.createElement("div")
  Array.from(root.childNodes).forEach((child) => {
    const safeChild = sanitizeNode(child, document)
    if (safeChild) safeRoot.appendChild(safeChild)
  })

  return safeRoot.innerHTML
}

function getAuditCommentHtml(log: any) {
  return firstNonEmpty(log?.after?.content_html, log?.before?.content_html)
}

function getAuditCommentPreviewSource(log: any) {
  return firstNonEmpty(
    log?.after?.content_html,
    log?.before?.content_html,
    log?.after?.content_preview,
    log?.before?.content_preview
  )
}

export default function AuditLogDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const API = process.env.NEXT_PUBLIC_API_URL

  const [log, setLog] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [renderedCommentHtml, setRenderedCommentHtml] = useState("")

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

  const targetType = String(log?.target_type || "").toLowerCase()
  const isCommentLikeRecord =
    targetType === "comment" ||
    targetType === "reply" ||
    String(log?.action || "").startsWith("comment_") ||
    String(log?.action || "").startsWith("reply_")
  const commentPreviewSource = useMemo(() => getAuditCommentPreviewSource(log), [log])
  const commentRenderSource = useMemo(
    () => firstNonEmpty(getAuditCommentHtml(log), commentPreviewSource),
    [commentPreviewSource, log]
  )
  const commentPlainText = useMemo(
    () => extractCommentPlainText(commentPreviewSource),
    [commentPreviewSource]
  )
  const commentFallbackText = useMemo(
    () =>
      targetType === "reply"
        ? "This reply contains media or formatting only."
        : "This comment contains media or formatting only.",
    [targetType]
  )

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

  useEffect(() => {
    if (!isCommentLikeRecord || !commentRenderSource) {
      setRenderedCommentHtml("")
      return
    }

    try {
      const safeHtml = sanitizeAuditCommentHtml(commentRenderSource, API)
      setRenderedCommentHtml(safeHtml)
    } catch {
      setRenderedCommentHtml("")
    }
  }, [API, commentRenderSource, isCommentLikeRecord])

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

  const reportCode = log?.reportCode ? String(log.reportCode) : "--"
  const targetIdentity = resolveAuditTarget(log)
  const beforeObj: Record<string, any> = normalizeDiff(log, log?.before || {})
  const afterObj: Record<string, any> = normalizeDiff(log, log?.after || {})
  const canOpenReport =
    String(log?.target_type || "").toLowerCase() === "report" && Boolean(log?.target_id)
  const canEditAdminNote = canAttemptAdminActions && log?.approval !== "approved"
  const hasDiff = Object.keys(beforeObj).length > 0 || Object.keys(afterObj).length > 0
  const evidenceImages = Array.isArray(log?.evidenceImages) ? log.evidenceImages : []
  const hasEvidence = evidenceImages.length > 0

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

  return (
    <AdminLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 bg-gradient-to-br from-amber-50/20 via-white to-sky-50/25 px-2 py-2">
        <Card className={`${surfaceClass} bg-gradient-to-br from-white via-white to-amber-50/55`}>
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
                <Badge variant="outline" className={riskBadge}>
                  {log.risk === "high" ? (
                    <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  )}
                  {log.risk ?? "low"}
                </Badge>
                <Badge variant="outline" className={seenBadge}>{log.seen ? "Seen" : "Unseen"}</Badge>
                <Badge variant="outline" className={approvalBadge}>{String(log.approval ?? "pending")}</Badge>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-slate-700">
                {buildHumanMessage(log)}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {reportCode !== "--" && (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-700">
                    {reportCode}
                  </span>
                )}

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
                    onClick={() => {
                      const params = new URLSearchParams()
                      const reportId = String(log?.target_id || "").trim()
                      const reportCodeValue = String(log?.reportCode || "").trim()

                      if (reportId) params.set("reportId", reportId)
                      if (reportCodeValue) params.set("reportCode", reportCodeValue)

                      router.push(
                        `/admin/report${params.toString() ? `?${params.toString()}` : ""}`,
                      )
                    }}
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
            {isCommentLikeRecord && (
              <Card className={`${surfaceClass} bg-gradient-to-br from-white via-white to-amber-50/50`}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950">
                        <MessageSquareText className="h-4 w-4 text-amber-600" />
                        {targetType === "reply" ? "Reply preview" : "Comment preview"}
                      </CardTitle>
                      <p className="text-sm leading-6 text-slate-500">
                        Captured content from this audit entry, shown separately so the change log stays easier to scan.
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className="w-fit max-w-full whitespace-normal border-amber-200 bg-amber-50 text-left leading-5 text-amber-700"
                    >
                      {targetIdentity.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-[24px] border border-amber-200/70 bg-white/95 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                    {renderedCommentHtml ? (
                      <div
                        className="space-y-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [&_a]:text-sky-700 [&_a]:underline [&_blockquote]:rounded-2xl [&_blockquote]:border [&_blockquote]:border-slate-200 [&_blockquote]:bg-slate-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_div]:min-h-[1.5rem] [&_img]:inline-block [&_img]:max-h-24 [&_img]:w-auto [&_img]:align-middle [&_img]:rounded-md [&_p]:mb-3 [&_p:last-child]:mb-0]"
                        dangerouslySetInnerHTML={{ __html: renderedCommentHtml }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                        {commentPlainText || commentFallbackText}
                      </p>
                    )}
                  </div>

                  {(log?.note || targetIdentity.meta !== "--") && (
                    <div className="flex flex-col gap-3 md:flex-row">
                      {targetIdentity.meta !== "--" && (
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Linked record
                          </span>
                          <p className="mt-1 break-all text-slate-700">{targetIdentity.meta}</p>
                        </div>
                      )}

                      {log?.note && (
                        <div className="flex-1 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Moderator note
                          </span>
                          <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">
                            {String(log.note)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className={`${surfaceClass} bg-gradient-to-br from-white via-white to-emerald-50/30`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-slate-950">
                  Change details
                </CardTitle>
                
              </CardHeader>

              <CardContent>
                {hasEvidence ? (
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
                    </TabsContent>
                  </Tabs>
                ) : hasDiff ? (
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
              </CardContent>
            </Card>
          </div>

          <Card className={`${surfaceClass} lg:sticky lg:top-4 lg:self-start`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-950">
                Review actions
              </CardTitle>
              <p className="text-sm leading-6 text-slate-500">
                Confirm the actor, add an admin note if needed, then complete the review action.
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

              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-900">Admin note</p>

                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  disabled={loading || !canEditAdminNote}
                  className="min-h-[132px] rounded-xl border-slate-200 bg-white/80 text-sm text-slate-700"
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
                    ? "This note is locked after approval."
                    : "This note is submitted together with Approve."}
                </p>
              </div>

              <Separator className="bg-slate-200/80" />

              <div className="space-y-4">
                <div className="space-y-2">
                  {!log.seen && (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
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
                </div>

                <div className="space-y-2 border-t border-slate-200/80 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Utilities
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    onClick={fetchLog}
                    disabled={loading}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh record
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
