import type { QueueRowFromBE, ModerationRecordFromBE } from "./moderation";
import type { QueueItem, ModerationRecord } from "@/lib/typesLogs";

export function mapQueueRow(row: QueueRowFromBE): QueueItem {
  return {
    chapterId: row.chapter_id,
    title: row.chapterTitle ?? row.chapter_id,
    mangaTitle: row.mangaTitle ?? "-",
    author: row.authorName ?? "-",
    authorEmail: row.authorEmail ?? "",
    risk_score: row.risk_score,
    ai_status: row.status,
    resolution_status: row.resolution_status ?? "OPEN",
    resolution_note: row.resolution_note ?? null,
    resolved_at: row.resolved_at ?? null,
    labels: row.labels ?? [],
    updatedAt: row.updatedAt,
  };
}

export function mapModerationRecord(m: ModerationRecordFromBE): ModerationRecord {
  return {
    chapterId: m.chapter_id,
    ai_status: m.status,
    resolution_status: m.resolution_status ?? "OPEN",
    resolution_note: m.resolution_note ?? null,
    resolved_at: m.resolved_at ?? null,
    risk_score: m.risk_score,
    labels: m.labels ?? [],
    policy_version: m.policy_version,
    ai_findings: m.ai_findings ?? [],
    ai_model: m.ai_model,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    chapterTitle: m.chapterTitle ?? "Untitled",
    mangaTitle: m.mangaTitle ?? "-",
    authorName: m.authorName ?? "-",
    authorEmail: m.authorEmail ?? "",
    contentHtml: m.contentHtml ?? "",
    is_published: Boolean(m.is_published),
  };
}
