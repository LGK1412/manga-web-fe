"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock3,
  FileText,
  MessageSquare,
  Save,
  ShieldAlert,
  XCircle,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  formatRoleLabel,
  getRoleColor,
  getRoleIcon,
} from "@/components/admin/users/user-management.utils"

interface Report {
  _id: string
  reportCode?: string
  reporter_id?: {
    username: string
    email: string
    role?: string
    avatar?: string
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
    content?: string
    target_human?: {
      username?: string
      email?: string
      avatar?: string
    }
  }
  reason: string
  description?: string
  status: string
  createdAt?: string
  updatedAt?: string
  resolution_note?: string
}

interface ReportModalProps {
  open: boolean
  report: Report | null
  loading: boolean
  onClose: () => void
  onUpdateStatus: (id: string, newStatus?: string, note?: string) => void
  statusColor: (status: string) => string
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

function getInitial(value?: string) {
  return value?.trim()?.charAt(0)?.toUpperCase() || "U"
}

function isAbsoluteUrl(value: string) {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:")
}

function resolveAvatarUrl(rawAvatar?: string, apiUrl?: string) {
  if (!rawAvatar) return undefined
  if (isAbsoluteUrl(rawAvatar)) return rawAvatar
  if (!apiUrl) return undefined

  const normalizedApi = apiUrl.replace(/\/+$/, "")
  const normalizedAvatar = rawAvatar.replace(/^\/+/, "")
  return `${normalizedApi}/assets/avatars/${normalizedAvatar}`
}

function escapePlainText(content: string) {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />")
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

function normalizeReportHtml(content: string, apiUrl?: string) {
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

function sanitizeReportHtml(content: string, apiUrl?: string) {
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
  const doc = parser.parseFromString(`<div>${normalizeReportHtml(content, apiUrl)}</div>`, "text/html")
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
      cleanElement.setAttribute("alt", element.getAttribute("alt") || "report-media")
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

function getReasonMeta(reason: string) {
  const normalized = String(reason || "").toLowerCase()

  if (normalized === "harassment" || normalized === "inappropriate") {
    return {
      summary: "High-priority safety review",
      className: "border-red-200 bg-red-50 text-red-700",
      icon: AlertTriangle,
    }
  }

  if (normalized === "copyright" || normalized === "offense") {
    return {
      summary: "Needs policy validation",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: ShieldAlert,
    }
  }

  if (normalized === "spam") {
    return {
      summary: "Queue quality review",
      className: "border-sky-200 bg-sky-50 text-sky-700",
      icon: MessageSquare,
    }
  }

  return {
    summary: "General moderation review",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: FileText,
  }
}

function targetTypeBadge(type: string) {
  switch (type) {
    case "Manga":
      return (
        <Badge className="flex items-center gap-1 bg-violet-100 text-violet-800">
          <BookOpen className="h-3.5 w-3.5" />
          Manga
        </Badge>
      )
    case "Chapter":
      return (
        <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800">
          <FileText className="h-3.5 w-3.5" />
          Chapter
        </Badge>
      )
    case "Comment":
      return (
        <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
          <MessageSquare className="h-3.5 w-3.5" />
          Comment
        </Badge>
      )
    case "Reply":
      return (
        <Badge className="flex items-center gap-1 bg-emerald-100 text-emerald-800">
          <MessageSquare className="h-3.5 w-3.5" />
          Reply
        </Badge>
      )
    default:
      return <Badge className="bg-slate-100 text-slate-700">{type}</Badge>
  }
}

export default function ReportModal({
  open,
  report,
  loading,
  onClose,
  onUpdateStatus,
  statusColor,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ReportModalProps) {
  const API = process.env.NEXT_PUBLIC_API_URL
  const [note, setNote] = useState("")
  const [renderedTargetContent, setRenderedTargetContent] = useState("")

  useEffect(() => {
    setNote(report?.resolution_note ?? "")
  }, [report])

  useEffect(() => {
    const content = report?.target_detail?.content || report?.target_id?.content
    if (!content) {
      setRenderedTargetContent("")
      return
    }

    setRenderedTargetContent(sanitizeReportHtml(content, API))
  }, [API, report?.target_detail?.content, report?.target_id?.content])

  if (!report) return null

  const reporterAvatar = resolveAvatarUrl(report.reporter_id?.avatar, API)
  const reportedAgainstName =
    report.target_detail?.target_human?.username ||
    report.target_id?.authorId?.username ||
    report.target_id?.user?.username ||
    "Unknown user"
  const reportedAgainstEmail =
    report.target_detail?.target_human?.email ||
    report.target_id?.authorId?.email ||
    report.target_id?.user?.email ||
    "No email"
  const reportedAgainstAvatar = resolveAvatarUrl(
    report.target_detail?.target_human?.avatar,
    API
  )
  const targetTitle = report.target_detail?.title || report.target_id?.title
  const reasonMeta = getReasonMeta(report.reason)
  const ReasonIcon = reasonMeta.icon
  const targetContextLabel =
    report.target_type === "Chapter" && targetTitle
      ? `Chapter: ${targetTitle}`
      : report.target_type === "Manga" && targetTitle
        ? `Manga: ${targetTitle}`
        : report.target_type === "Comment" || report.target_type === "Reply"
          ? (reportedAgainstName ? `${report.target_type} by ${reportedAgainstName}` : report.target_type)
          : targetTitle || `${report.target_type} target`
  const targetPreviewLabel =
    report.target_type === "Comment" || report.target_type === "Reply"
      ? `${report.target_type} preview`
      : "Target preview"

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A"
    return new Date(isoString).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
    })
  }

  const handleUpdateStatus = (newStatus?: string) => {
    onUpdateStatus(report._id, newStatus, note)
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden border-l border-slate-200 bg-slate-50 p-0 shadow-2xl sm:max-w-xl sm:rounded-l-[28px] lg:max-w-[760px] xl:max-w-[860px]"
      >
        <SheetHeader className="border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50/90 px-6 py-6 sm:rounded-tl-[28px]">
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <SheetTitle className="text-[1.15rem] tracking-tight text-slate-900">
                Report Review Panel
              </SheetTitle>
              <SheetDescription className="max-w-2xl text-slate-500">
                Review the report, inspect the captured target context, and update
                moderation progress without leaving the queue.
              </SheetDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="border border-slate-200 bg-white text-slate-700"
              >
                {report.reportCode || "Report"}
              </Badge>
              <Badge className={statusColor(report.status)}>{report.status}</Badge>
              {targetTypeBadge(report.target_type)}
              <Badge
                variant="secondary"
                className={`inline-flex items-center gap-1 border ${reasonMeta.className}`}
              >
                <ReasonIcon className="h-3.5 w-3.5" />
                {report.reason}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/80 px-6 py-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Reporter</p>
              <div className="mt-3 flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-slate-200 shadow-sm">
                  <AvatarImage
                    src={reporterAvatar}
                    alt={report.reporter_id?.username || "Reporter"}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback>
                    {getInitial(report.reporter_id?.username)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">
                    {report.reporter_id?.username || "Unknown reporter"}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {report.reporter_id?.email || "No email"}
                  </div>
                  {report.reporter_id?.role ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className={`inline-flex items-center gap-1 border ${getRoleColor(
                          report.reporter_id.role
                        )}`}
                      >
                        {getRoleIcon(report.reporter_id.role)}
                        {formatRoleLabel(report.reporter_id.role)}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Reported Against</p>
              <div className="mt-3 flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-slate-200 shadow-sm">
                  <AvatarImage
                    src={reportedAgainstAvatar}
                    alt={reportedAgainstName}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback>{getInitial(reportedAgainstName)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">
                    {reportedAgainstName}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {reportedAgainstEmail}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Triage</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                <ReasonIcon className="h-4 w-4" />
                {reasonMeta.summary}
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Created</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock3 className="h-4 w-4 text-slate-500" />
                {formatDate(report.createdAt)}
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Last Updated</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock3 className="h-4 w-4 text-slate-500" />
                {formatDate(report.updatedAt)}
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{targetPreviewLabel}</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {targetContextLabel}
                </h3>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                {report.target_type === "Manga" ? (
                  <BookOpen className="h-4 w-4" />
                ) : report.target_type === "Comment" ||
                  report.target_type === "Reply" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {report.target_type}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Target owner
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {reportedAgainstName}
                </p>
                <p className="mt-1 text-xs text-slate-500">{reportedAgainstEmail}</p>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Source context
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {targetTitle
                    ? targetTitle
                    : "This report currently carries metadata only."}
                </p>
              </div>
            </div>

            {renderedTargetContent ? (
              <div
                className="prose prose-sm mt-4 max-w-none rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-slate-700 prose-p:leading-7 prose-img:inline-block prose-img:max-w-10 prose-img:align-middle"
                dangerouslySetInnerHTML={{ __html: renderedTargetContent }}
              />
            ) : (
              <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No content snapshot was stored with this report.
              </div>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Reporter note</p>
              <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                {report.description || "No additional description was provided."}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Admin Notes</p>
              </div>
              <Textarea
                placeholder="Note the moderation progress, follow-up, or resolution details..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={7}
                className="mt-4 rounded-[18px] border-slate-200 bg-slate-50"
              />
              <p className="mt-2 text-xs text-slate-500">
                Save a working note first, then move the report to the right review state.
              </p>
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:rounded-bl-[28px]">
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200"
                onClick={onPrevious}
                disabled={!hasPrevious}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200"
                onClick={onNext}
                disabled={!hasNext}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200"
                onClick={() => handleUpdateStatus(undefined)}
                disabled={loading}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Note
              </Button>

              <Button
                variant="outline"
                className="rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
                onClick={() => handleUpdateStatus("in-progress")}
                disabled={loading || report.status === "in-progress"}
              >
                <Clock3 className="mr-2 h-4 w-4" />
                Mark In Progress
              </Button>

              <Button
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => handleUpdateStatus("resolved")}
                disabled={loading || report.status === "resolved"}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Resolve
              </Button>

              <Button
                variant="outline"
                className="rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                onClick={() => handleUpdateStatus("rejected")}
                disabled={loading || report.status === "rejected"}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
