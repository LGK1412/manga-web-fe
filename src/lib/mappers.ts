// lib/mappers.ts
import type { QueueRowFromBE, ModerationRecordFromBE } from "./moderation";
import type { QueueItem, ModerationRecord } from "@/lib/typesLogs";

export function mapQueueRow(row: QueueRowFromBE): QueueItem {
  return {
    chapterId: row.chapter_id,
    title: row.title ?? row.chapter_id,
    author: row.author ?? "—",
    risk_score: row.risk_score,
    ai_status: row.status,
    labels: row.labels ?? [],
    updatedAt: row.updatedAt,
  };
}

export function mapModerationRecord(m: ModerationRecordFromBE): ModerationRecord {
  return {
    chapterId: m.chapterId,
    ai_status: m.status,
    risk_score: m.risk_score,
    labels: m.labels ?? [],
    policy_version: m.policy_version,
    ai_findings: m.ai_findings ?? [],
    ai_model: m.ai_model,
    updatedAt: m.updatedAt,
  };
}
