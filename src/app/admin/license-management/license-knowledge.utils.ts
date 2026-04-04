import { LICENSE_CASE_GUIDES, LICENSE_THEORY_ENTRIES } from "./license-knowledge.data";
import type {
  DerivedLicenseContext,
  KnowledgeRightsBasis,
  LicenseCaseGuide,
  LicenseGuideCaseId,
  LicenseTheoryEntry,
  LicenseTheoryTopicId,
} from "./license-knowledge.types";
import type { AdminRightsBasis, LicenseDetail } from "./license-management.types";

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeKnowledgeRightsBasis(
  value?: AdminRightsBasis | null,
): KnowledgeRightsBasis {
  const normalized = normalizeText(value);

  if (normalized === "self_declaration") return "self_declaration";
  if (normalized === "owner_authorization") return "owner_authorization";
  if (normalized === "publisher_contract") return "publisher_contract";
  if (normalized === "open_license") return "open_license";
  if (normalized === "public_domain") return "public_domain";
  return "unknown";
}

function deriveCaseId(selected: LicenseDetail): LicenseGuideCaseId {
  const originType = normalizeText(selected.originType);
  const basis = normalizeKnowledgeRightsBasis(selected.rightsBasis);
  const rightsStatus = normalizeText(selected.rightsStatus);
  const claimStatus = normalizeText(selected.rights?.claimStatus);
  const enforcementStatus = normalizeText(selected.enforcementStatus);

  if (enforcementStatus === "suspended" || enforcementStatus === "banned") {
    return "enforcement_blocked";
  }

  if (claimStatus === "open" || rightsStatus === "under_claim") {
    return "under_claim";
  }

  if (originType === "public_domain" || basis === "public_domain") {
    return "public_domain";
  }

  if (originType === "cc_licensed" || basis === "open_license") {
    return "open_license";
  }

  if (originType === "translated") return "translated";
  if (originType === "adapted") return "adapted";
  if (originType === "repost") return "repost";

  if (originType === "original" && basis === "self_declaration") {
    return "original_self_declaration";
  }

  if (basis === "owner_authorization" || basis === "publisher_contract") {
    return "authorized_distribution";
  }

  return "general_review";
}

function buildTheoryTopics(
  caseId: LicenseGuideCaseId,
  basis: KnowledgeRightsBasis,
  claimStatus: string,
): LicenseTheoryTopicId[] {
  const topics = new Set<LicenseTheoryTopicId>(["proof", "references"]);

  if (
    basis === "owner_authorization" ||
    basis === "publisher_contract" ||
    caseId === "authorized_distribution"
  ) {
    topics.add("authorization");
    topics.add("scope");
  }

  if (caseId === "translated" || caseId === "adapted") {
    topics.add("translation");
    topics.add("authorization");
    topics.add("scope");
  }

  if (caseId === "repost") {
    topics.add("authorization");
    topics.add("scope");
  }

  if (caseId === "open_license") {
    topics.add("open_license");
    topics.add("scope");
  }

  if (caseId === "public_domain") {
    topics.add("public_domain");
  }

  if (caseId === "under_claim" || claimStatus === "open") {
    topics.add("claim");
    topics.add("authorization");
  }

  if (caseId === "enforcement_blocked") {
    topics.add("claim");
  }

  return Array.from(topics);
}

export function deriveLicenseReviewContext(
  selected: LicenseDetail | null,
): DerivedLicenseContext | null {
  if (!selected) return null;

  const caseId = deriveCaseId(selected);
  const guide = LICENSE_CASE_GUIDES.find((item) => item.id === caseId);
  const normalizedBasis = normalizeKnowledgeRightsBasis(selected.rightsBasis);
  const claimStatus = normalizeText(selected.rights?.claimStatus) || "none";
  const enforcementStatus = normalizeText(selected.enforcementStatus) || "normal";
  const sourceUrl = normalizeText(selected.rights?.sourceUrl);
  const licenseUrl = normalizeText(selected.rights?.licenseUrl);
  const proofNote = normalizeText(selected.rights?.proofNote || selected.licenseNote);
  const proofFiles = Array.isArray(selected.licenseFiles)
    ? selected.licenseFiles
    : Array.isArray(selected.rights?.proofFiles)
      ? selected.rights?.proofFiles
      : [];

  return {
    caseId,
    caseTitle: guide?.title || "Case: General review",
    reviewLevel: guide?.reviewLevel || "standard",
    originType: normalizeText(selected.originType) || "unknown",
    normalizedBasis,
    licenseStatus: normalizeText(selected.licenseStatus) || "none",
    rightsStatus: normalizeText(selected.rightsStatus) || "not_required",
    claimStatus,
    enforcementStatus,
    isStrictCase:
      caseId === "translated" ||
      caseId === "adapted" ||
      caseId === "repost" ||
      caseId === "authorized_distribution",
    hasSourceReference: Boolean(sourceUrl),
    hasLicenseReference: Boolean(licenseUrl),
    hasProofFiles: Array.isArray(proofFiles) && proofFiles.length > 0,
    hasProofNote: Boolean(proofNote),
    theoryTopics: buildTheoryTopics(caseId, normalizedBasis, claimStatus),
  };
}

export function getLicenseCaseGuide(
  context: DerivedLicenseContext | null,
): LicenseCaseGuide | null {
  if (!context) return null;
  return (
    LICENSE_CASE_GUIDES.find((item) => item.id === context.caseId) ??
    LICENSE_CASE_GUIDES.find((item) => item.id === "general_review") ??
    null
  );
}

export function getTheoryEntriesForContext(
  context: DerivedLicenseContext | null,
) {
  if (!context || context.caseId === "general_review") {
    return LICENSE_THEORY_ENTRIES;
  }

  return [...LICENSE_THEORY_ENTRIES].sort((left, right) => {
    const leftScore = left.topics.filter((topic) =>
      context.theoryTopics.includes(topic),
    ).length;
    const rightScore = right.topics.filter((topic) =>
      context.theoryTopics.includes(topic),
    ).length;

    return rightScore - leftScore;
  });
}

export function filterTheoryEntries(
  entries: LicenseTheoryEntry[],
  searchQuery: string,
  activeTopic: LicenseTheoryTopicId | "all",
) {
  const normalizedSearch = normalizeText(searchQuery);

  return entries.filter((entry) => {
    const matchesTopic =
      activeTopic === "all" ? true : entry.topics.includes(activeTopic);

    if (!matchesTopic) return false;
    if (!normalizedSearch) return true;

    const haystack = [
      entry.title,
      entry.summary,
      ...entry.appliesWhen,
      ...entry.commonMistakes,
      ...entry.topics,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export function getReviewLevelMeta(level: DerivedLicenseContext["reviewLevel"]) {
  if (level === "light") {
    return {
      label: "Light review",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (level === "strict") {
    return {
      label: "Strict review",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (level === "blocked") {
    return {
      label: "Blocked",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "Standard review",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  };
}

export function getContextSummaryChips(context: DerivedLicenseContext | null) {
  if (!context) return [];

  return [
    `Origin: ${context.originType || "unknown"}`,
    `Basis: ${context.normalizedBasis}`,
    `License: ${context.licenseStatus}`,
    `Rights: ${context.rightsStatus}`,
  ];
}
