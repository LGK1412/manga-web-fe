export type StoryOriginType =
  | "unknown"
  | "original"
  | "translated"
  | "adapted"
  | "repost"
  | "cc_licensed"
  | "public_domain";

export type StoryMonetizationType = "free" | "ads" | "paid";

export type RightsBasis =
  | "unknown"
  | "self_declaration"
  | "owner_authorization"
  | "publisher_contract";

export type RightsReviewStatus =
  | "not_required"
  | "declared"
  | "pending"
  | "approved"
  | "rejected"
  | "under_claim";

export type CopyrightClaimStatus = "none" | "open" | "resolved";

export type LicenseStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type StoryRights = {
  originType: StoryOriginType;
  monetizationType: StoryMonetizationType;
  basis: RightsBasis;

  declarationAccepted: boolean;
  declarationAcceptedAt: string | null;
  declarationVersion: string;

  sourceTitle: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;

  proofFiles: string[];
  proofNote: string;

  reviewStatus: RightsReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectReason: string;

  claimStatus: CopyrightClaimStatus;
  claimOpenedAt: string | null;
  claimResolvedAt: string | null;
};

export type PublishEligibility = {
  canPublish: boolean;
  requiresReview: boolean;
  reason: string | null;
};

export type StoryRightsResponse = {
  rights?: Partial<StoryRights>;
  rightsStatus?: RightsReviewStatus | string;
  licenseStatus?: LicenseStatus | string;
  verifiedBadge?: boolean;
  publishEligibility?: PublishEligibility;
  publishReason?: string | null;
  canPublish?: boolean;
  licenseSubmittedAt?: string | null;
  licenseReviewedAt?: string | null;
  licenseRejectReason?: string | null;
  licenseRejectReasons?: string[] | null;
};

type RejectReasonPayload = {
  licenseRejectReason?: string | null;
  licenseRejectReasons?: unknown;
  rights?: Record<string, unknown> | null;
};

function normalizeRejectReasonValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRejectReasonHistory(
  input: RejectReasonPayload | null | undefined,
) {
  const history = Array.isArray(input?.licenseRejectReasons)
    ? input.licenseRejectReasons
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const latestReason = normalizeRejectReasonValue(input?.licenseRejectReason);
  const rightsReason = normalizeRejectReasonValue(
    input?.rights ? input.rights["rejectReason"] : undefined,
  );

  if (latestReason && !history.includes(latestReason)) {
    history.push(latestReason);
  }

  if (rightsReason && !history.includes(rightsReason)) {
    history.push(rightsReason);
  }

  return history;
}

export function getLatestRejectReason(
  input: RejectReasonPayload | null | undefined,
) {
  const latestReason = normalizeRejectReasonValue(input?.licenseRejectReason);

  if (latestReason) {
    return latestReason;
  }

  const history = normalizeRejectReasonHistory(input);
  return history.length > 0 ? history[history.length - 1] : "";
}

export const ORIGIN_OPTIONS: Array<{
  value: StoryOriginType;
  label: string;
  hint: string;
}> = [
  {
    value: "unknown",
    label: "Unknown / not set",
    hint: "Use this only temporarily while drafting.",
  },
  {
    value: "original",
    label: "Original",
    hint: "You created the story yourself.",
  },
  {
    value: "translated",
    label: "Translated",
    hint: "This story is translated from another source.",
  },
  {
    value: "adapted",
    label: "Adapted",
    hint: "This story is adapted from another work.",
  },
  {
    value: "repost",
    label: "Repost / mirror",
    hint: "This is a repost or re-upload of existing content.",
  },
  {
    value: "cc_licensed",
    label: "Creative Commons / open license",
    hint: "Use when the work is published under an open license.",
  },
  {
    value: "public_domain",
    label: "Public domain",
    hint: "Use when the source work is public domain.",
  },
];

export const MONETIZATION_OPTIONS: Array<{
  value: StoryMonetizationType;
  label: string;
  hint: string;
}> = [
  {
    value: "free",
    label: "Free",
    hint: "Readers can access this story for free.",
  },
  {
    value: "ads",
    label: "Ad-supported",
    hint: "The story is free, but monetized with ads.",
  },
  {
    value: "paid",
    label: "Paid / premium",
    hint: "The story is monetized directly.",
  },
];

export const RIGHTS_BASIS_OPTIONS: Array<{
  value: RightsBasis;
  label: string;
  hint: string;
}> = [
  {
    value: "unknown",
    label: "Unknown / not set",
    hint: "Temporary option while the story is still a draft.",
  },
  {
    value: "self_declaration",
    label: "Self declaration",
    hint: "Use when you are the original owner and can declare that directly.",
  },
  {
    value: "owner_authorization",
    label: "Owner authorization",
    hint: "You have permission from the copyright owner.",
  },
  {
    value: "publisher_contract",
    label: "Publisher / distribution contract",
    hint: "You have a publishing contract or formal distribution agreement.",
  },
];

export const RIGHTS_STATUS_META: Record<
  RightsReviewStatus,
  { label: string; className: string }
> = {
  not_required: {
    label: "Not required",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  declared: {
    label: "Declared",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  pending: {
    label: "Pending review",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  under_claim: {
    label: "Under claim",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export const LICENSE_STATUS_META: Record<
  "none" | "pending" | "approved" | "rejected",
  { label: string; className: string }
> = {
  none: {
    label: "No license",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  pending: {
    label: "Under review",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export const ORIGIN_VALUES = new Set<StoryOriginType>(
  ORIGIN_OPTIONS.map((item) => item.value),
);

export const MONETIZATION_VALUES = new Set<StoryMonetizationType>(
  MONETIZATION_OPTIONS.map((item) => item.value),
);

export const BASIS_VALUES = new Set<RightsBasis>(
  RIGHTS_BASIS_OPTIONS.map((item) => item.value),
);

const REVIEW_STATUS_VALUES = new Set<RightsReviewStatus>([
  "not_required",
  "declared",
  "pending",
  "approved",
  "rejected",
  "under_claim",
]);

const CLAIM_STATUS_VALUES = new Set<CopyrightClaimStatus>([
  "none",
  "open",
  "resolved",
]);

function normalizeEnumLike<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase() as T;
  return allowed.has(normalized) ? normalized : fallback;
}

export function normalizeLicenseStatus(
  value?: string | null,
): "none" | "pending" | "approved" | "rejected" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "none";
}

export function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeOptionalUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getDefaultRights(): StoryRights {
  return {
    originType: "unknown",
    monetizationType: "free",
    basis: "unknown",

    declarationAccepted: false,
    declarationAcceptedAt: null,
    declarationVersion: "v1",

    sourceTitle: "",
    sourceUrl: "",
    licenseName: "",
    licenseUrl: "",

    proofFiles: [],
    proofNote: "",

    reviewStatus: "not_required",
    reviewedAt: null,
    reviewedBy: null,
    rejectReason: "",

    claimStatus: "none",
    claimOpenedAt: null,
    claimResolvedAt: null,
  };
}

export function isStrictReviewCase(
  rights: Pick<StoryRights, "originType" | "basis">,
) {
  return (
    rights.originType === "translated" ||
    rights.originType === "adapted" ||
    rights.originType === "repost" ||
    rights.basis === "owner_authorization" ||
    rights.basis === "publisher_contract"
  );
}

export function needsDeclaration(
  rights: Pick<StoryRights, "originType" | "basis">,
) {
  return rights.originType === "original" && rights.basis === "self_declaration";
}

export function needsSourceReference(
  rights: Pick<StoryRights, "originType">,
) {
  return (
    rights.originType === "translated" ||
    rights.originType === "adapted" ||
    rights.originType === "repost" ||
    rights.originType === "cc_licensed" ||
    rights.originType === "public_domain"
  );
}

export function needsLicenseReference(
  rights: Pick<StoryRights, "originType" | "basis">,
) {
  return (
    rights.originType === "cc_licensed" ||
    rights.basis === "owner_authorization" ||
    rights.basis === "publisher_contract"
  );
}

export function buildRightsPayload(
  rights: Pick<
    StoryRights,
    | "originType"
    | "monetizationType"
    | "basis"
    | "sourceTitle"
    | "sourceUrl"
    | "licenseName"
    | "licenseUrl"
  >,
) {
  const sourceTitle = cleanOptionalText(rights.sourceTitle);
  const sourceUrl = normalizeOptionalUrl(rights.sourceUrl);
  const licenseName = cleanOptionalText(rights.licenseName);
  const licenseUrl = normalizeOptionalUrl(rights.licenseUrl);

  return {
    originType: rights.originType,
    monetizationType: rights.monetizationType,
    basis: rights.basis,
    ...(sourceTitle ? { sourceTitle } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(licenseName ? { licenseName } : {}),
    ...(licenseUrl ? { licenseUrl } : {}),
  };
}

export function evaluateClientPublishReadiness(
  rightsInput: Partial<StoryRights>,
): PublishEligibility {
  const rights = { ...getDefaultRights(), ...rightsInput };

  if (rights.claimStatus === "open" || rights.reviewStatus === "under_claim") {
    return {
      canPublish: false,
      requiresReview: true,
      reason: "Cannot publish while the story is under copyright claim.",
    };
  }

  return {
    canPublish: true,
    requiresReview: false,
    reason: null,
  };
}

export function normalizeStoryRightsResponse(
  input: StoryRightsResponse | null | undefined,
): StoryRights {
  const base = getDefaultRights();
  const rawRights = {
    ...base,
    ...(input?.rights ?? {}),
  };

  return {
    ...base,
    ...rawRights,

    originType: normalizeEnumLike(
      rawRights.originType,
      ORIGIN_VALUES,
      base.originType,
    ),
    monetizationType: normalizeEnumLike(
      rawRights.monetizationType,
      MONETIZATION_VALUES,
      base.monetizationType,
    ),
    basis: normalizeEnumLike(rawRights.basis, BASIS_VALUES, base.basis),
    reviewStatus: normalizeEnumLike(
      input?.rightsStatus ?? rawRights.reviewStatus,
      REVIEW_STATUS_VALUES,
      base.reviewStatus,
    ),
    claimStatus: normalizeEnumLike(
      rawRights.claimStatus,
      CLAIM_STATUS_VALUES,
      base.claimStatus,
    ),

    declarationAccepted: Boolean(rawRights.declarationAccepted),
    declarationAcceptedAt:
      typeof rawRights.declarationAcceptedAt === "string"
        ? rawRights.declarationAcceptedAt
        : null,
    declarationVersion:
      typeof rawRights.declarationVersion === "string" &&
      rawRights.declarationVersion.trim()
        ? rawRights.declarationVersion.trim()
        : "v1",

    sourceTitle:
      typeof rawRights.sourceTitle === "string" ? rawRights.sourceTitle : "",
    sourceUrl: typeof rawRights.sourceUrl === "string" ? rawRights.sourceUrl : "",
    licenseName:
      typeof rawRights.licenseName === "string" ? rawRights.licenseName : "",
    licenseUrl:
      typeof rawRights.licenseUrl === "string" ? rawRights.licenseUrl : "",

    proofFiles: Array.isArray(rawRights.proofFiles)
      ? rawRights.proofFiles.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    proofNote: typeof rawRights.proofNote === "string" ? rawRights.proofNote : "",

    reviewedAt:
      typeof rawRights.reviewedAt === "string" ? rawRights.reviewedAt : null,
    reviewedBy:
      typeof rawRights.reviewedBy === "string" ? rawRights.reviewedBy : null,
    rejectReason:
      typeof rawRights.rejectReason === "string" ? rawRights.rejectReason : "",

    claimOpenedAt:
      typeof rawRights.claimOpenedAt === "string" ? rawRights.claimOpenedAt : null,
    claimResolvedAt:
      typeof rawRights.claimResolvedAt === "string"
        ? rawRights.claimResolvedAt
        : null,
  };
}
