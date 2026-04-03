import type {
  Finding,
  FindingAdvice,
  ModeratorNextStep,
} from "@/lib/typesLogs";

export type FindingMatchStrategy = "span" | "excerpt" | "fragment" | "general";
export type GuidanceSource = "ai" | "fallback";

export interface FindingActionItem {
  tone: "required" | "rewrite" | "next";
  label: string;
  detail: string;
}

export interface ProcessedFinding extends Finding {
  highlightId: string;
  displayTitle: string;
  parsedReason: string;
  evidenceText: string;
  primaryAction: string;
  moderatorGuidance: ModeratorGuidance;
  authorGuidance: AuthorGuidance;
  moderatorActions: FindingActionItem[];
  fixActions: FindingActionItem[];
  locationLabel: string;
  matchStrategy: FindingMatchStrategy;
  severityRank: number;
  originalIndex: number;
}

export interface ModeratorGuidance {
  source: GuidanceSource;
  tone: FindingActionItem["tone"];
  nextStep: ModeratorNextStep;
  actionLabel: string;
  summary: string;
  reviewCheckpoints: string[];
}

export interface AuthorGuidance {
  source: GuidanceSource;
  objective: string;
  revisionSteps: string[];
  noteDraft?: string;
}

export interface AuthorRevisionDraft {
  focusTitle: string;
  body: string;
  includedFindingCount: number;
  remainingFindingCount: number;
}

type TextRange = {
  start: number;
  end: number;
};

const SECTION_LABELS: Record<string, string> = {
  violence: "Violence & Gore",
  sexual: "Sexual Content",
  language: "Offensive Language",
  harassment: "Harassment & Bullying",
  misinformation: "Misinformation",
  spam: "Spam",
  general: "General Review",
  "system/fallback": "System Fallback",
  "system/format": "Response Format",
};

const ALCOHOL_TERMS = [
  "beer",
  "alcohol",
  "drink alcohol",
  "drinking",
  "vodka",
  "whisky",
  "wine",
  "bia",
  "rượu",
  "uống bia",
  "uống rượu",
  "nhậu",
  "say",
];

const MINOR_TERMS = [
  "minor",
  "underage",
  "teen",
  "teenager",
  "student",
  "school",
  "classroom",
  "child",
  "kid",
  "học sinh",
  "học trò",
  "trường",
  "lớp",
  "vị thành niên",
  "chưa đủ tuổi",
];

const SEXUAL_TERMS = [
  "sex",
  "sexual",
  "nude",
  "nudity",
  "kiss",
  "bed",
  "moan",
  "explicit",
  "porn",
  "gợi dục",
  "trần truồng",
  "cởi đồ",
  "quan hệ",
  "thân mật",
];

const VIOLENCE_TERMS = [
  "blood",
  "gore",
  "stab",
  "slash",
  "kill",
  "murder",
  "corpse",
  "torture",
  "máu",
  "đâm",
  "chém",
  "giết",
  "xác",
  "tra tấn",
];

const HARASSMENT_TERMS = [
  "idiot",
  "stupid",
  "worthless",
  "kill yourself",
  "hate you",
  "đồ ngu",
  "cút đi",
  "vô dụng",
  "khốn",
  "súc vật",
];

const SPAM_TERMS = [
  "http",
  "www.",
  "subscribe",
  "buy now",
  "discount",
  "promo",
  "sale",
  "click here",
  "liên hệ",
  "mua ngay",
  "giảm giá",
];

const MISINFO_TERMS = [
  "guaranteed cure",
  "100% cure",
  "confirmed fact",
  "secret truth",
  "khỏi bệnh",
  "chắc chắn chữa",
  "sự thật tuyệt đối",
];

export function parseFindingRationale(rationale: string) {
  const raw = String(rationale || "").trim();

  const evidenceMatch = raw.match(
    /^(.*?)(?:\|\s*evidence\s*:|(?:^|\s)evidence\s*:)([\s\S]*)$/i
  );

  const reason = (evidenceMatch?.[1] || raw).trim();
  const evidenceText = stripWrappingQuotes((evidenceMatch?.[2] || "").trim());

  return {
    reason: reason || "This finding needs moderator review.",
    evidenceText,
  };
}

function stripWrappingQuotes(input: string) {
  return String(input || "")
    .replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g, "")
    .trim();
}

function humanizeSectionId(value: string) {
  return String(value || "")
    .replace(/[/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function resolveFindingTitle(
  sectionId: string,
  policyIndex?: Record<string, string>
) {
  const key = String(sectionId || "").trim();

  return (
    policyIndex?.[key] ||
    SECTION_LABELS[key] ||
    SECTION_LABELS[key.toLowerCase()] ||
    humanizeSectionId(key)
  );
}

function containsAny(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function buildFindingHaystack(
  finding: Pick<Finding, "sectionId" | "policySlug" | "policyTitle">,
  reason?: string,
  evidenceText?: string
) {
  return [
    finding.sectionId,
    finding.policySlug,
    finding.policyTitle,
    reason,
    evidenceText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolveProcessedFindingTitle(
  finding: Pick<Finding, "sectionId" | "policySlug" | "policyTitle">,
  policyIndex?: Record<string, string>
) {
  const keyedTitle = String(
    finding.policySlug || finding.sectionId || ""
  ).trim()
    ? resolveFindingTitle(finding.policySlug || finding.sectionId, policyIndex)
    : "";

  return keyedTitle || String(finding.policyTitle || "").trim() || "General Review";
}

function normalizeTextList(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];
}

function hasAiAdvice(advice?: FindingAdvice): advice is FindingAdvice {
  if (!advice) return false;

  const nextStep = advice.moderator?.nextStep;
  const moderatorReason = String(advice.moderator?.reason || "").trim();
  const revisionGoal = String(advice.author?.revisionGoal || "").trim();

  return (
    (nextStep === "approve" ||
      nextStep === "reject" ||
      nextStep === "escalate") &&
    Boolean(moderatorReason) &&
    Boolean(revisionGoal)
  );
}

function mapNextStepToTone(
  nextStep: ModeratorNextStep
): FindingActionItem["tone"] {
  if (nextStep === "reject") {
    return "required";
  }

  if (nextStep === "approve" || nextStep === "escalate") {
    return "next";
  }

  return "rewrite";
}

function mapNextStepToLabel(nextStep: ModeratorNextStep) {
  switch (nextStep) {
    case "approve":
      return "Approve if safe in context";
    case "reject":
      return "Reject chapter";
    case "escalate":
      return "Escalate for review";
    default:
      return "Review";
  }
}

function dedupeActions(actions: FindingActionItem[]) {
  const seen = new Set<string>();
  const result: FindingActionItem[] = [];

  for (const action of actions) {
    const key = `${action.tone}__${action.label}__${action.detail}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result.slice(0, 4);
}

function makeAction(
  tone: FindingActionItem["tone"],
  label: string,
  detail: string
): FindingActionItem {
  return { tone, label, detail };
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = String(line || "").trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function buildModeratorGuidance(
  finding: Finding,
  parsedReason: string,
  actions: FindingActionItem[]
): ModeratorGuidance {
  if (hasAiAdvice(finding.advice)) {
    const nextStep = finding.advice.moderator.nextStep;

    return {
      source: "ai",
      tone: mapNextStepToTone(nextStep),
      nextStep,
      actionLabel: mapNextStepToLabel(nextStep),
      summary: String(finding.advice.moderator.reason || "").trim(),
      reviewCheckpoints: normalizeTextList(finding.advice.moderator.checks).slice(0, 4),
    };
  }

  const primaryAction = actions[0];
  const reviewCheckpoints = dedupeLines(
    actions.slice(1).map((action) => action.detail)
  );

  return {
    source: "fallback",
    tone: primaryAction?.tone || "next",
    nextStep: "reject",
    actionLabel: primaryAction?.label || "Review",
    summary: primaryAction?.detail || parsedReason,
    reviewCheckpoints:
      reviewCheckpoints.length > 0
        ? reviewCheckpoints.slice(0, 3)
        : [parsedReason],
  };
}

function buildAuthorGuidance(
  finding: Finding,
  parsedReason: string,
  actions: FindingActionItem[]
): AuthorGuidance {
  if (hasAiAdvice(finding.advice)) {
    return {
      source: "ai",
      objective: String(finding.advice.author.revisionGoal || "").trim(),
      revisionSteps: normalizeTextList(finding.advice.author.revisionSteps).slice(0, 4),
      noteDraft: String(finding.advice.author.noteDraft || "").trim() || undefined,
    };
  }

  const directRevisionActions = actions.filter((action) => action.tone !== "next");
  const objective = directRevisionActions[0]?.detail || parsedReason;
  const revisionSteps = dedupeLines(
    directRevisionActions.slice(1).map((action) => action.detail)
  );

  return {
    source: "fallback",
    objective,
    revisionSteps: revisionSteps.slice(0, 3),
    noteDraft: undefined,
  };
}

function summarizeFindingForAuthor(finding: ProcessedFinding) {
  const actionDetails = [
    finding.authorGuidance.objective,
    ...finding.authorGuidance.revisionSteps,
  ]
    .map((detail) => detail.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (actionDetails.length > 0) {
    return actionDetails.join(" ");
  }

  return finding.parsedReason;
}

export function buildAuthorRevisionDraft(
  findings: ProcessedFinding[],
  activeFindingId?: string | null
): AuthorRevisionDraft | null {
  const actionableFindings = findings.filter((finding) => finding.verdict !== "pass");
  if (!actionableFindings.length) return null;

  const focusedFinding =
    actionableFindings.find((finding) => finding.highlightId === activeFindingId) ||
    actionableFindings[0];

  if (actionableFindings.length === 1 && focusedFinding.authorGuidance.noteDraft) {
    return {
      focusTitle: focusedFinding.displayTitle,
      body: focusedFinding.authorGuidance.noteDraft,
      includedFindingCount: 1,
      remainingFindingCount: 0,
    };
  }

  const orderedFindings = [
    focusedFinding,
    ...actionableFindings.filter(
      (finding) => finding.highlightId !== focusedFinding.highlightId
    ),
  ];

  const includedFindings = orderedFindings.slice(0, 3);
  const intro =
    focusedFinding.verdict === "block"
      ? "Please revise the highlighted high-risk content before resubmitting this chapter."
      : "Please review the highlighted sections and revise the risky wording before resubmitting this chapter.";

  const checklistLines = includedFindings.map((finding) => {
    return `- ${finding.displayTitle}: ${summarizeFindingForAuthor(finding)}`;
  });

  const remainingFindingCount = Math.max(
    0,
    actionableFindings.length - includedFindings.length
  );

  const closing =
    remainingFindingCount > 0
      ? `Please also review the remaining ${remainingFindingCount} highlighted finding${remainingFindingCount > 1 ? "s" : ""} in the workspace before resubmitting.`
      : "After editing, please resubmit the chapter for moderation review.";

  return {
    focusTitle: focusedFinding.displayTitle,
    body: [intro, "", ...checklistLines, "", closing].join("\n"),
    includedFindingCount: includedFindings.length,
    remainingFindingCount,
  };
}

export function getModeratorActions(
  finding: Finding,
  evidenceText?: string,
  reason?: string
) {
  const haystack = buildFindingHaystack(finding, reason, evidenceText);
  const hasMinorContext = containsAny(haystack, MINOR_TERMS);
  const hasSexualContext = containsAny(haystack, SEXUAL_TERMS);
  const hasAlcoholContext = containsAny(haystack, ALCOHOL_TERMS);

  if (hasMinorContext && (hasSexualContext || hasAlcoholContext)) {
    return dedupeActions([
      makeAction(
        "required",
        "Reject until revised",
        "Do not approve this chapter until the risky age-related context is revised or clarified."
      ),
      makeAction(
        "next",
        "Escalate if age is unclear",
        "Escalate to a senior moderator if the character age, consent, or school-age context is ambiguous."
      ),
      makeAction(
        "next",
        "Reject if explicit",
        "Reject if the scene clearly depicts underage sexual or substance-use content in a disallowed way."
      ),
    ]);
  }

  if (finding.verdict === "block") {
    return dedupeActions([
      makeAction(
        "required",
        "Reject until revised",
        "Keep the chapter unpublished until the flagged content is rewritten or removed."
      ),
      makeAction(
        "next",
        "Reject if the violation is clear",
        "Use reject when the chapter is clearly incompatible with posting policy and cannot be resolved by a small edit."
      ),
      makeAction(
        "next",
        "Escalate if context is unclear",
        "Escalate when intent, age, or protected-category context is still uncertain after review."
      ),
    ]);
  }

  if (
    finding.sectionId.toLowerCase().includes("harassment") ||
    containsAny(haystack, HARASSMENT_TERMS)
  ) {
    return dedupeActions([
      makeAction(
        "required",
        "Review the target and context",
        "Confirm whether the abusive wording is directed at a protected group or repeated across the scene."
      ),
      makeAction(
        "next",
        "Reject if it is direct abuse",
        "Use reject when the attack is explicit and the chapter is not ready for publication."
      ),
      makeAction(
        "next",
        "Escalate if protected-group risk appears",
        "Escalate when the language may cross into hate, slurs, or targeted harassment."
      ),
    ]);
  }

  if (finding.verdict === "warn") {
    return dedupeActions([
      makeAction(
        "required",
        "Review nearby context first",
        "Check the surrounding lines before deciding whether this needs revision or is acceptable in context."
      ),
      makeAction(
        "next",
        "Reject if the wording must be softened",
        "Use reject when a rewrite is needed before the chapter can be published safely."
      ),
      makeAction(
        "next",
        "Approve only if policy context is clearly safe",
        "Approve only when the surrounding context clearly keeps the content within posting policy."
      ),
    ]);
  }

  return dedupeActions([
    makeAction(
      "next",
      "No urgent moderator action",
      "No immediate intervention is suggested, but keep the policy context in mind before publishing."
    ),
  ]);
}

export function getSuggestedActions(
  finding: Finding,
  evidenceText?: string,
  reason?: string
) {
  const key = String(finding.sectionId || "").toLowerCase();
  const haystack = buildFindingHaystack(finding, reason, evidenceText);

  if (containsAny(haystack, ALCOHOL_TERMS) && containsAny(haystack, MINOR_TERMS)) {
    return dedupeActions([
      makeAction(
        "rewrite",
        "Revise age-related substance references",
        "Remove casual, celebratory, or normalizing wording around students or underage drinking."
      ),
      makeAction(
        "rewrite",
        "Keep context only",
        "Retain only the story context needed for the scene and avoid glamorizing the behavior."
      ),
      makeAction(
        "required",
        "Add a warning only if policy requires it",
        "Use a substance-use or age warning label only when the posting policy explicitly requires one."
      ),
      makeAction(
        "next",
        "Resubmit for recheck",
        "After editing, ask for another moderation pass. Escalate if the age context is still ambiguous."
      ),
    ]);
  }

  if (containsAny(haystack, ALCOHOL_TERMS)) {
    return dedupeActions([
      makeAction(
        "rewrite",
        "Reduce glamorization",
        "Remove celebratory, instructional, or casual wording that makes drinking feel encouraged."
      ),
      makeAction(
        "rewrite",
        "Trim detail",
        "Keep only the narrative detail needed instead of highlighting the act itself."
      ),
      makeAction(
        "required",
        "Check whether a warning is required",
        "If posting policy requires a substance-use warning for this scene, add it before resubmission."
      ),
      makeAction(
        "next",
        "Resubmit for recheck",
        "Ask for another moderation pass after the wording is revised."
      ),
    ]);
  }

  if (key.includes("harassment") || containsAny(haystack, HARASSMENT_TERMS)) {
    return dedupeActions([
      makeAction(
        "required",
        "Remove direct attack",
        "Delete or rewrite insults, humiliation, or targeted abusive wording."
      ),
      makeAction(
        "rewrite",
        "Use neutral tone",
        "Keep the conflict in the scene without phrasing it as direct harassment."
      ),
      makeAction(
        "next",
        "Escalate if targeted",
        "Escalate for manual review if the content targets a protected group or repeated abuse."
      ),
    ]);
  }

  if (key.includes("sexual") || containsAny(haystack, SEXUAL_TERMS)) {
    return dedupeActions([
      makeAction(
        "required",
        "Reduce explicit detail",
        "Remove graphic sexual wording or intimate physical detail that is more explicit than necessary."
      ),
      makeAction(
        "rewrite",
        "Imply instead of describe",
        "Reframe the scene with less explicit phrasing and avoid step-by-step physical description."
      ),
      makeAction(
        "next",
        "Check age context",
        "Escalate immediately if the scene could involve minors or ambiguous age context."
      ),
    ]);
  }

  if (key.includes("violence") || containsAny(haystack, VIOLENCE_TERMS)) {
    return dedupeActions([
      makeAction(
        "required",
        "Tone down gore",
        "Remove or soften graphic injury, gore, or torture detail."
      ),
      makeAction(
        "rewrite",
        "Keep plot context",
        "Preserve the event itself, but avoid lingering on bodily damage."
      ),
      makeAction(
        "next",
        "Resubmit for recheck",
        "Ask for another moderation pass after revising the violent description."
      ),
    ]);
  }

  if (key.includes("spam") || containsAny(haystack, SPAM_TERMS)) {
    return dedupeActions([
      makeAction(
        "required",
        "Remove promotion",
        "Delete repeated promotion, external links, or sales-style calls to action."
      ),
      makeAction(
        "rewrite",
        "Keep story-only content",
        "Keep the chapter focused on narrative content rather than off-platform promotion."
      ),
      makeAction(
        "next",
        "Review repetition",
        "Check nearby lines for repeated marketing language before re-submitting."
      ),
    ]);
  }

  if (key.includes("misinformation") || containsAny(haystack, MISINFO_TERMS)) {
    return dedupeActions([
      makeAction(
        "required",
        "Add factual context",
        "Remove unsupported claims or clearly frame them as opinion, fiction, or uncertainty."
      ),
      makeAction(
        "rewrite",
        "Avoid certainty",
        "Replace absolute or misleading wording with neutral phrasing."
      ),
      makeAction(
        "next",
        "Escalate if sensitive",
        "Escalate for manual review if the claim relates to health, safety, or legal advice."
      ),
    ]);
  }

  if (key.includes("language")) {
    return dedupeActions([
      makeAction(
        "required",
        "Soften wording",
        "Replace profane or abusive wording with milder language."
      ),
      makeAction(
        "rewrite",
        "Keep intent, reduce toxicity",
        "Preserve the character tone without making the line unnecessarily hostile."
      ),
      makeAction(
        "next",
        "Resubmit for recheck",
        "Ask for another moderation pass after revising the wording."
      ),
    ]);
  }

  if (finding.verdict === "block") {
    return dedupeActions([
      makeAction(
        "required",
        "Edit before resubmission",
        "This finding is severe enough that the flagged content should be removed or rewritten before the chapter is reviewed again."
      ),
      makeAction(
        "rewrite",
        "Narrow the risky detail",
        "Keep only the minimum story context needed and cut detail that increases policy risk."
      ),
      makeAction(
        "next",
        "Resubmit or escalate",
        "Ask for another moderation pass after editing. Escalate if the intent or category is still unclear."
      ),
    ]);
  }

  if (finding.verdict === "warn") {
    return dedupeActions([
      makeAction(
        "required",
        "Revise wording",
        "Adjust the highlighted wording so the risky element is less explicit, promotional, or normalizing."
      ),
      makeAction(
        "rewrite",
        "Add context if needed",
        "Add caution, consequence, or clearer narrative framing if policy requires contextualization."
      ),
      makeAction(
        "next",
        "Resubmit after edit",
        "Ask for another moderation pass after editing or request manual review."
      ),
    ]);
  }

  return dedupeActions([
    makeAction(
      "next",
      "No urgent author edit",
      "No immediate revision is required, but keep this rule in mind if the chapter is updated again."
    ),
  ]);
}

export function sortFindingsBySeverity<
  T extends { verdict: Finding["verdict"]; originalIndex?: number }
>(findings: T[]) {
  const order: Record<Finding["verdict"], number> = {
    block: 0,
    warn: 1,
    pass: 2,
  };

  return [...findings].sort((a, b) => {
    const diff = order[a.verdict] - order[b.verdict];
    if (diff !== 0) return diff;
    return (a.originalIndex ?? 0) - (b.originalIndex ?? 0);
  });
}

export function deriveFindings(
  findings: Finding[],
  policyIndex?: Record<string, string>
): ProcessedFinding[] {
  return sortFindingsBySeverity(
    (findings || []).map((finding, index) => {
      const { reason, evidenceText } = parseFindingRationale(finding.rationale);
      const moderatorActions = getModeratorActions(finding, evidenceText, reason);
      const fixActions = getSuggestedActions(finding, evidenceText, reason);
      const moderatorGuidance = buildModeratorGuidance(
        finding,
        reason,
        moderatorActions
      );
      const authorGuidance = buildAuthorGuidance(finding, reason, fixActions);

      const matchStrategy: FindingMatchStrategy =
        Array.isArray(finding.spans) && finding.spans.length > 0
          ? "span"
          : evidenceText
          ? evidenceText.length > 120
            ? "fragment"
            : "excerpt"
          : "general";

      const locationLabel =
        matchStrategy === "span"
          ? `${finding.spans?.length || 1} precise text span${(finding.spans?.length || 1) > 1 ? "s" : ""}`
          : matchStrategy === "fragment"
          ? "Best matched through multiple evidence fragments"
          : matchStrategy === "excerpt"
          ? "Best matched from the evidence excerpt"
          : "Manual review may be needed";

      const severityRank =
        finding.verdict === "block" ? 0 : finding.verdict === "warn" ? 1 : 2;

      return {
        ...finding,
        highlightId: `finding-${index}`,
        displayTitle: resolveProcessedFindingTitle(finding, policyIndex),
        parsedReason: reason,
        evidenceText,
        primaryAction: moderatorGuidance.actionLabel,
        moderatorGuidance,
        authorGuidance,
        moderatorActions,
        fixActions,
        locationLabel,
        matchStrategy,
        severityRank,
        originalIndex: index,
      };
    })
  );
}

function normalizeWithMap(input: string) {
  const chars: string[] = [];
  const map: number[] = [];
  let prevWasSpace = false;

  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i];
    const isSpace = /\s/.test(raw);

    if (isSpace) {
      if (!prevWasSpace && chars.length > 0) {
        chars.push(" ");
        map.push(i);
      }
      prevWasSpace = true;
      continue;
    }

    chars.push(raw.toLowerCase());
    map.push(i);
    prevWasSpace = false;
  }

  if (chars[chars.length - 1] === " ") {
    chars.pop();
    map.pop();
  }

  return {
    normalized: chars.join(""),
    map,
  };
}

function mergeRanges(ranges: TextRange[]) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ ...range });
      continue;
    }

    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
      continue;
    }

    merged.push({ ...range });
  }

  return merged;
}

function findSingleRange(fullText: string, query: string): TextRange | null {
  const cleanedQuery = stripWrappingQuotes(query);
  if (!cleanedQuery || cleanedQuery.length < 4) return null;

  const exactIndex = fullText.toLowerCase().indexOf(cleanedQuery.toLowerCase());
  if (exactIndex >= 0) {
    return {
      start: exactIndex,
      end: exactIndex + cleanedQuery.length,
    };
  }

  const source = normalizeWithMap(fullText);
  const target = normalizeWithMap(cleanedQuery).normalized;
  if (!target) return null;

  const normalizedIndex = source.normalized.indexOf(target);
  if (normalizedIndex >= 0) {
    return {
      start: source.map[normalizedIndex],
      end: source.map[normalizedIndex + target.length - 1] + 1,
    };
  }

  return null;
}

function buildEvidenceFragments(evidenceText: string) {
  const cleaned = stripWrappingQuotes(evidenceText).replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const sentenceParts = cleaned
    .split(/[\n\r]+|[.!?。！？]+|[;；]+/)
    .flatMap((part) => {
      const trimmed = part.trim();

      if (!trimmed) return [];
      if (trimmed.length <= 90) return [trimmed];

      return trimmed
        .split(/[,:，：]/)
        .map((item) => item.trim())
        .filter(Boolean);
    });

  const candidates = [cleaned, ...sentenceParts]
    .map((item) => stripWrappingQuotes(item))
    .filter((item) => item.length >= 5);

  const unique: string[] = [];

  for (const candidate of candidates) {
    if (unique.some((item) => item.toLowerCase() === candidate.toLowerCase())) {
      continue;
    }
    unique.push(candidate);
  }

  return unique.slice(0, 6);
}

function findEvidenceRanges(fullText: string, evidenceText: string) {
  const wholeMatch = findSingleRange(fullText, evidenceText);
  if (wholeMatch) {
    return {
      ranges: [wholeMatch],
      strategy: "excerpt" as FindingMatchStrategy,
    };
  }

  const fragments = buildEvidenceFragments(evidenceText);
  const ranges: TextRange[] = [];

  for (const fragment of fragments) {
    const range = findSingleRange(fullText, fragment);
    if (range) {
      ranges.push(range);
    }

    if (ranges.length >= 5) break;
  }

  if (ranges.length > 0) {
    return {
      ranges: mergeRanges(ranges),
      strategy:
        ranges.length > 1
          ? ("fragment" as FindingMatchStrategy)
          : ("excerpt" as FindingMatchStrategy),
    };
  }

  if (evidenceText.length > 48) {
    const fallback = findSingleRange(fullText, evidenceText.slice(0, 56));
    if (fallback) {
      return {
        ranges: [fallback],
        strategy: "fragment" as FindingMatchStrategy,
      };
    }
  }

  return {
    ranges: [],
    strategy: "general" as FindingMatchStrategy,
  };
}

function collectTextNodes(root: HTMLElement) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  return textNodes;
}

function applyHighlightRange(
  root: HTMLElement,
  start: number,
  end: number,
  className: string,
  anchorId?: string
) {
  if (start >= end) return false;

  const doc = root.ownerDocument;
  const textNodes = collectTextNodes(root);

  let cursor = 0;
  let matched = false;
  let anchorApplied = false;

  for (const node of textNodes) {
    const value = node.nodeValue || "";
    const nodeStart = cursor;
    const nodeEnd = cursor + value.length;

    const overlapStart = Math.max(start, nodeStart);
    const overlapEnd = Math.min(end, nodeEnd);

    if (overlapStart < overlapEnd) {
      const relativeStart = overlapStart - nodeStart;
      const relativeEnd = overlapEnd - nodeStart;

      const before = value.slice(0, relativeStart);
      const target = value.slice(relativeStart, relativeEnd);
      const after = value.slice(relativeEnd);

      const fragment = doc.createDocumentFragment();

      if (before) fragment.appendChild(doc.createTextNode(before));

      const mark = doc.createElement("mark");
      mark.className = className;
      mark.textContent = target;

      if (!anchorApplied && anchorId) {
        mark.setAttribute("data-finding-anchor", anchorId);
        anchorApplied = true;
      }

      fragment.appendChild(mark);

      if (after) fragment.appendChild(doc.createTextNode(after));

      node.parentNode?.replaceChild(fragment, node);
      matched = true;
    }

    cursor = nodeEnd;
  }

  return matched;
}

function applyHighlightRanges(
  root: HTMLElement,
  ranges: TextRange[],
  className: string,
  anchorId?: string
) {
  const merged = mergeRanges(ranges);
  const earliestStart = merged[0]?.start;
  let matchedCount = 0;

  [...merged]
    .sort((a, b) => b.start - a.start)
    .forEach((range) => {
      const didMatch = applyHighlightRange(
        root,
        range.start,
        range.end,
        className,
        range.start === earliestStart ? anchorId : undefined
      );

      if (didMatch) matchedCount += 1;
    });

  return matchedCount;
}

export function buildHighlightedHtml(
  sourceHtml: string,
  finding?: ProcessedFinding | null
) {
  if (!finding) {
    return {
      html: sourceHtml,
      matched: false,
      matchedCount: 0,
      strategy: "general" as FindingMatchStrategy,
      anchorId: undefined as string | undefined,
    };
  }

  if (typeof window === "undefined") {
    return {
      html: sourceHtml,
      matched: false,
      matchedCount: 0,
      strategy: finding.matchStrategy,
      anchorId: undefined as string | undefined,
    };
  }

  try {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(
      `<div data-moderation-root="true">${sourceHtml || ""}</div>`,
      "text/html"
    );

    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) {
      return {
        html: sourceHtml,
        matched: false,
        matchedCount: 0,
        strategy: finding.matchStrategy,
        anchorId: undefined as string | undefined,
      };
    }

    const anchorId = `finding-anchor-${finding.highlightId}`;
    const highlightClass =
      finding.verdict === "block"
        ? "rounded bg-red-200/90 px-1 py-0.5 ring-1 ring-red-300"
        : finding.verdict === "warn"
        ? "rounded bg-yellow-200/90 px-1 py-0.5 ring-1 ring-yellow-300"
        : "rounded bg-emerald-200/90 px-1 py-0.5 ring-1 ring-emerald-300";

    const validSpans =
      finding.spans?.filter(
        (span) =>
          typeof span?.start === "number" &&
          typeof span?.end === "number" &&
          span.end > span.start
      ) || [];

    if (validSpans.length > 0) {
      const matchedCount = applyHighlightRanges(
        root,
        validSpans,
        highlightClass,
        anchorId
      );

      if (matchedCount > 0) {
        return {
          html: root.innerHTML,
          matched: true,
          matchedCount,
          strategy: "span" as FindingMatchStrategy,
          anchorId,
        };
      }
    }

    if (finding.evidenceText) {
      const textContent = root.textContent || "";
      const result = findEvidenceRanges(textContent, finding.evidenceText);

      if (result.ranges.length > 0) {
        const matchedCount = applyHighlightRanges(
          root,
          result.ranges,
          highlightClass,
          anchorId
        );

        if (matchedCount > 0) {
          return {
            html: root.innerHTML,
            matched: true,
            matchedCount,
            strategy: result.strategy,
            anchorId,
          };
        }
      }
    }

    return {
      html: root.innerHTML,
      matched: false,
      matchedCount: 0,
      strategy: finding.matchStrategy,
      anchorId: undefined as string | undefined,
    };
  } catch {
    return {
      html: sourceHtml,
      matched: false,
      matchedCount: 0,
      strategy: finding.matchStrategy,
      anchorId: undefined as string | undefined,
    };
  }
}
