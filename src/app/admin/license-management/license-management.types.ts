import {
  type RightsBasis,
  type RightsReviewStatus,
  type StoryMonetizationType,
  type StoryOriginType,
} from "@/lib/story-rights";

export type MangaLicenseStatus = "none" | "pending" | "approved" | "rejected";
export type AdminRightsBasis =
  | RightsBasis
  | "open_license"
  | "public_domain"
  | (string & {});
export type AdminClaimStatus = "none" | "open" | "resolved" | (string & {});

export type QueueItem = {
  _id: string;
  title: string;
  coverImage?: string;
  isPublish?: boolean;
  status?: string;
  licenseStatus: MangaLicenseStatus;
  licenseSubmittedAt?: string;
  enforcementStatus?: "normal" | "suspended" | "banned";
  authorId?: {
    _id?: string;
    username?: string;
    email?: string;
  };
  rightsStatus: RightsReviewStatus;
  originType: StoryOriginType;
  monetizationType: StoryMonetizationType;
  rightsBasis: AdminRightsBasis;
  verifiedBadge: boolean;
};

export type LicenseDetail = QueueItem & {
  licenseFiles?: string[];
  licenseNote?: string;
  licenseRejectReason?: string;
  licenseRejectReasons?: string[];
  licenseReviewedAt?: string;
  enforcementReason?: string;
  rights?: {
    originType?: StoryOriginType;
    basis?: AdminRightsBasis;
    monetizationType?: StoryMonetizationType;
    sourceTitle?: string;
    sourceUrl?: string;
    licenseName?: string;
    licenseUrl?: string;
    proofNote?: string;
    proofFiles?: string[];
    claimStatus?: AdminClaimStatus;
  };
};

export type LicenseQueueResponse = {
  data: QueueItem[];
  total: number;
  page: number;
  limit: number;
  stats: Record<string, number>;
};

export type FetchQueueOptions = {
  preferredSelectedId?: string | null;
  forceDetailRefresh?: boolean;
};

export type ActionState = "approve" | "reject" | null;

export type ActionFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};
