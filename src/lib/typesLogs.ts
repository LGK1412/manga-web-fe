export type AIStatus = "AI_PENDING" | "AI_WARN" | "AI_BLOCK" | "AI_PASSED";
export type Decision = "approve" | "reject";
export type ModerationResolutionStatus = "OPEN" | "APPROVED" | "REJECTED";
export type ModeratorNextStep = "approve" | "reject" | "escalate";

export interface FindingAdvice {
  moderator: {
    nextStep: ModeratorNextStep;
    reason: string;
    checks: string[];
  };
  author: {
    revisionGoal: string;
    revisionSteps: string[];
    noteDraft?: string;
  };
}

export interface QueueItem {
  chapterId: string;
  title: string;
  mangaTitle: string;
  author: string;
  authorEmail?: string;
  risk_score: number;
  ai_status: AIStatus;
  resolution_status: ModerationResolutionStatus;
  resolution_note?: string | null;
  resolved_at?: string | null;
  labels: string[];
  updatedAt: string;
}

export interface Finding {
  sectionId: string;
  verdict: "pass" | "warn" | "block";
  rationale: string;
  policySlug?: string;
  policyTitle?: string;
  severity?: "low" | "medium" | "high";
  advice?: FindingAdvice;
  spans?: { start: number; end: number }[];
}

export interface ModerationRecord {
  chapterId: string;
  ai_status: AIStatus;
  resolution_status: ModerationResolutionStatus;
  resolution_note?: string | null;
  resolved_at?: string | null;
  risk_score: number;
  labels: string[];
  policy_version: string;
  ai_findings: Finding[];
  ai_model?: string;
  createdAt?: string;
  updatedAt: string;

  chapterTitle?: string;
  mangaTitle?: string;
  authorName?: string;
  authorEmail?: string;
  contentHtml?: string;
  is_published?: boolean;
}
