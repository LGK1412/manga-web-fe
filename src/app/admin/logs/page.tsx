"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import AdminLayout from "../adminLayout/page";

import type { AuditLog } from "@/lib/typesLogs"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

// Mock logs data
const mockLogs: AuditLog[] = [
  {
    _id: "log_001",
    time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    actor: "Moderator_A",
    action: "approve",
    policy_version: "v2.1",
    ai_model: "GPT-4 Vision",
    result: "Chapter ch_001 approved and published",
    note: "Content meets all standards",
    chapterId: "ch_001",
  },
  {
    _id: "log_002",
    time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    actor: "System",
    action: "ai_check",
    policy_version: "v2.1",
    ai_model: "GPT-4 Vision",
    result: "Risk score: 32, Status: PASSED",
    chapterId: "ch_002",
  },
  {
    _id: "log_003",
    time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    actor: "Moderator_B",
    action: "reject",
    policy_version: "v2.1",
    ai_model: "GPT-4 Vision",
    result: "Chapter ch_003 rejected",
    note: "Excessive violence - violates policy section 3.2",
    chapterId: "ch_003",
  },
  {
    _id: "log_004",
    time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    actor: "Moderator_A",
    action: "request_changes",
    policy_version: "v2.1",
    result: "Author requested to revise content",
    note: "Remove profanity and tone down violence",
    chapterId: "ch_004",
  },
  {
    _id: "log_005",
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    actor: "System",
    action: "recheck",
    policy_version: "v2.1",
    ai_model: "GPT-4 Vision",
    result: "Risk score: 45, Status: WARN",
    chapterId: "ch_005",
  },
]

export default function LogsPage() {
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      const matchesSearch =
        log.actor.toLowerCase().includes(search.toLowerCase()) ||
        log.chapterId.toLowerCase().includes(search.toLowerCase()) ||
        log.result.toLowerCase().includes(search.toLowerCase())

      const matchesAction = actionFilter === "all" || log.action === actionFilter

      return matchesSearch && matchesAction
    })
  }, [search, actionFilter])

  const actionColors: Record<string, string> = {
    ai_check: "bg-blue-100 text-blue-800",
    recheck: "bg-blue-100 text-blue-800",
    approve: "bg-green-100 text-green-800",
    reject: "bg-red-100 text-red-800",
    request_changes: "bg-yellow-100 text-yellow-800",
  }

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Admin</span>
        <span>/</span>
        <span className="text-foreground">Logs</span>
      </div>

      <h1 className="text-2xl font-bold">Audit Logs</h1>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by actor, chapter ID, or result..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Action</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="ai_check">AI Check</SelectItem>
              <SelectItem value="recheck">Recheck</SelectItem>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="reject">Reject</SelectItem>
              <SelectItem value="request_changes">Request Changes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log._id} className="hover:bg-muted/50">
                <TableCell className="text-sm text-muted-foreground">{new Date(log.time).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{log.actor}</TableCell>
                <TableCell>
                  <Badge className={actionColors[log.action]}>{log.action.replace(/_/g, " ").toUpperCase()}</Badge>
                </TableCell>
                <TableCell className="text-sm">{log.chapterId}</TableCell>
                <TableCell className="max-w-xs truncate text-sm">{log.result}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedLog(log)
                      setShowDetailDialog(true)
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      {showDetailDialog && selectedLog && (
        <AlertDialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log Details</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium text-sm">{new Date(selectedLog.time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actor</p>
                <p className="font-medium text-sm">{selectedLog.actor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Action</p>
                <Badge className={actionColors[selectedLog.action]}>
                  {selectedLog.action.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chapter ID</p>
                <p className="font-medium text-sm">{selectedLog.chapterId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Result</p>
                <p className="text-sm">{selectedLog.result}</p>
              </div>
              {selectedLog.ai_model && (
                <div>
                  <p className="text-sm text-muted-foreground">AI Model</p>
                  <p className="text-sm">{selectedLog.ai_model}</p>
                </div>
              )}
              {selectedLog.note && (
                <div>
                  <p className="text-sm text-muted-foreground">Note</p>
                  <p className="text-sm">{selectedLog.note}</p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
    </AdminLayout>
  )
}
