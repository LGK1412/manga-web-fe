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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  AuditApproval,
  AuditRisk,
  buildHumanMessage,
  prettyAction,
  prettyRole,
} from "@/lib/audit-ui"

type Me = {
  userId: string
  email: string
  role: string
}

type AuditLogUI = {
  id: string
  time: string
  reportCode?: string

  actor: {
    name: string
    email: string
    role: string
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

/** ===== Helpers ===== */
function formatTime(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString("vi-VN", { hour12: false })
}

function safeStr(x: any) {
  return x === null || x === undefined ? "" : String(x)
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

    reportCode: row?.reportCode,

    actor: {
      name: actorUsername,
      email: actorEmail,
      role: String(actorRole),
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

export default function AuditLogsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL
  const router = useRouter()

  const [me, setMe] = useState<Me | null>(null)
  const roleNormalized = useMemo(() => String(me?.role || "").toLowerCase(), [me?.role])
  const isAdmin = useMemo(() => roleNormalized === "admin", [roleNormalized])

  const [logs, setLogs] = useState<AuditLogUI[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("7days") // UI only
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
      .then((res) => setMe(res.data))
      .catch(() => setMe(null))
  }, [API])

  /** ✅ Fetch from BE */
  const fetchLogs = async () => {
    if (!API) return

    const endpoint = `${API}/api/audit-logs`
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
      search: search?.trim() || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      risk: highRiskOnly ? "high" : undefined,
      // dateFilter: UI only
    }

    setLoading(true)
    try {
      const res = await axios.get(endpoint, { params, withCredentials: true })
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : []
      setLogs(rows.map(mapAuditRowToUI))

      setTotalPages(res.data?.totalPages ?? 1)
      setTotalRows(res.data?.total ?? rows.length)
    } catch (err: any) {
      console.error("[AuditLogs] FETCH ERROR", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  /** ✅ auto fetch when filters/page changed */
  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, currentPage, roleFilter, actionFilter, statusFilter, highRiskOnly])

  /** ✅ fetch on search with debounce */
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1)
      fetchLogs()
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  /** ===== Stats ===== */
  const stats = useMemo(() => {
    return {
      total: totalRows,
      unseen: logs.filter((l) => !l.seen).length,
      pendingApproval: logs.filter((l) => l.approval === "pending").length,
      highRisk: logs.filter((l) => l.risk === "high").length,
    }
  }, [logs, totalRows])

  /** ✅ Actions (admin-only) */
  const handleMarkAllSeen = async () => {
    if (!API) return
    if (!isAdmin) return

    const endpoint = `${API}/api/audit-logs/seen-all`
    try {
      setLoading(true)
      await axios.patch(endpoint, {}, { withCredentials: true })
      await fetchLogs()
    } catch (err: any) {
      console.error("[AuditLogs] markAllSeen error", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkSeen = async (logId: string) => {
    if (!API) return
    if (!isAdmin) return

    const endpoint = `${API}/api/audit-logs/${logId}/seen`
    try {
      setLoading(true)
      await axios.patch(endpoint, {}, { withCredentials: true })
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, seen: true } : l)))
    } catch (err: any) {
      console.error("[AuditLogs] markSeen error", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (logId: string) => {
    if (!API) return
    if (!isAdmin) return

    const endpoint = `${API}/api/audit-logs/${logId}/approve`
    try {
      setLoading(true)
      await axios.patch(endpoint, { adminNote: "" }, { withCredentials: true })
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, approval: "approved" } : l)))
    } catch (err: any) {
      console.error("[AuditLogs] approve error", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  /** ✅ CSV: bỏ technical columns */
  const handleExportCSV = () => {
    const headers = [
      "Time",
      "ReportCode",
      "Actor",
      "Email",
      "Role",
      "Action",
      "Message",
      "Risk",
      "Seen",
      "Approval",
    ]

    const rows = logs.map((log) => [
      log.time,
      safeStr(log.reportCode),
      log.actor.name,
      log.actor.email,
      prettyRole(log.actor.role),
      prettyAction(log.action),
      log.summary,
      log.risk,
      log.seen ? "Yes" : "No",
      log.approval,
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${safeStr(cell)}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "audit-logs.csv"
    a.click()
  }

  const getRoleColor = (role: string) => {
    switch (String(role || "").toLowerCase()) {
      case "system":
        return "bg-gray-100 text-gray-800"
      case "content_moderator":
        return "bg-blue-100 text-blue-800"
      case "community_manager":
        return "bg-purple-100 text-purple-800"
      case "admin":
        return "bg-emerald-100 text-emerald-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "approve":
      case "report_status_resolved":
        return "bg-green-100 text-green-800"
      case "reject":
      case "report_status_rejected":
        return "bg-red-100 text-red-800"
      case "hide_content":
        return "bg-orange-100 text-orange-800"

      case "comment_hidden":
      case "reply_hidden":
        return "bg-orange-100 text-orange-800"
      case "comment_restored":
      case "reply_restored":
        return "bg-green-100 text-green-800"

      case "delete_comment":
        return "bg-red-100 text-red-800"
      case "warn_user":
        return "bg-yellow-100 text-yellow-800"
      case "mute_user":
        return "bg-blue-100 text-blue-800"
      case "ban_user":
        return "bg-red-100 text-red-800"
      case "request_changes":
        return "bg-purple-100 text-purple-800"
      case "auto_reject":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              Admin / <span className="text-gray-700">Audit Logs</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Audit Logs</h1>
            <p className="text-sm text-gray-600 mt-1">Track moderator actions and approvals</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleMarkAllSeen}
              disabled={loading || !isAdmin}
              title={!isAdmin ? "Admin only" : ""}
            >
              Mark all as seen
            </Button>

            <Button variant="outline" onClick={handleExportCSV} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {!isAdmin && (
          <p className="text-xs text-gray-500">
            You are logged in as <b>{prettyRole(me?.role ?? "unknown")}</b>. Approve/Seen actions are admin-only.
          </p>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Total Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500">Server-side count</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-orange-600" />
                Unseen Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unseen}</div>
              <p className="text-xs text-gray-500">Current list</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApproval}</div>
              <p className="text-xs text-gray-500">Current list</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                High Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highRisk}</div>
              <p className="text-xs text-gray-500">Current list</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-col lg:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Search by actor, email, report code, message…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={roleFilter} onValueChange={(v) => (setRoleFilter(v), setCurrentPage(1))}>
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>

                  {/* report */}
                  <SelectItem value="report_status_new">Report · Status set to New</SelectItem>
                  <SelectItem value="report_status_in-progress">Report · Status set to In Progress</SelectItem>
                  <SelectItem value="report_status_resolved">Report · Resolved</SelectItem>
                  <SelectItem value="report_status_rejected">Report · Rejected</SelectItem>
                  <SelectItem value="report_update">Report · Updated</SelectItem>

                  {/* comment/reply */}
                  <SelectItem value="comment_hidden">Comment · Hidden</SelectItem>
                  <SelectItem value="comment_restored">Comment · Restored</SelectItem>
                  <SelectItem value="reply_hidden">Reply · Hidden</SelectItem>
                  <SelectItem value="reply_restored">Reply · Restored</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => (setStatusFilter(v), setCurrentPage(1))}>
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2 px-3 py-2 border rounded-md bg-white">
                <Switch
                  checked={highRiskOnly}
                  onCheckedChange={(v) => {
                    setHighRiskOnly(v)
                    setCurrentPage(1)
                  }}
                />
                <span className="text-sm text-gray-700">High Risk Only</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Time</TableHead>
                    <TableHead className="text-xs font-semibold">Report Code</TableHead>
                    <TableHead className="text-xs font-semibold">Actor</TableHead>
                    <TableHead className="text-xs font-semibold">Action</TableHead>
                    <TableHead className="text-xs font-semibold">Message</TableHead>
                    <TableHead className="text-xs font-semibold">Risk</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Approval</TableHead>
                    <TableHead className="text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-sm text-gray-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-sm text-gray-500">
                        No logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className={`${!log.seen ? "bg-blue-50" : ""} ${
                          log.risk === "high" ? "border-l-4 border-l-red-500" : ""
                        }`}
                      >
                        <TableCell className="text-xs whitespace-nowrap">{log.time}</TableCell>

                        <TableCell className="text-xs font-mono">{log.reportCode ?? "—"}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {log.actor.name
                                  .split(" ")
                                  .filter(Boolean)
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>

                            <div className="text-xs">
                              <p className="font-medium">{log.actor.name}</p>
                              <p className="text-gray-500">{log.actor.email}</p>
                              <Badge
                                variant="outline"
                                className={`text-xs mt-1 ${getRoleColor(log.actor.role)}`}
                              >
                                {prettyRole(log.actor.role)}
                              </Badge>

                              {/* ✅ removed target id/type from UI */}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={`text-xs ${getActionColor(log.action)}`}>
                            {prettyAction(log.action)}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs max-w-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block">{log.summary}</span>
                              </TooltipTrigger>
                              <TooltipContent>{log.summary}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        <TableCell>
                          <Badge className={`text-xs ${getRiskColor(log.risk)}`}>
                            {log.risk === "high" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {log.risk}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {!log.seen ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              NEW
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-500">Seen</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={log.approval === "approved" ? "default" : "outline"}
                            className={`text-xs ${
                              log.approval === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {log.approval}
                          </Badge>
                        </TableCell>

                        {/* ✅ Actions */}
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/audit-logs/log-details/${log.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {!log.seen && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkSeen(log.id)}
                              disabled={loading || !isAdmin}
                              title={!isAdmin ? "Admin only" : ""}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          )}

                          {log.approval === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(log.id)}
                              disabled={loading || !isAdmin}
                              title={!isAdmin ? "Admin only" : ""}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                Page {currentPage} / {totalPages} • Total {totalRows} logs
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
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
