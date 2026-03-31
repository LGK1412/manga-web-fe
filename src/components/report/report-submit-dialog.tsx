"use client"

import { useEffect, useMemo, useState } from "react"
import { Flag, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export const REPORT_REASON_OPTIONS = [
  { value: "Spam", label: "Spam" },
  { value: "Copyright", label: "Copyright violation" },
  { value: "Inappropriate", label: "Inappropriate content" },
  { value: "Harassment", label: "Harassment / Offensive" },
  { value: "Other", label: "Other" },
] as const

type ReportReason = (typeof REPORT_REASON_OPTIONS)[number]["value"]

interface ReportSubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetTypeLabel: string
  targetName?: string
  submitting?: boolean
  onSubmit: (payload: { reason: ReportReason; description?: string }) => Promise<void> | void
}

export function ReportSubmitDialog({
  open,
  onOpenChange,
  targetTypeLabel,
  targetName,
  submitting = false,
  onSubmit,
}: ReportSubmitDialogProps) {
  const [reason, setReason] = useState<ReportReason>("Spam")
  const [description, setDescription] = useState("")
  const [validationError, setValidationError] = useState("")

  useEffect(() => {
    if (!open) {
      setReason("Spam")
      setDescription("")
      setValidationError("")
    }
  }, [open])

  const normalizedDescription = useMemo(() => description.trim(), [description])
  const requiresDescription = reason === "Other"

  const handleSubmit = async () => {
    if (requiresDescription && !normalizedDescription) {
      setValidationError("Please tell us more when choosing Other.")
      return
    }

    setValidationError("")
    await onSubmit({
      reason,
      description: normalizedDescription || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
            <Flag className="h-4 w-4" />
          </div>

          <div className="space-y-1">
            <DialogTitle>Report {targetTypeLabel}</DialogTitle>
            <DialogDescription>
              Choose the closest reason and add context if it helps the moderation team review faster.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {targetName && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Reporting
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{targetName}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">Reason</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value as ReportReason)
                setValidationError("")
              }}
              disabled={submitting}
            >
              {REPORT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-slate-800">Details</label>
              {requiresDescription && (
                <span className="text-xs font-medium text-amber-700">Required for Other</span>
              )}
            </div>

            <Textarea
              placeholder="Describe what happened, where it appears, or why it should be reviewed."
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                setValidationError("")
              }}
              disabled={submitting}
              className="min-h-[132px] rounded-2xl border-slate-200 bg-white text-sm text-slate-800"
            />

            {validationError ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <ShieldAlert className="h-3.5 w-3.5" />
                {validationError}
              </div>
            ) : (
              <p className="text-xs leading-5 text-slate-500">
                Optional for standard reasons. Add details if the issue needs more context.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (requiresDescription && !normalizedDescription)}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
