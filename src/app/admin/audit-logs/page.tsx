"use client"

// src/app/admin/audit-logs/page.tsx

import AdminLayout from "@/app/admin/adminLayout/page"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
  FileText,
  EyeOff,
  Clock,
  AlertTriangle,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

import {
  AuditApproval,
  AuditRisk,
  buildHumanMessage,
  prettyAction,
  prettyRole,
  resolveAuditActorAvatar,
} from "@/lib/audit-ui"

type Me = {
  userId: string
  email: string
  role: string
}

type AuditLogUI = {
  id: string
  time: string

  actor: {
    name: string
    email: string
    role: string
    avatar?: string
  }

  action: string
  summary: string
  risk: AuditRisk
  seen: boolean
  approval: AuditApproval

  // keep for internal use only if needed (do not render)
  targetType?: string
  targetId?: string

  before?: Record<string, any>
  after?: Record<string, any>
  note?: string
  evidenceImages?: string[]
  adminNote?: string
}

type AuditSummary = {
  total: number
  unseen: number
  pendingApproval: number
  highRisk: number
}

/** ===== Helpers ===== */
function formatTime(iso?: string) {
  if (!iso) return "--"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString("vi-VN", { hour12: false })
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const surfaceClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur"
const insetSurfaceClass = "rounded-xl border border-slate-200/70 bg-slate-50/80"
const emptySummary: AuditSummary = {
  total: 0,
  unseen: 0,
  pendingApproval: 0,
  highRisk: 0,
}

/** ✅ mapping BE -> FE UI (clean) */
function mapAuditRowToUI(row: any): AuditLogUI {
  const actorUsername =
    row?.actor_id?.username || row?.actor_name || row?.actorUsername || "Unknown"
  const actorEmail =
    row?.actor_id?.email || row?.actor_email || row?.actorEmail || "No email"
  const actorRole = row?.actor_role || row?.actor_id?.role || "system"

  return {
    id: String(row?._id ?? row?.id ?? ""),
    time: formatTime(row?.createdAt),

    actor: {
      name: actorUsername,
      email: actorEmail,
      role: String(actorRole),
      avatar: row?.actor_id?.avatar || row?.actor_avatar || row?.actorAvatar,
    },

    action: String(row?.action ?? "unknown"),
    // ✅ build human message (no code)
    summary: buildHumanMessage(row),

    risk: (row?.risk ?? "low") as AuditRisk,
    seen: Boolean(row?.seen),
    approval: (row?.approval ?? "pending") as AuditApproval,

    // keep but do not render in UI
    targetType: row?.target_type ? String(row.target_type) : undefined,
    targetId: row?.target_id ? String(row.target_id) : undefined,

    before: row?.before,
    after: row?.after,
    note: row?.note,
    evidenceImages: row?.evidenceImages ?? [],
    adminNote: row?.adminNote,
  }
}

async function readBlobErrorMessage(err: any) {
  const fallback =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Unable to export audit logs."

  const blob = err?.response?.data
  if (!(blob instanceof Blob)) return fallback

  try {
    const text = await blob.text()
    const parsed = JSON.parse(text)
    return parsed?.message || parsed?.error || fallback
  } catch {
    return fallback
  }
}

export default function AuditLogsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL
  const router = useRouter()
  const defaultCustomTo = formatDateInput(new Date())
  const defaultCustomFrom = formatDateInput(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  )

  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const roleNormalized = useMemo(() => String(me?.role || "").toLowerCase(), [me?.role])
  const isAdmin = useMemo(() => roleNormalized === "admin", [roleNormalized])
  const canAttemptAdminActions = useMemo(
    () => isAdmin || Boolean(meError),
    [isAdmin, meError],
  )

  const [logs, setLogs] = useState<AuditLogUI[]>([])
  const [summary, setSummary] = useState<AuditSummary>(emptySummary)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("7days")
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom)
  const [customTo, setCustomTo] = useState(defaultCustomTo)
  const [highRiskOnly, setHighRiskOnly] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [totalPages, setTotalPages] = useState(1)
  const [totalRows, setTotalRows] = useState(0)

  // ✅ fetch me (role)
  useEffect(() => {
    if (!API) return
    axios
      .get(`${API}/api/auth/me`, { withCredentials: true })
      .then((res) => {
        setMe(res.data)
        setMeError(null)
      })
      .catch((err: any) => {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to verify current role."
        setMe(null)
        setMeError(msg)
      })
  }, [API])

  /** ✅ Fetch from BE */
  const hasCustomRange = dateFilter === "custom"
  const isCustomRangeInvalid =
    hasCustomRange && Boolean(customFrom) && Boolean(customTo) && customFrom > customTo

  const buildListParams = () => ({
    search: debouncedSearch || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    risk: highRiskOnly ? "high" : undefined,
    dateRange:
      dateFilter !== "all" && dateFilter !== "custom" ? dateFilter : undefined,
    from: hasCustomRange && customFrom ? customFrom : undefined,
    to: hasCustomRange && customTo ? customTo : undefined,
  })

  const fetchLogs = async () => {
    if (!API) {
      setListError("Missing NEXT_PUBLIC_API_URL.")
      setLogs([])
      setSummary(emptySummary)
      setTotalPages(1)
      setTotalRows(0)
      return
    }

    if (isCustomRangeInvalid) {
      setListError("Start date must be on or before end date.")
      setLogs([])
      setSummary(emptySummary)
      setTotalPages(1)
      setTotalRows(0)
      return
    }

    const endpoint = `${API}/api/audit-logs`
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
      ...buildListParams(),
    }

    setLoading(true)
    try {
      const res = await axios.get(endpoint, { params, withCredentials: true })
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : []
      const nextSummary = res.data?.summary ?? emptySummary
      setListError(null)
      setLogs(rows.map(mapAuditRowToUI))
      setSummary({
        total: Number(nextSummary.total ?? 0),
        unseen: Number(nextSummary.unseen ?? 0),
        pendingApproval: Number(nextSummary.pendingApproval ?? 0),
        highRisk: Number(nextSummary.highRisk ?? 0),
      })

      setTotalPages(res.data?.totalPages ?? 1)
      setTotalRows(Number(res.data?.total ?? nextSummary.total ?? rows.length))
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load audit logs."
      console.error("[AuditLogs] FETCH ERROR", err?.response?.data || err?.message)
      setListError(msg)
      setLogs([])
      setSummary(emptySummary)
      setTotalPages(1)
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }

  /** ✅ auto fetch when filters/page changed */
  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    API,
    currentPage,
    roleFilter,
    actionFilter,
    statusFilter,
    highRiskOnly,
    dateFilter,
    customFrom,
    customTo,
    debouncedSearch,
  ])

  /** ✅ fetch on search with debounce */
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1)
      setDebouncedSearch(search.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  /** ===== Stats ===== */
  const stats = useMemo(() => {
    return summary
  }, [summary])

  const summaryCards = [
    {
      title: "Total logs",
      value: stats.total,
      helper: "Matching filters",
      icon: FileText,
      iconClass: "bg-slate-100 text-slate-700",
    },
    {
      title: "Unseen logs",
      value: stats.unseen,
      helper: "Matching filters",
      icon: EyeOff,
      iconClass: "bg-orange-100 text-orange-700",
    },
    {
      title: "Pending approval",
      value: stats.pendingApproval,
      helper: "Matching filters",
      icon: Clock,
      iconClass: "bg-violet-100 text-violet-700",
    },
    {
      title: "High risk",
      value: stats.highRisk,
      helper: "Matching filters",
      icon: AlertTriangle,
      iconClass: "bg-rose-100 text-rose-700",
    },
  ]

  /** ✅ Actions (admin-only) */
  const handleMarkAllSeen = async () => {
    if (!API) return
    if (!canAttemptAdminActions) {
      toast.error("Admin only")
      return
    }
    if (isCustomRangeInvalid) {
      toast.error("Start date must be on or before end date.")
      return
    }
    if (summary.unseen === 0) {
      toast.error("No unseen logs match the current filters.")
      return
    }

    const endpoint = `${API}/api/audit-logs/seen-all`
    try {
      setLoading(true)
      const res = await axios.patch(endpoint, {}, {
        params: buildListParams(),
        withCredentials: true,
      })
      await fetchLogs()
      const updatedCount = Number(res.data?.updated ?? 0)
      toast.success(
        updatedCount > 0
          ? `Marked ${updatedCount} matching log(s) as seen.`
          : "No unseen logs matched the current filters.",
      )
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to mark all logs as seen."
      console.error("[AuditLogs] markAllSeen error", err?.response?.data || err?.message)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkSeen = async (logId: string) => {
    if (!API) return
    if (!canAttemptAdminActions) {
      toast.error("Admin only")
      return
    }

    const endpoint = `${API}/api/audit-logs/${logId}/seen`
    try {
      setLoading(true)
      await axios.patch(endpoint, {}, { withCredentials: true })
      await fetchLogs()
      toast.success("Log marked as seen.")
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to mark this log as seen."
      console.error("[AuditLogs] markSeen error", err?.response?.data || err?.message)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (logId: string) => {
    if (!API) return
    if (!canAttemptAdminActions) {
      toast.error("Admin only")
      return
    }

    const endpoint = `${API}/api/audit-logs/${logId}/approve`
    try {
      setLoading(true)
      await axios.patch(endpoint, { adminNote: "" }, { withCredentials: true })
      await fetchLogs()
      toast.success("Log approved.")
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to approve this log."
      console.error("[AuditLogs] approve error", err?.response?.data || err?.message)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  /** ✅ CSV: bỏ technical columns */
  const handleExportCSV = async () => {
    if (!API) return
    if (isCustomRangeInvalid) {
      toast.error("Start date must be on or before end date.")
      return
    }
    if (summary.total === 0) {
      toast.error("No logs match the current filters.")
      return
    }

    try {
      const res = await axios.get(`${API}/api/audit-logs/export`, {
        params: buildListParams(),
        withCredentials: true,
        responseType: "blob",
      })

      const disposition = String(res.headers["content-disposition"] || "")
      const filenameMatch = disposition.match(/filename=\"?([^\"]+)\"?/i)
      const filename = filenameMatch?.[1] || "audit-logs-filtered.csv"
      const blob =
        res.data instanceof Blob ? res.data : new Blob([res.data], { type: "text/csv" })

      if (blob.size === 0) {
        toast.error("No logs match the current filters.")
        return
      }

      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      anchor.click()
      window.URL.revokeObjectURL(url)
      toast.success("Filtered audit logs exported to CSV.")
    } catch (err: any) {
      const msg = await readBlobErrorMessage(err)
      toast.error(msg)
    }
  }

  const getRoleColor = (role: string) => {
    switch (String(role || "").toLowerCase()) {
      case "system":
        return "border-slate-200 bg-slate-100 text-slate-700"
      case "content_moderator":
        return "border-blue-200 bg-blue-100 text-blue-800"
      case "community_manager":
        return "border-purple-200 bg-purple-100 text-purple-800"
      case "admin":
        return "border-emerald-200 bg-emerald-100 text-emerald-800"
      default:
        return "border-slate-200 bg-slate-100 text-slate-700"
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "approve":
      case "report_status_resolved":
        return "border border-emerald-200 bg-emerald-50 text-emerald-700"
      case "reject":
      case "report_status_rejected":
        return "border border-rose-200 bg-rose-50 text-rose-700"
      case "hide_content":
        return "border border-orange-200 bg-orange-50 text-orange-700"

      case "comment_hidden":
      case "reply_hidden":
        return "border border-orange-200 bg-orange-50 text-orange-700"
      case "comment_restored":
      case "reply_restored":
        return "border border-emerald-200 bg-emerald-50 text-emerald-700"

      case "delete_comment":
        return "border border-rose-200 bg-rose-50 text-rose-700"
      case "warn_user":
        return "border border-amber-200 bg-amber-50 text-amber-700"
      case "mute_user":
        return "border border-blue-200 bg-blue-50 text-blue-700"
      case "ban_user":
        return "border border-rose-200 bg-rose-50 text-rose-700"
      case "admin_reset_user_status":
        return "border border-emerald-200 bg-emerald-50 text-emerald-700"
      case "admin_update_staff_status":
        return "border border-indigo-200 bg-indigo-50 text-indigo-700"
      case "admin_set_role":
        return "border border-violet-200 bg-violet-50 text-violet-700"
      case "request_changes":
        return "border border-violet-200 bg-violet-50 text-violet-700"
      case "auto_reject":
        return "border border-rose-200 bg-rose-50 text-rose-700"
      default:
        return "border border-slate-200 bg-slate-100 text-slate-700"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-50 text-green-700 border border-green-200"
      case "medium":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200"
      case "high":
        return "bg-red-50 text-red-700 border border-red-200"
      default:
        return "bg-gray-50 text-gray-700"
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <Card className={surfaceClass}>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
                  Audit operations
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{totalRows} matching logs</span>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Review moderator activity, export the active filter set, and clear unseen
                records without leaving the workspace.
              </p>

              {meError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800">
                  Role verification from `/api/auth/me` is temporarily unavailable. You can
                  still try actions here and let the backend validate permission.
                </div>
              ) : !isAdmin ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs leading-5 text-slate-600">
                  Reviewing as{" "}
                  <b className="font-semibold text-slate-900">
                    {prettyRole(me?.role ?? "unknown")}
                  </b>
                  . Approve and seen actions remain admin-only.
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                onClick={handleMarkAllSeen}
                disabled={loading || !canAttemptAdminActions}
                title={!canAttemptAdminActions ? "Admin only" : ""}
              >
                Mark matching as seen
              </Button>

              <Button
                variant="outline"
                className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                onClick={handleExportCSV}
                disabled={loading}
              >
                <Download className="mr-2 h-4 w-4" />
                Export filtered CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.title} className={surfaceClass}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.title}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                      {item.value}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                  </div>

                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <Card className={surfaceClass}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-950">Refine results</CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Filters run server-side and also drive the CSV export so the table and download stay aligned.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-col lg:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Search by actor, email, or message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={roleFilter} onValueChange={(v) => (setRoleFilter(v), setCurrentPage(1))}>
                <SelectTrigger className="border-slate-200 bg-white/80 text-slate-700">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="content_moderator">Content Moderator</SelectItem>
                  <SelectItem value="community_manager">Community Manager</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={(v) => (setActionFilter(v), setCurrentPage(1))}>
                <SelectTrigger className="border-slate-200 bg-white/80 text-slate-700">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>

                  {/* report */}
                  <SelectItem value="report_status_new">Report - Status set to New</SelectItem>
                  <SelectItem value="report_status_in-progress">Report - Status set to In Progress</SelectItem>
                  <SelectItem value="report_status_resolved">Report - Resolved</SelectItem>
                  <SelectItem value="report_status_rejected">Report - Rejected</SelectItem>
                  <SelectItem value="report_update">Report - Updated</SelectItem>

                  {/* comment/reply */}
                  <SelectItem value="comment_hidden">Comment - Hidden</SelectItem>
                  <SelectItem value="comment_restored">Comment - Restored</SelectItem>
                  <SelectItem value="reply_hidden">Reply - Hidden</SelectItem>
                  <SelectItem value="reply_restored">Reply - Restored</SelectItem>
                  <SelectItem value="mute_user">User - Muted</SelectItem>
                  <SelectItem value="ban_user">User - Banned</SelectItem>
                  <SelectItem value="admin_reset_user_status">User - Reset Status</SelectItem>
                  <SelectItem value="admin_update_staff_status">Staff - Status Updated</SelectItem>
                  <SelectItem value="admin_set_role">User - Role Updated</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => (setStatusFilter(v), setCurrentPage(1))}>
                <SelectTrigger className="border-slate-200 bg-white/80 text-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unseen">Unseen</SelectItem>
                  <SelectItem value="seen">Seen</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(v) => (setDateFilter(v), setCurrentPage(1))}>
                <SelectTrigger className="border-slate-200 bg-white/80 text-slate-700">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              <div className={`flex items-center space-x-2 px-3 py-2 ${insetSurfaceClass}`}>
                <Switch
                  checked={highRiskOnly}
                  onCheckedChange={(v) => {
                    setHighRiskOnly(v)
                    setCurrentPage(1)
                  }}
                />
                <span className="text-sm text-slate-700">High Risk Only</span>
              </div>
            </div>

            {hasCustomRange && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    From
                  </label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(event) => {
                      setCustomFrom(event.target.value)
                      setCurrentPage(1)
                    }}
                    className="border-slate-200 bg-white/80 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    To
                  </label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(event) => {
                      setCustomTo(event.target.value)
                      setCurrentPage(1)
                    }}
                    className="border-slate-200 bg-white/80 text-slate-700"
                  />
                </div>
              </div>
            )}

            {hasCustomRange && isCustomRangeInvalid && (
              <p className="text-xs text-rose-700">
                Start date must be on or before end date.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className={`${surfaceClass} overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-slate-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Activity records</p>
              <p className="text-sm leading-6 text-slate-500">
                Newest actions first. Open a record to inspect evidence, notes, and approval state.
              </p>
            </div>

            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {loading ? "Refreshing..." : `${totalRows} matching logs`}
            </div>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Time</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Actor</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Event</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Message</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Risk</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Approval</TableHead>
                    <TableHead className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Review</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : listError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div>
                            <p className="text-sm font-semibold text-rose-700">
                              Unable to load audit logs
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{listError}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            onClick={fetchLogs}
                          >
                            Retry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                        No logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className={`transition-colors hover:bg-slate-50/70 ${!log.seen ? "bg-blue-50/40" : ""} ${
                          log.risk === "high" ? "border-l-4 border-l-rose-500" : ""
                        }`}
                      >
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">
                          {log.time}
                        </TableCell>

                        <TableCell className="min-w-[280px]">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 border border-slate-200">
                              <AvatarImage
                                src={resolveAuditActorAvatar(log.actor.avatar, API)}
                                alt={log.actor.name}
                                referrerPolicy="no-referrer"
                              />
                              <AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-700">
                                {log.actor.name
                                  .split(" ")
                                  .filter(Boolean)
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {log.actor.name}
                              </p>
                              <p className="truncate text-sm text-slate-500">
                                {log.actor.email}
                              </p>
                              <Badge
                                variant="secondary"
                                className={`mt-1.5 border ${getRoleColor(log.actor.role)}`}
                              >
                                {prettyRole(log.actor.role)}
                              </Badge>

                              {/* ✅ removed target id/type from UI */}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`pointer-events-none text-xs ${getActionColor(log.action)}`}
                          >
                            {prettyAction(log.action)}
                          </Badge>
                        </TableCell>

                        <TableCell className="max-w-xs text-xs text-slate-600">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate">{log.summary}</span>
                              </TooltipTrigger>
                              <TooltipContent>{log.summary}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getRiskColor(log.risk)}`}>
                            {log.risk === "high" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {log.risk}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {!log.seen ? (
                            <Badge
                              variant="outline"
                              className="border border-orange-200 bg-orange-50 text-orange-700"
                            >
                              NEW
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-500">Seen</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              log.approval === "approved"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {log.approval}
                          </Badge>
                        </TableCell>

                        {/* ✅ Actions */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
                              onClick={() => router.push(`/admin/audit-logs/log-details/${log.id}`)}
                              title="Open details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {!log.seen && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                                onClick={() => handleMarkSeen(log.id)}
                                disabled={loading || !canAttemptAdminActions}
                                title={!canAttemptAdminActions ? "Admin only" : "Mark as seen"}
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            )}

                            {log.approval === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                                onClick={() => handleApprove(log.id)}
                                disabled={loading || !canAttemptAdminActions}
                                title={!canAttemptAdminActions ? "Admin only" : "Approve record"}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200/70 p-4">
              <div className="text-sm text-slate-600">
                Page {currentPage} / {totalPages} - Total {totalRows} logs
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  disabled={currentPage === totalPages || loading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
