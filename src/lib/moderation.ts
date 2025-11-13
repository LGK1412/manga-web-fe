// lib/moderation.ts
import axios from "axios";
import type { AIStatus, QueueItem, ModerationRecord, Decision } from "./typesLogs";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // KHÔNG thêm /api ở đây
  withCredentials: true,                    // dùng cookie access_token
});

// ---- MAPPERS (BE -> FE) ----
const mapQueueRow = (r: any): QueueItem => ({
  chapterId: r.chapter_id?.toString?.() ?? r.chapter_id ?? "",
  title: r.chapterTitle ?? r.title ?? "-",
  author: r.authorName ?? r.author ?? "-",
  risk_score: r.risk_score ?? 0,
  ai_status: r.status as AIStatus,
  labels: r.labels ?? [],
  updatedAt: r.updatedAt ?? r.createdAt ?? new Date().toISOString(),
});

export const mapModerationRecord = (r: any): ModerationRecord => ({
  chapterId: r.chapter_id?.toString?.() ?? r.chapterId ?? "",
  ai_status: r.status as AIStatus,
  risk_score: r.risk_score ?? 0,
  labels: r.labels ?? [],
  policy_version: r.policy_version ?? "1.0.0",
  ai_findings: (r.ai_findings ?? []).map((f: any) => ({
    sectionId: f.sectionId ?? f.policy ?? "general",
    verdict: f.verdict ?? "warn",
    rationale: f.rationale ?? f.reason ?? "",
  })),
  ai_model: r.ai_model ?? undefined,
  updatedAt: r.updatedAt ?? new Date().toISOString(),

  // 👇 Quan trọng: map thêm các optional field cho Workspace
  chapterTitle: r.chapterTitle ?? r.title,    // BE record đang trả chapterTitle
  authorName: r.authorName ?? r.author,       // record hiện CHƯA trả — sẽ fallback bên dưới
  contentHtml: r.contentHtml ?? r.html ?? r.content, // nếu BE có trả
});

// ---- API CALLS ----

// Hàng chờ moderation
export async function fetchQueue(params?: { status?: AIStatus; limit?: number }) {
  const res = await api.get("/moderation/queue", { params });
  return (res.data ?? []).map(mapQueueRow) as QueueItem[];
}

// Lấy record moderation 1 chương (xem Workspace)
// 👉 yêu cầu BE có endpoint này; nếu chưa có, tạm fallback đọc queue rồi find theo chapterId
export async function fetchModerationRecord(chapterId: string) {
  // Lấy record chính
  const res = await api.get(`/moderation/record/${chapterId}`);
  let rec = mapModerationRecord(res.data);

  // Fallback: nếu thiếu title/author thì lấy từ hàng chờ (queue)
  if (!rec.chapterTitle || !rec.authorName) {
    try {
      const q = await fetchQueue(); // đã map QueueItem { title, author, ...}
      const hit = q.find(r => r.chapterId === chapterId);
      if (hit) {
        rec = {
          ...rec,
          chapterTitle: rec.chapterTitle ?? hit.title,
          authorName: rec.authorName ?? hit.author,
        };
      }
    } catch { /* kệ – best effort */ }
  }

  return rec;
}

// Quyết định của admin
export async function decideModeration(chapterId: string, action: Decision, note?: string) {
  return api.post("/moderation/decide", { chapterId, action, note });
}

// Yêu cầu chạy lại AI
export async function recheckModeration(chapterId: string, opts?: { policyVersion?: string; contentHash?: string }) {
  return api.post("/moderation/recheck", { chapterId, ...opts });
}

// Invalidate khi nội dung đã sửa (tắt kết quả AI cũ)
export async function invalidateAi(chapterId: string, contentHash: string) {
  return api.patch("/moderation/invalidate", { chapterId, contentHash });
}

// (giữ nguyên) Lấy policy TERM/posting cho FE
export async function fetchPostingPolicies() {
  const res = await api.get("/api/policies", { params: { mainType: "TERM" } });
  return (res.data ?? []).filter(
    (p: any) => p.subCategory === "posting" && p.status === "Active" && p.isPublic
  );
}
