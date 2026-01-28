// src/lib/audit-ui.ts

export type AuditRisk = "low" | "medium" | "high"
export type AuditApproval = "pending" | "approved"

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  community_manager: "Community Manager",
  content_moderator: "Content Moderator",
  system: "System",
}

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  "in-progress": "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
}

export const ACTION_LABEL: Record<string, string> = {
  // report
  report_status_new: "Report · Status set to New",
  "report_status_in-progress": "Report · Status set to In Progress",
  report_status_resolved: "Report · Resolved",
  report_status_rejected: "Report · Rejected",
  report_update: "Report · Updated",

  // comment/reply
  comment_hidden: "Comment · Hidden",
  comment_restored: "Comment · Restored",
  reply_hidden: "Reply · Hidden",
  reply_restored: "Reply · Restored",
}

export const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  resolution_note: "Resolution note",
  note: "Moderator note",
  reason: "Reason",
}

/** ========= basic format ========= */
export function titleize(s: string) {
  return String(s || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ")
}

export function prettyRole(role?: string) {
  const k = String(role || "").toLowerCase()
  return ROLE_LABEL[k] ?? titleize(k || "system")
}

export function prettyStatus(status?: string) {
  const k = String(status || "").toLowerCase()
  return STATUS_LABEL[k] ?? titleize(k)
}

export function prettyAction(action?: string) {
  const k = String(action || "")
  return ACTION_LABEL[k] ?? titleize(k)
}

export function prettyFieldLabel(key: string) {
  return FIELD_LABEL[key] ?? titleize(key)
}

export function prettyFieldValue(key: string, value: any) {
  if (key === "status") return prettyStatus(value)
  return value
}

/** ========= UI-friendly message (không show code) ========= */
export function buildHumanMessage(log: any) {
  const b = log?.before?.status
  const a = log?.after?.status

  if (b !== undefined || a !== undefined) {
    const left = b ? prettyStatus(b) : "—"
    const right = a ? prettyStatus(a) : "—"
    return `Updated status: ${left} → ${right}`
  }

  const raw = String(log?.summary || "")
  if (!raw) return "—"

  // làm sạch thô (fallback)
  return raw
    .replaceAll("report_status_", "")
    .replaceAll("_", " ")
    .trim()
}

/** ========= allowlist fields for diff (ẩn technical keys) ========= */
export function normalizeDiff(log: any, obj?: Record<string, any>) {
  const action = String(log?.action || "")
  const targetType = String(log?.target_type || log?.targetType || "").toLowerCase()

  let allow: string[] = []

  if (targetType === "report" || action.startsWith("report_")) {
    allow = ["status", "resolution_note", "note", "reason"]
  } else if (action.startsWith("comment_") || action.startsWith("reply_")) {
    allow = ["status", "note", "reason"]
  } else {
    allow = ["status", "note", "reason"]
  }

  const out: Record<string, any> = {}
  for (const k of allow) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]
  }
  return out
}
