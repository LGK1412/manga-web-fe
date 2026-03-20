import type { Finding } from "@/lib/typesLogs";

export type FindingMatchStrategy = "span" | "excerpt" | "fragment" | "general";

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
  fixActions: FindingActionItem[];
  locationLabel: string;
  matchStrategy: FindingMatchStrategy;
  severityRank: number;
  originalIndex: number;
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

export function getSuggestedActions(
  sectionId: string,
  verdict: Finding["verdict"],
  evidenceText?: string,
  reason?: string
) {
  const key = String(sectionId || "").toLowerCase();
  const haystack = `${key} ${reason || ""} ${evidenceText || ""}`.toLowerCase();

  if (containsAny(haystack, ALCOHOL_TERMS) && containsAny(haystack, MINOR_TERMS)) {
    return dedupeActions([
      makeAction(
        "required",
        "Add warning",
        "Add an age/substance-use warning if your posting policy requires it."
      ),
      makeAction(
        "rewrite",
        "Rewrite risky lines",
        "Soften casual or celebratory wording around students or underage drinking."
      ),
      makeAction(
        "rewrite",
        "Keep context only",
        "Retain only the story context needed for the scene and avoid glamorizing the behavior."
      ),
      makeAction(
        "next",
        "Run recheck",
        "Re-run AI moderation after editing, or escalate to manual review if the age context is unclear."
      ),
    ]);
  }

  if (containsAny(haystack, ALCOHOL_TERMS)) {
    return dedupeActions([
      makeAction(
        "required",
        "Check warning label",
        "Add a substance-use warning if the platform requires one for this type of scene."
      ),
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
        "next",
        "Run recheck",
        "Run AI moderation again after the wording is revised."
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
        "Re-run moderation",
        "Run the AI check again after revising the violent description."
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
        "Run recheck",
        "Run AI moderation again after revising the wording."
      ),
    ]);
  }

  if (verdict === "block") {
    return dedupeActions([
      makeAction(
        "required",
        "Edit before publish",
        "This finding is severe enough that the flagged content should be removed or rewritten before approval."
      ),
      makeAction(
        "rewrite",
        "Narrow the risky detail",
        "Keep only the minimum story context needed and cut detail that increases policy risk."
      ),
      makeAction(
        "next",
        "Recheck or escalate",
        "Re-run AI moderation after editing. Escalate if the intent or category is still unclear."
      ),
    ]);
  }

  if (verdict === "warn") {
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
        "Review after edit",
        "Run AI moderation again after editing or send back for manual review."
      ),
    ]);
  }

  return dedupeActions([
    makeAction(
      "next",
      "No urgent edit",
      "No immediate edit is required, but keep this rule in mind if the chapter is revised again."
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
      const fixActions = getSuggestedActions(
        finding.sectionId,
        finding.verdict,
        evidenceText,
        reason
      );

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
        displayTitle: resolveFindingTitle(finding.sectionId, policyIndex),
        parsedReason: reason,
        evidenceText,
        primaryAction: fixActions[0]?.label || "Review",
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