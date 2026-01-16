"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, FileText, Save } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"

interface Report {
  _id: string
  reportCode?: string
  reporter_id?: {
    username: string
    email: string
    role?: string
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
    target_human?: {
      username?: string
      email?: string
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
}

export default function ReportModal({
  open,
  report,
  loading,
  onClose,
  onUpdateStatus,
  statusColor,
}: ReportModalProps) {
  const [note, setNote] = useState("")

  useEffect(() => {
    setNote(report?.resolution_note ?? "")
  }, [report])

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A"
    const date = new Date(isoString)
    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
    })
  }

  const handleUpdateStatus = (newStatus?: string) => {
    if (!report) return
    onUpdateStatus(report._id, newStatus, note)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Report Details</DialogTitle>
          <DialogDescription>
            Review and manage this report. You can update progress or resolution notes.
          </DialogDescription>
        </DialogHeader>

        {report && (
          <div className="space-y-3 text-sm">
            <p><strong>Report Code:</strong> {report.reportCode}</p>
            {report.target_id?.title && <p><strong>Title:</strong> {report.target_id.title}</p>}
            {report.target_id?.content && <p><strong>Content:</strong> {report.target_id.content}</p>}
            <p><strong>Reason:</strong> {report.reason}</p>
            <p><strong>Description:</strong> {report.description ?? "No description"}</p>
            <p>     <strong>Status:</strong>{" "}       <Badge className={statusColor(report.status)}>{report.status}</Badge>       </p>
            <p><strong>Last Updated:</strong> {formatDate(report.updatedAt)}</p>

            {/* 📝 Note Section */}
            <div className="pt-2">
              <p className="flex items-center gap-1 font-semibold">
                <FileText className="w-4 h-4" /> Admin Notesdadd
              </p>
              <Textarea
                placeholder="Note on processing progress or results..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                (Note will be saved and displayed when opening this report)
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => handleUpdateStatus(undefined)} // chỉ lưu note
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-1" /> Save Note
          </Button>

          <Button
            variant="outline"
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
            onClick={() => handleUpdateStatus("in-progress")}
            disabled={loading}
          >
            Mark In Progress
          </Button>

          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleUpdateStatus("resolved")}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Resolve
          </Button>

          <Button
            variant="destructive"
            onClick={() => handleUpdateStatus("rejected")}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" /> Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
