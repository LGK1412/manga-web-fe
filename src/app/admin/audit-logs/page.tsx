"use client"

import AdminLayout from "../adminLayout/page"
import { useEffect, useMemo, useState } from "react"
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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

type AuditRisk = "low" | "medium" | "high"
type AuditApproval = "pending" | "approved"

type AuditLog = {
  id: string
  time: string
  actor: {
    name: string
    email: string
    role: string
  }
  action: string
  target: {
    type: string
    id: string
    reportCode?: string
  }
  summary: string
  risk: AuditRisk
  seen: boolean
  approval: AuditApproval
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

/** ✅ mapping BE -> FE UI */
function mapAuditRowToUI(row: any): AuditLog {
  const actorUsername =
    row?.actor_id?.username || row?.actor_name || "Unknown"
  const actorEmail =
    row?.actor_id?.email || row?.actor_email || "No email"
  const actorRole =
    row?.actor_role || row?.actor_id?.role || "system"

  return {
    id: String(row?._id ?? row?.id ?? ""),
    time: formatTime(row?.createdAt),
    actor: {
      name: actorUsername,
      email: actorEmail,
      role: String(actorRole),
    },
    action: String(row?.action ?? "unknown"),
    target: {
      type: String(row?.target_type ?? "Report"),
      id: String(row?.target_id ?? ""),
      reportCode: row?.reportCode,
    },
    summary: String(row?.summary ?? ""),
    risk: (row?.risk ?? "low") as AuditRisk,
    seen: Boolean(row?.seen),
    approval: (row?.approval ?? "pending") as AuditApproval,
    before: row?.before,
    after: row?.after,
    note: row?.note,
    evidenceImages: row?.evidenceImages ?? [],
    adminNote: row?.adminNote,
  }
}

export default function AuditLogsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("7days") // UI only (BE chưa filter date)
  const [highRiskOnly, setHighRiskOnly] = useState(false)

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [adminNote, setAdminNote] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [totalPages, setTotalPages] = useState(1)
  const [totalRows, setTotalRows] = useState(0)

  /** ✅ Fetch from BE */
  const fetchLogs = async () => {
    if (!API) {
      console.error("Missing NEXT_PUBLIC_API_URL")
      return
    }

    const endpoint = `${API}/api/audit-logs`

    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
      search: search?.trim() || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
      action: actionFilter !== "all" ? actionFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      risk: highRiskOnly ? "high" : undefined,
      // dateFilter hiện BE chưa hỗ trợ -> giữ UI, không gửi
    }

    setLoading(true)
    try {
      console.log("[AuditLogs] REQUEST", { endpoint, params })

      const res = await axios.get(endpoint, {
        params,
        withCredentials: true,
      })

      console.log("[AuditLogs] RESPONSE", {
        status: res.status,
        total: res.data?.total,
        page: res.data?.page,
        totalPages: res.data?.totalPages,
      })

      const items = Array.isArray(res.data?.items) ? res.data.items : []
      setLogs(items.map(mapAuditRowToUI))
      setTotalPages(res.data?.totalPages ?? 1)
      setTotalRows(res.data?.total ?? items.length)
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

  /** ===== Stats (tạm tính theo list hiện tại) ===== */
  const stats = useMemo(() => {
    return {
      total: totalRows,
      unseen: logs.filter((l) => !l.seen).length,
      pendingApproval: logs.filter((l) => l.approval === "pending").length,
      highRisk: logs.filter((l) => l.risk === "high").length,
    }
  }, [logs, totalRows])

  /** ✅ Actions */
  const handleMarkAllSeen = async () => {
    if (!API) return
    const endpoint = `${API}/api/audit-logs/seen-all`

    try {
      setLoading(true)
      await axios.patch(endpoint, {}, { withCredentials: true })
      await fetchLogs()
      setSelectedLog(null)
    } catch (err: any) {
      console.error("[AuditLogs] markAllSeen error", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkSeen = async (logId: string) => {
    if (!API) return
    const endpoint = `${API}/api/audit-logs/${logId}/seen`

    try {
      setLoading(true)
      await axios.patch(endpoint, {}, { withCredentials: true })
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, seen: true } : l)))
      setSelectedLog((prev) => (prev?.id === logId ? { ...prev, seen: true } : prev))
    } catch (err: any) {
      console.error("[AuditLogs] markSeen error", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (logId: string) => {
    if (!API) return
    const endpoint = `${API}/api/audit-logs/${logId}/approve`

    try {
      setLoading(true)
      await axios.patch(
        endpoint,
        { adminNote },
        { withCredentials: true },
      )

      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId ? { ...l, approval: "approved", adminNote } : l,
        ),
      )
      setSelectedLog((prev) =>
        prev?.id === logId ? { ...prev, approval: "approved", adminNote } : prev,
      )

      setAdminNote("")
    } catch (err: any) {
      console.error("[AuditLogs] approve error", err?.response?.data || err?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Time",
      "Actor",
      "Email",
      "Role",
      "Action",
      "Target Type",
      "Target ID",
      "ReportCode",
      "Summary",
      "Risk",
      "Seen",
      "Approval",
    ]

    const rows = logs.map((log) => [
      log.id,
      log.time,
      log.actor.name,
      log.actor.email,
      log.actor.role,
      log.action,
      log.target.type,
      log.target.id,
      safeStr(log.target.reportCode),
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
    switch (role) {
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
        {/* Breadcrumb & Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              Admin / <span className="text-gray-700">Audit Logs</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Audit Logs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track moderator actions and approvals
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMarkAllSeen} disabled={loading}>
              Mark all as seen
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

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
                  placeholder="Search by actor, email, report code, summary…"
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
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="content_moderator">Content Moderator</SelectItem>
                  <SelectItem value="community_manager">Community Manager</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={actionFilter}
                onValueChange={(v) => {
                  setActionFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="report_status_new">Status: New</SelectItem>
                  <SelectItem value="report_status_in-progress">Status: In Progress</SelectItem>
                  <SelectItem value="report_status_resolved">Status: Resolved</SelectItem>
                  <SelectItem value="report_status_rejected">Status: Rejected</SelectItem>
                  <SelectItem value="report_update">Report Update</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setCurrentPage(1)
                }}
              >
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

              <Select
                value={dateFilter}
                onValueChange={(v) => {
                  setDateFilter(v)
                  setCurrentPage(1)
                }}
              >
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
                    <TableHead className="text-xs font-semibold">Actor</TableHead>
                    <TableHead className="text-xs font-semibold">Action</TableHead>
                    <TableHead className="text-xs font-semibold">Target</TableHead>
                    <TableHead className="text-xs font-semibold">Summary</TableHead>
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
                        <TableCell className="text-xs whitespace-nowrap">
                          {log.time}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {log.actor.name
                                  .split(" ")
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
                                {log.actor.role.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={`text-xs ${getActionColor(log.action)}`}>
                            {log.action.replaceAll("_", " ")}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs">
                          <div>
                            <p className="font-medium">{log.target.type}</p>
                            <p className="text-gray-500">{log.target.id}</p>
                            {log.target.reportCode && (
                              <p className="text-gray-500">{log.target.reportCode}</p>
                            )}
                          </div>
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
                            {log.risk === "high" && (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
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

                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLog(log)
                              setAdminNote(log.adminNote ?? "")
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {!log.seen && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkSeen(log.id)}
                              disabled={loading}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          )}

                          {log.approval === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(log.id)}
                              disabled={loading}
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

        {/* Detail Drawer */}
        {selectedLog && (
          <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
            <SheetContent className="w-full sm:w-[500px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Log Details</SheetTitle>
                <SheetDescription>{selectedLog.id}</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Actor Info */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Actor Information</h3>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar>
                      <AvatarFallback>
                        {selectedLog.actor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedLog.actor.name}</p>
                      <p className="text-xs text-gray-600">{selectedLog.actor.email}</p>
                    </div>
                  </div>
                  <Badge className={`mt-2 ${getRoleColor(selectedLog.actor.role)}`}>
                    {selectedLog.actor.role.replace("_", " ")}
                  </Badge>
                </div>

                <Separator />

                {/* Action Details */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Action Details</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Action</p>
                      <Badge className={`${getActionColor(selectedLog.action)}`}>
                        {selectedLog.action.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Time</p>
                      <p className="text-sm font-medium">{selectedLog.time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Risk Level</p>
                      <Badge className={getRiskColor(selectedLog.risk)}>
                        {selectedLog.risk}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Target Info */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Target Information</h3>
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Type</p>
                      <p className="text-sm font-medium">{selectedLog.target.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">ID</p>
                      <p className="text-sm font-medium">{selectedLog.target.id}</p>
                    </div>
                    {selectedLog.target.reportCode && (
                      <div>
                        <p className="text-xs text-gray-600">Report Code</p>
                        <p className="text-sm font-medium">{selectedLog.target.reportCode}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Summary</h3>
                  <p className="text-sm text-gray-700">{selectedLog.summary}</p>
                </div>

                {/* Before/After Diff */}
                {selectedLog.before && selectedLog.after && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm mb-3">Before → After</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-800 mb-2">Before</p>
                          <pre className="text-xs text-red-700 overflow-auto max-h-32">
                            {JSON.stringify(selectedLog.before, null, 2)}
                          </pre>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs font-medium text-green-800 mb-2">After</p>
                          <pre className="text-xs text-green-700 overflow-auto max-h-32">
                            {JSON.stringify(selectedLog.after, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Note */}
                {selectedLog.note && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm mb-3">Moderator Note</h3>
                      <p className="text-sm text-gray-700 p-3 bg-blue-50 rounded-lg">
                        {selectedLog.note}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Approval Status */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Approval Status</h3>
                  <Badge
                    className={`text-sm ${
                      selectedLog.approval === "approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedLog.approval}
                  </Badge>
                </div>

                <Separator />

                {/* Admin Note Input */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Admin Note</h3>
                  <Textarea
                    placeholder="Add your note here…"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    (This note will be saved when you approve)
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {!selectedLog.seen && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkSeen(selectedLog.id)}
                      className="flex-1"
                      disabled={loading}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Mark as Seen
                    </Button>
                  )}

                  {selectedLog.approval === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedLog.id)}
                      className="flex-1"
                      disabled={loading}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve Log
                    </Button>
                  )}

                  <SheetClose asChild>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      Close
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </AdminLayout>
  )
}
