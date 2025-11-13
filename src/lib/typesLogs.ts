export type AIStatus = 'AI_PENDING' | 'AI_WARN' | 'AI_BLOCK' | 'AI_PASSED';
export type Decision = 'approve' | 'reject' | 'request_changes';

export interface QueueItem {
  chapterId: string;
  title: string;
  author: string;
  risk_score: number;
  ai_status: AIStatus;
  labels: string[];
  updatedAt: string;
}

export interface Finding {
  sectionId: string;
  verdict: 'pass' | 'warn' | 'block';
  rationale: string;
}

export interface ModerationRecord {
  chapterId: string;
  ai_status: AIStatus;
  risk_score: number;
  labels: string[];
  policy_version: string;
  ai_findings: Finding[];
  ai_model?: string;
  updatedAt: string;

  /** Optional – BE có thì hiển thị, không có thì dùng fallback */
  chapterTitle?: string;
  authorName?: string;
  contentHtml?: string; // nếu BE trả kèm html chương
}
