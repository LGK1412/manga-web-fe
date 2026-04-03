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
  normal: "Normal",
  mute: "Muted",
  ban: "Banned",
}

export const ACTION_LABEL: Record<string, string> = {
  // report
  report_status_new: "Report - Status set to New",
  "report_status_in-progress": "Report - Status set to In Progress",
  report_status_resolved: "Report - Resolved",
  report_status_rejected: "Report - Rejected",
  report_update: "Report - Updated",

  // comment/reply
  comment_hidden: "Comment - Hidden",
  comment_restored: "Comment - Restored",
  reply_hidden: "Reply - Hidden",
  reply_restored: "Reply - Restored",

  // user moderation
  mute_user: "User - Muted",
  ban_user: "User - Banned",
  admin_reset_user_status: "User - Reset Status",
  admin_update_staff_status: "Staff - Status Updated",
  admin_set_role: "User - Role Updated",
  request_changes: "Moderation - Rejected",
}

export const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  role: "Role",
  is_delete: "Visibility",
  resolution_note: "Resolution note",
  note: "Moderator note",
  reason: "Reason",
  target_username: "Target username",
  target_email: "Target email",
  author_name: "Author name",
  author_email: "Author email",
  content_preview: "Content preview",
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
  if (key === "role") return prettyRole(value)
  if (key === "is_delete") return value ? "Hidden" : "Visible"
  return value
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

function extractPlainText(value: unknown) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(/<div><br\s*\/?><\/div>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|blockquote|section|article|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function clipText(value: unknown, limit = 96) {
  const text = extractPlainText(value)

  if (!text) return ""
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}...` : text
}

function formatIdentity(name?: string, email?: string) {
  const safeName = String(name ?? "").trim()
  const safeEmail = String(email ?? "").trim()

  if (safeName && safeEmail) return `${safeName} (${safeEmail})`
  if (safeName) return safeName
  if (safeEmail) return safeEmail
  return ""
}

function getTargetIdentity(log: any) {
  const before = log?.before ?? {}
  const after = log?.after ?? {}

  const username = firstNonEmpty(after.target_username, before.target_username)
  const email = firstNonEmpty(after.target_email, before.target_email)

  return formatIdentity(username, email)
}

function getAuthorIdentity(log: any) {
  const before = log?.before ?? {}
  const after = log?.after ?? {}

  const authorName = firstNonEmpty(after.author_name, before.author_name)
  const authorEmail = firstNonEmpty(after.author_email, before.author_email)

  return formatIdentity(authorName, authorEmail)
}

function getContentPreview(log: any) {
  const before = log?.before ?? {}
  const after = log?.after ?? {}

  return clipText(
    firstNonEmpty(
      after.content_html,
      before.content_html,
      after.content_preview,
      before.content_preview
    ),
    110
  )
}

function hasRichMarkupContent(log: any) {
  const before = log?.before ?? {}
  const after = log?.after ?? {}
  const raw = decodeHtmlEntities(
    firstNonEmpty(
      after.content_html,
      before.content_html,
      after.content_preview,
      before.content_preview
    )
  )

  if (!raw) return false

  const withoutSimpleBlocks = raw.replace(
    /<\/?(div|p|br|li|ul|ol|blockquote|section|article)\b[^>]*>/gi,
    " "
  )

  return /<[^>]+>/.test(withoutSimpleBlocks)
}

function hasFormattingOnlyContent(log: any) {
  const before = log?.before ?? {}
  const after = log?.after ?? {}
  const raw = firstNonEmpty(
    after.content_html,
    before.content_html,
    after.content_preview,
    before.content_preview
  )

  return Boolean(raw) && !extractPlainText(raw)
}

function buildStatusTransition(log: any) {
  const beforeStatus = log?.before?.status
  const afterStatus = log?.after?.status

  if (beforeStatus === undefined && afterStatus === undefined) return ""

  const left = beforeStatus !== undefined ? prettyStatus(beforeStatus) : "-"
  const right = afterStatus !== undefined ? prettyStatus(afterStatus) : "-"
  return `${left} -> ${right}`
}

function buildRoleTransition(log: any) {
  const beforeRole = log?.before?.role
  const afterRole = log?.after?.role

  if (beforeRole === undefined && afterRole === undefined) return ""

  const left = beforeRole !== undefined ? prettyRole(beforeRole) : "-"
  const right = afterRole !== undefined ? prettyRole(afterRole) : "-"
  return `${left} -> ${right}`
}

export function resolveAuditTarget(log: any) {
  const targetType = String(log?.target_type || log?.targetType || "")
  const targetId = String(log?.target_id || log?.targetId || "").trim()
  const targetIdentity = getTargetIdentity(log)
  const authorIdentity = getAuthorIdentity(log)
  const contentPreview = getContentPreview(log)

  if (targetIdentity) {
    return {
      label: targetIdentity,
      meta: targetType ? titleize(targetType) : targetId || "--",
    }
  }

  if (contentPreview || authorIdentity) {
    return {
      label: authorIdentity ? `${titleize(targetType || "record")} by ${authorIdentity}` : titleize(targetType || "record"),
      meta: targetId ? `Record ${targetId}` : titleize(targetType || "record"),
    }
  }

  return {
    label: targetType ? titleize(targetType) : "--",
    meta: targetId ? `Record ${targetId}` : "--",
  }
}

export function resolveAuditActorAvatar(avatar?: string, apiUrl?: string) {
  const value = String(avatar || "").trim()
  if (!value) return undefined
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value
  if (value.startsWith("/")) return apiUrl ? `${apiUrl}${value}` : value
  return apiUrl ? `${apiUrl}/assets/avatars/${value}` : undefined
}

/** ========= UI-friendly message (khong show technical id) ========= */
export function buildHumanMessage(log: any) {
  const action = String(log?.action || "").trim().toLowerCase()
  const targetId = firstNonEmpty(log?.target_id, log?.targetId)
  const raw = String(log?.summary || "")
    .replaceAll("report_status_", "")
    .replaceAll("_", " ")
    .trim()

  const targetIdentity = getTargetIdentity(log)
  const authorIdentity = getAuthorIdentity(log)
  const statusTransition = buildStatusTransition(log)
  const roleTransition = buildRoleTransition(log)

  switch (action) {
    case "ban_user":
    case "mute_user":
    case "admin_reset_user_status":
    case "admin_update_staff_status":
    case "admin_set_role":
      return raw || (targetIdentity ? `${prettyAction(action)}: ${targetIdentity}` : prettyAction(action))
    case "comment_hidden":
      if (authorIdentity) return `Comment hidden for ${authorIdentity}`
      if (targetId) return "Comment hidden"
      return raw || "Comment hidden"
    case "comment_restored":
      if (authorIdentity) return `Comment restored for ${authorIdentity}`
      if (targetId) return "Comment restored"
      return raw || "Comment restored"
    case "reply_hidden":
      if (authorIdentity) return `Reply hidden for ${authorIdentity}`
      if (targetId) return "Reply hidden"
      return raw || "Reply hidden"
    case "reply_restored":
      if (authorIdentity) return `Reply restored for ${authorIdentity}`
      if (targetId) return "Reply restored"
      return raw || "Reply restored"
  }

  if (statusTransition) return `Updated status: ${statusTransition}`
  if (roleTransition) return `Updated role: ${roleTransition}`
  if (!raw) return "-"

  return raw
}

/** ========= allowlist fields for diff (an technical keys) ========= */
export function normalizeDiff(log: any, obj?: Record<string, any>) {
  const action = String(log?.action || "")
  const targetType = String(log?.target_type || log?.targetType || "").toLowerCase()

  let allow: string[] = []

  if (targetType === "report" || action.startsWith("report_")) {
    allow = ["status", "resolution_note", "note", "reason"]
  } else if (targetType === "user" || action.includes("_user") || action.startsWith("admin_")) {
    allow = ["target_username", "target_email", "role", "status", "note", "reason"]
  } else if (action.startsWith("comment_") || action.startsWith("reply_")) {
    allow = ["is_delete", "note", "reason"]
  } else {
    allow = ["status", "note", "reason"]
  }

  const out: Record<string, any> = {}
  for (const k of allow) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]
  }
  return out
}
