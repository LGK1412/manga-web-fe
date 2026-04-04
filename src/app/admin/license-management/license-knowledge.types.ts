export type KnowledgeRightsBasis =
  | "unknown"
  | "self_declaration"
  | "owner_authorization"
  | "publisher_contract"
  | "open_license"
  | "public_domain";

export type LicenseGuideCaseId =
  | "enforcement_blocked"
  | "under_claim"
  | "original_self_declaration"
  | "translated"
  | "adapted"
  | "repost"
  | "open_license"
  | "public_domain"
  | "authorized_distribution"
  | "general_review";

export type LicenseTheoryTopicId =
  | "proof"
  | "authorization"
  | "translation"
  | "open_license"
  | "public_domain"
  | "claim"
  | "scope"
  | "references";

export type LicenseRejectTemplate = {
  id: string;
  label: string;
  text: string;
};

export type LicenseGuideReviewLevel =
  | "light"
  | "standard"
  | "strict"
  | "blocked";

export type LicenseCaseGuide = {
  id: LicenseGuideCaseId;
  title: string;
  reviewLevel: LicenseGuideReviewLevel;
  summary: string;
  checklist: string[];
  sourceChecks: string[];
  redFlags: string[];
  recommendedAction: string;
  escalateWhen: string[];
  rejectTemplates: LicenseRejectTemplate[];
  theoryTopics: LicenseTheoryTopicId[];
};

export type LicenseReferenceLink = {
  label: string;
  href: string;
};

export type LicenseTheoryEntry = {
  id: string;
  title: string;
  topics: LicenseTheoryTopicId[];
  summary: string;
  appliesWhen: string[];
  commonMistakes: string[];
  references: LicenseReferenceLink[];
};

export type DerivedLicenseContext = {
  caseId: LicenseGuideCaseId;
  caseTitle: string;
  reviewLevel: LicenseGuideReviewLevel;
  originType: string;
  normalizedBasis: KnowledgeRightsBasis;
  licenseStatus: string;
  rightsStatus: string;
  claimStatus: string;
  enforcementStatus: string;
  isStrictCase: boolean;
  hasSourceReference: boolean;
  hasLicenseReference: boolean;
  hasProofFiles: boolean;
  hasProofNote: boolean;
  theoryTopics: LicenseTheoryTopicId[];
};

export type TheoryTopicMeta = {
  id: LicenseTheoryTopicId;
  label: string;
};
