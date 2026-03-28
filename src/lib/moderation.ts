import axios from "axios";
import type {
  AIStatus,
  Decision,
  ModerationRecord,
  ModerationResolutionStatus,
  QueueItem,
} from "@/lib/typesLogs";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

export type QueueRowFromBE = {
  chapter_id: string;
  status: AIStatus;
  resolution_status?: ModerationResolutionStatus;
  resolution_note?: string | null;
  resolved_at?: string | null;
  risk_score: number;
  labels: string[];
  updatedAt: string;
  chapterTitle: string;
  mangaTitle: string;
  authorName: string;
  authorEmail?: string;
};

export type ModerationRecordFromBE = {
  chapter_id: string;
  status: AIStatus;
  resolution_status?: ModerationResolutionStatus;
  resolution_note?: string | null;
  resolved_at?: string | null;
  risk_score: number;
  labels: string[];
  policy_version: string;
  ai_findings: ModerationRecord["ai_findings"];
  ai_model?: string;
  updatedAt: string;
  chapterTitle?: string;
  mangaTitle?: string;
  authorName?: string;
  authorEmail?: string;
  contentHtml?: string;
  is_published?: boolean;
};

export async function fetchQueue(params?: { status?: AIStatus | null; limit?: number }): Promise<QueueItem[]> {
  const res = await api.get("/moderation/queue", {
    params: params?.status ? { status: params.status } : {},
  });

  const rows: QueueRowFromBE[] = Array.isArray(res.data) ? res.data : [];

  return rows.map((row) => ({
    chapterId: row.chapter_id,
    title: row.chapterTitle || "Untitled",
    mangaTitle: row.mangaTitle || "-",
    author: row.authorName || "-",
    authorEmail: row.authorEmail || "",
    risk_score: Number(row.risk_score ?? 0),
    ai_status: row.status ?? "AI_PENDING",
    resolution_status: row.resolution_status ?? "OPEN",
    resolution_note: row.resolution_note ?? null,
    resolved_at: row.resolved_at ?? null,
    labels: Array.isArray(row.labels) ? row.labels : [],
    updatedAt: row.updatedAt,
  }));
}

export async function fetchModerationRecord(chapterId: string): Promise<ModerationRecord> {
  const res = await api.get(`/moderation/record/${chapterId}`);
  const row: ModerationRecordFromBE = res.data;

  return {
    chapterId: row.chapter_id,
    ai_status: row.status ?? "AI_PENDING",
    resolution_status: row.resolution_status ?? "OPEN",
    resolution_note: row.resolution_note ?? null,
    resolved_at: row.resolved_at ?? null,
    risk_score: Number(row.risk_score ?? 0),
    labels: Array.isArray(row.labels) ? row.labels : [],
    policy_version: row.policy_version ?? "",
    ai_findings: Array.isArray(row.ai_findings) ? row.ai_findings : [],
    ai_model: row.ai_model,
    updatedAt: row.updatedAt,
    chapterTitle: row.chapterTitle ?? "Untitled",
    mangaTitle: row.mangaTitle ?? "-",
    authorName: row.authorName ?? "-",
    authorEmail: row.authorEmail ?? "",
    contentHtml: row.contentHtml ?? "",
    is_published: Boolean(row.is_published),
  };
}

export async function decideModeration(
  chapterId: string,
  action: Decision,
  note?: string
) {
  const res = await api.post("/moderation/decide", {
    chapterId,
    action,
    note,
  });
  return res.data;
}

export async function recheckModeration(chapterId: string) {
  const res = await api.post("/moderation/recheck", {
    chapterId,
  });
  return res.data;
}
