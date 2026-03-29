"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StoryRightsSection } from "@/components/story-rights/story-rights-section";
import {
  buildRightsPayload,
  evaluateClientPublishReadiness,
  getLatestRejectReason,
  getDefaultRights,
  LICENSE_STATUS_META,
  normalizeRejectReasonHistory,
  RIGHTS_STATUS_META,
  type StoryRights,
  type StoryRightsResponse,
} from "@/lib/story-rights";

type MangaDetailResponse = {
  _id: string;
  title: string;
  coverImage?: string;
};

type GuideStep = {
  title: string;
  description: string;
};

type DocumentCase = {
  title: string;
  hint: string;
  examples: string[];
};

type TemplateCard = {
  title: string;
  description: string;
};

const submissionSteps: GuideStep[] = [
  {
    title: "Choose rights type",
    description:
      "Select whether the story is original, translated, adapted, reposted, public domain, or open-license based.",
  },
  {
    title: "Prepare supporting proof",
    description:
      "Collect contracts, permission screenshots, source links, declarations, or other records that match your selected rights type.",
  },
  {
    title: "Upload files and add note",
    description:
      "Upload the proof files and write a short note explaining what the files prove and who granted permission.",
  },
  {
    title: "Wait for review",
    description:
      "Moderators review the submission status, proof quality, and declaration completeness before approving publishing eligibility.",
  },
  {
    title: "Fix and re-upload if rejected",
    description:
      "If the submission is rejected, review the feedback, update the rights details, and upload stronger proof again.",
  },
];

const documentCases: DocumentCase[] = [
  {
    title: "Original work",
    hint: "Use this when the story is created by you or your team.",
    examples: [
      "Signed self-declaration",
      "Draft/manuscript screenshots",
      "Creation timeline or working files",
    ],
  },
  {
    title: "Translated work",
    hint: "Use this when you translated someone else's work.",
    examples: [
      "Authorization from the owner or publisher",
      "Translation permission agreement",
      "Permission email/chat screenshots",
    ],
  },
  {
    title: "Adapted work",
    hint: "Use this when the story is adapted from another source.",
    examples: [
      "Adaptation agreement",
      "Original source reference",
      "Rights holder approval record",
    ],
  },
  {
    title: "Licensed / authorized work",
    hint: "Use this for reposted or licensed distribution rights.",
    examples: [
      "Contract or license letter",
      "Official permission screenshot",
      "Publisher or platform authorization",
    ],
  },
  {
    title: "Public domain / open license",
    hint: "Use this when the source is legally reusable.",
    examples: [
      "Source URL",
      "License URL or public-domain reference",
      "Attribution note or reuse terms screenshot",
    ],
  },
];

const templateCards: TemplateCard[] = [
  {
    title: "Self-declaration template",
    description:
      "A simple statement confirming you created the work or own the rights being submitted.",
  },
  {
    title: "Authorization / permission template",
    description:
      "A sample document structure for permission from the original creator, owner, or publisher.",
  },
  {
    title: "Submission checklist",
    description:
      "A quick checklist to verify that your rights type, note, and proof files are ready before upload.",
  },
];

function getAssetCandidates(
  apiBase: string,
  filePath?: string,
  folder = "assets/licenses",
) {
  if (!filePath) return [];
  if (/^https?:\/\//i.test(filePath)) return [filePath];
  if (filePath.startsWith("/")) return [`${apiBase}${filePath}`];
  if (filePath.includes(folder)) {
    return [`${apiBase}/${filePath.replace(/^\/+/, "")}`];
  }
  return [`${apiBase}/${folder}/${filePath.replace(/^\/+/, "")}`];
}

function normalizeLicenseStatus(input?: string) {
  const value = String(input || "none").toLowerCase();
  if (value === "pending") return "pending" as const;
  if (value === "approved") return "approved" as const;
  if (value === "rejected") return "rejected" as const;
  return "none" as const;
}

function normalizeRightsResponse(
  payload: StoryRightsResponse | null | undefined,
): StoryRights {
  return {
    ...getDefaultRights(),
    ...(payload?.rights || {}),
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getLicenseStatusCopy(status: ReturnType<typeof normalizeLicenseStatus>) {
  switch (status) {
    case "approved":
      return {
        title: "Approved and ready",
        description:
          "Your latest license submission has been approved. Keep the information and proof files up to date if anything changes.",
      };
    case "pending":
      return {
        title: "Under review",
        description:
          "Your submission is being reviewed. You can still refine your rights metadata, but approval depends on moderator review.",
      };
    case "rejected":
      return {
        title: "Fix and re-upload",
        description:
          "Your previous submission was rejected. Review the feedback carefully, update the rights details, and upload clearer proof files.",
      };
    default:
      return {
        title: "Start your submission",
        description:
          "Complete the rights setup, declaration, and proof upload so your story can move toward publishing eligibility.",
      };
  }
}

function getNextAction(
  status: ReturnType<typeof normalizeLicenseStatus>,
  canPublish: boolean,
) {
  if (status === "rejected") {
    return "Update the rights form, fix the reviewer concerns, and upload stronger proof files.";
  }

  if (status === "pending") {
    return "Wait for review or add clearer supporting documents if moderators requested more evidence.";
  }

  if (canPublish) {
    return "Your rights setup currently satisfies publish checks. Keep this page updated if ownership or source information changes.";
  }

  return "Finish the rights form, save declaration, and upload the supporting files needed for your case.";
}

function StepCard({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {index}
        </div>
        <p className="font-medium text-foreground">{title}</p>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function InfoChip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export default function AuthorStoryLicensePage() {
  const params = useParams();
  const id = Array.isArray((params as any)?.id)
    ? (params as any).id[0]
    : (params as any)?.id;

  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, ""),
    [],
  );

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${apiBase}/api`,
      withCredentials: true,
    });
  }, [apiBase]);

  const [story, setStory] = useState<MangaDetailResponse | null>(null);
  const [rightsPayload, setRightsPayload] = useState<StoryRightsResponse | null>(
    null,
  );
  const [rights, setRights] = useState<StoryRights>(getDefaultRights());

  const [files, setFiles] = useState<File[]>([]);
  const [uploadNote, setUploadNote] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSavingRights, setIsSavingRights] = useState(false);
  const [isSavingDeclaration, setIsSavingDeclaration] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [referenceSections, setReferenceSections] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasAppliedReferenceDefaults = useRef(false);

  const coverUrl = (coverImage?: string) => {
    if (!coverImage) return "";
    if (/^https?:\/\//i.test(coverImage)) return coverImage;
    if (coverImage.startsWith("/")) return `${apiBase}${coverImage}`;
    return `${apiBase}/assets/coverImages/${coverImage}`;
  };

  const fetchStory = async () => {
    const res = await api.get<MangaDetailResponse>(`/manga/author/story/${id}`);
    setStory(res.data);
  };

  const fetchRights = async () => {
    const res = await api.get<StoryRightsResponse>(`/license/${id}/rights`);
    setRightsPayload(res.data);
    const normalized = normalizeRightsResponse(res.data);
    setRights(normalized);
    setUploadNote(normalized.proofNote || "");
  };

  const loadAll = async () => {
    try {
      setIsInitialLoading(true);
      setStatusError(null);
      await Promise.all([fetchStory(), fetchRights()]);
    } catch (err: any) {
      setStatusError(err?.response?.data?.message || "Failed to load story rights.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  useEffect(() => {
    hasAppliedReferenceDefaults.current = false;
    setReferenceSections([]);
  }, [id]);

  const handleSaveRights = async () => {
    try {
      setIsSavingRights(true);
      setStatusError(null);
      setSuccessMessage(null);

      const res = await api.patch<StoryRightsResponse>(
        `/license/${id}/rights`,
        buildRightsPayload(rights),
      );

      setRightsPayload(res.data);
      setRights(normalizeRightsResponse(res.data));
      setSuccessMessage("Story rights information updated.");
    } catch (err: any) {
      setStatusError(err?.response?.data?.message || "Failed to save story rights.");
    } finally {
      setIsSavingRights(false);
    }
  };

  const handleSaveDeclaration = async () => {
    try {
      setIsSavingDeclaration(true);
      setStatusError(null);
      setSuccessMessage(null);

      const res = await api.patch<StoryRightsResponse>(
        `/license/${id}/rights/declaration`,
        {
          accepted: rights.declarationAccepted,
          declarationVersion: rights.declarationVersion || "v1",
        },
      );

      setRightsPayload(res.data);
      setRights(normalizeRightsResponse(res.data));
      setSuccessMessage("Declaration updated.");
    } catch (err: any) {
      setStatusError(
        err?.response?.data?.message || "Failed to save declaration.",
      );
    } finally {
      setIsSavingDeclaration(false);
    }
  };

  const handleUploadProof = async () => {
    if (!files.length) {
      setStatusError("Please select at least one proof file.");
      return;
    }

    try {
      setIsUploadingProof(true);
      setStatusError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("note", uploadNote);

      await api.post(`/license/${id}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchRights();
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMessage("Proof documents uploaded and submitted for review.");
    } catch (err: any) {
      setStatusError(
        err?.response?.data?.message || "Failed to upload proof files.",
      );
    } finally {
      setIsUploadingProof(false);
    }
  };

  const normalizedLicense = normalizeLicenseStatus(rightsPayload?.licenseStatus);

  useEffect(() => {
    if (isInitialLoading || hasAppliedReferenceDefaults.current) return;

    setReferenceSections(
      normalizedLicense === "none" ? ["submission-guide"] : [],
    );
    hasAppliedReferenceDefaults.current = true;
  }, [isInitialLoading, normalizedLicense]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-7xl px-4 pb-10 pt-24">
          <div className="flex h-[50vh] items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading story rights...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const safeRights = rights;
  const rightsMeta = RIGHTS_STATUS_META[safeRights.reviewStatus || "not_required"];
  const licenseMeta =
    LICENSE_STATUS_META[
      normalizedLicense as keyof typeof LICENSE_STATUS_META
    ];
  const licenseCopy = getLicenseStatusCopy(normalizedLicense);
  const readiness =
    rightsPayload?.publishEligibility ||
    evaluateClientPublishReadiness(safeRights);
  const proofFiles = safeRights.proofFiles || [];
  const selectedFilesSizeMb =
    files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;
  const submittedAt = formatDateTime(rightsPayload?.licenseSubmittedAt);
  const reviewedAt = formatDateTime(rightsPayload?.licenseReviewedAt);
  const rejectReasonSource = {
    licenseRejectReason: rightsPayload?.licenseRejectReason,
    licenseRejectReasons: rightsPayload?.licenseRejectReasons,
    rights: {
      rejectReason: safeRights.rejectReason,
    },
  };
  const rejectReasonHistory = normalizeRejectReasonHistory(rejectReasonSource);
  const reviewerFeedback =
    getLatestRejectReason(rejectReasonSource) || safeRights.rejectReason || "";
  const previousRejectReasons =
    rejectReasonHistory.length > 1
      ? rejectReasonHistory.slice(0, rejectReasonHistory.length - 1).reverse()
      : [];
  const hasReviewDetails = Boolean(submittedAt || reviewedAt || reviewerFeedback);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 pb-12 pt-24">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/author/dashboard">
              <Button
                variant="ghost"
                className="mb-3 gap-2 px-0 text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">Story Rights</h1>
                {rightsPayload?.verifiedBadge ? (
                  <Badge className="gap-1 bg-green-600 text-white">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </Badge>
                ) : null}
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                Manage ownership declaration, source or license references, and
                proof documents through a clearer submission workflow.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={`border ${rightsMeta.className}`}>
              Rights: {rightsMeta.label}
            </Badge>
            <Badge className={`border ${licenseMeta.className}`}>
              Review: {licenseMeta.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {statusError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{statusError}</AlertDescription>
              </Alert>
            ) : null}

            {successMessage ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            ) : null}

            {reviewerFeedback || rejectReasonHistory.length > 0 ? (
              <Alert
                variant="destructive"
                className="border-red-200 bg-red-50 text-red-900 dark:text-red-100"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {normalizedLicense === "rejected"
                    ? "Reviewer feedback requires action"
                    : "Previous reviewer feedback"}
                </AlertTitle>
                <AlertDescription className="space-y-3">
                  {reviewerFeedback ? <p>{reviewerFeedback}</p> : null}
                  {previousRejectReasons.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700/80 dark:text-red-200">
                        Earlier review notes
                      </p>
                      <div className="space-y-2">
                        {previousRejectReasons.map((reason, index) => (
                          <div
                            key={`${reason}-${index}`}
                            className="rounded-xl border border-red-200/80 bg-white/50 px-3 py-2 dark:border-red-900/50 dark:bg-black/10"
                          >
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle>Reference Library</CardTitle>
                <CardDescription>
                  Open these sections only when you need examples, reminders, or
                  document ideas.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-3">
                <Accordion
                  type="multiple"
                  className="w-full"
                  value={referenceSections}
                  onValueChange={setReferenceSections}
                >
                  <AccordionItem value="submission-guide" className="border-border/60">
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            Submission Guide
                          </span>
                          <Badge className="border border-border/70 bg-background text-muted-foreground">
                            {submissionSteps.length} steps
                          </Badge>
                        </div>
                        <p className="text-sm font-normal leading-6 text-muted-foreground">
                          Follow a cleaner flow from declaration to upload and
                          review.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <div className="space-y-5 pt-1">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {submissionSteps.map((step, index) => (
                            <StepCard
                              key={step.title}
                              index={index + 1}
                              title={step.title}
                              description={step.description}
                            />
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <InfoChip>Save metadata before upload</InfoChip>
                          <InfoChip>Add a short proof note</InfoChip>
                          <InfoChip>Re-upload if reviewer requests changes</InfoChip>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="document-ideas"
                    className="border-border/60"
                  >
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            What documents should I upload?
                          </span>
                          <Badge className="border border-border/70 bg-background text-muted-foreground">
                            {documentCases.length} cases
                          </Badge>
                        </div>
                        <p className="text-sm font-normal leading-6 text-muted-foreground">
                          See proof examples that match original, translated,
                          adapted, licensed, or public-domain stories.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <div className="grid gap-4 pt-1 md:grid-cols-2 xl:grid-cols-3">
                        {documentCases.map((item) => (
                          <div
                            key={item.title}
                            className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
                          >
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="text-sm leading-6 text-muted-foreground">
                                {item.hint}
                              </p>
                            </div>

                            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                              {item.examples.map((example) => (
                                <li
                                  key={example}
                                  className="flex items-start gap-2"
                                >
                                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                  <span>{example}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="templates" className="border-border/60">
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            Templates
                          </span>
                          <Badge className="border border-border/70 bg-background text-muted-foreground">
                            {templateCards.length} items
                          </Badge>
                        </div>
                        <p className="text-sm font-normal leading-6 text-muted-foreground">
                          Quick references for declarations, permissions, and a
                          last-minute checklist.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <div className="grid gap-4 pt-1 md:grid-cols-3">
                        {templateCards.map((template) => (
                          <div
                            key={template.title}
                            className="flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="rounded-xl bg-muted p-2">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <Badge className="border border-dashed bg-background text-muted-foreground">
                                  Coming soon
                                </Badge>
                              </div>

                              <div>
                                <p className="font-medium text-foreground">
                                  {template.title}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                  {template.description}
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              className="mt-5 rounded-xl"
                              disabled
                            >
                              Download template
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <StoryRightsSection
              value={rights}
              onChange={setRights}
              publishError={readiness.canPublish ? null : readiness.reason}
            />

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle>Save Rights Setup</CardTitle>
                <CardDescription>
                  Save your rights metadata and declaration before uploading
                  supporting files.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={handleSaveRights}
                    disabled={isSavingRights}
                    className="rounded-xl"
                  >
                    {isSavingRights ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save Rights Metadata
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleSaveDeclaration}
                    disabled={isSavingDeclaration}
                    className="rounded-xl"
                  >
                    {isSavingDeclaration ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save Declaration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <CardTitle>Proof Documents</CardTitle>
                <CardDescription>
                  Upload contracts, permission screenshots, declarations, or
                  other evidence that supports your rights claim.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 pt-6">
                <Accordion
                  type="multiple"
                  defaultValue={proofFiles.length === 0 ? ["upload-checklist"] : []}
                  className="rounded-2xl border border-border/70 bg-muted/10 px-4"
                >
                  <AccordionItem value="upload-checklist" className="border-none">
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="space-y-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            Upload checklist
                          </span>
                          <Badge className="border border-border/70 bg-background text-muted-foreground">
                            3 reminders
                          </Badge>
                        </div>
                        <p className="text-sm font-normal leading-6 text-muted-foreground">
                          Accepted file types, examples, and a quick reminder
                          before submission.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Accepted types
                          </p>
                          <p className="mt-1 text-sm text-foreground">
                            PDF, PNG, JPG, WEBP
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Good examples
                          </p>
                          <p className="mt-1 text-sm text-foreground">
                            Contracts, permission chats, source pages,
                            declarations
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Best practice
                          </p>
                          <p className="mt-1 text-sm text-foreground">
                            Upload multiple files when one screenshot alone is
                            not enough
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Choose files</p>
                      <p className="text-sm text-muted-foreground">
                        Upload the files that directly support your selected
                        rights case.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Select files
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />

                  {files.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <InfoChip>{files.length} selected</InfoChip>
                        <InfoChip>
                          {selectedFilesSizeMb.toFixed(2)} MB total
                        </InfoChip>
                      </div>

                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
                          >
                            <span className="truncate pr-3">{file.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-border/70 bg-background px-4 py-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <UploadCloud className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="mt-3 font-medium text-foreground">
                        No files selected yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Select one or more files, then add a short note before
                        uploading.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Submission note</label>
                  <Textarea
                    rows={5}
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                    placeholder="Example: This story is a translated work. Attached are the owner authorization screenshot, source page, and our signed declaration."
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Briefly explain what the files prove, who granted
                    permission, and how the story may be used.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleUploadProof}
                    disabled={isUploadingProof || files.length === 0}
                    className="rounded-xl"
                  >
                    {isUploadingProof ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upload Proof
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isUploadingProof}
                    className="rounded-xl"
                    onClick={() => {
                      setFiles([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Clear selection
                  </Button>
                </div>

                <Separator />

                <Accordion
                  type="multiple"
                  defaultValue={proofFiles.length === 0 ? ["current-proof-files"] : []}
                  className="rounded-2xl border border-border/70 bg-muted/10 px-4"
                >
                  <AccordionItem value="current-proof-files" className="border-none">
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="space-y-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            Current proof files
                          </span>
                          <Badge className="border border-border/70 bg-background text-muted-foreground">
                            {proofFiles.length} attached
                          </Badge>
                        </div>
                        <p className="text-sm font-normal leading-6 text-muted-foreground">
                          Review the files currently attached to this rights
                          record.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {proofFiles.length > 0 ? (
                        <div className="space-y-2">
                          {proofFiles.map((file, index) => {
                            const url = getAssetCandidates(apiBase, file)[0];
                            const isPdf = file.toLowerCase().endsWith(".pdf");

                            return (
                              <a
                                key={`${file}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-3 text-sm transition hover:bg-muted/30"
                              >
                                <span className="flex items-center gap-2 truncate">
                                  {isPdf ? (
                                    <FileText className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {file.split("/").pop()}
                                  </span>
                                </span>

                                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                          No proof files uploaded yet. Add supporting documents
                          to make the review process easier.
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Story</CardTitle>
                <CardDescription>
                  Check that you are editing the correct story.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                  {story?.coverImage ? (
                    <img
                      src={coverUrl(story.coverImage)}
                      alt={story.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No cover
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Title
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {story?.title || "Untitled"}
                  </p>
                </div>

                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link href={`/author/story/edit/${id}`}>Back to Edit Story</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Review & Eligibility</CardTitle>
                <CardDescription>
                  Keep track of the current review state and what to do next.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`border ${rightsMeta.className}`}>
                    Rights: {rightsMeta.label}
                  </Badge>
                  <Badge className={`border ${licenseMeta.className}`}>
                    Review: {licenseMeta.label}
                  </Badge>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="font-medium text-foreground">{licenseCopy.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {licenseCopy.description}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    readiness.canPublish
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                  }`}
                >
                  <p className="font-medium">
                    {readiness.canPublish ? "Eligible / ready" : "Cannot publish yet"}
                  </p>
                  <p className="mt-1">
                    {readiness.reason ||
                      "This story currently satisfies the backend publish policy."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-sm font-medium text-foreground">Next step</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {getNextAction(normalizedLicense, Boolean(readiness.canPublish))}
                  </p>
                </div>

                {hasReviewDetails ? (
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue={normalizedLicense === "rejected" ? "review-details" : undefined}
                    className="rounded-2xl border border-border/70 bg-background px-4"
                  >
                    <AccordionItem value="review-details" className="border-none">
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="space-y-1 text-left">
                          <p className="font-medium text-foreground">
                            Review timeline & notes
                          </p>
                          <p className="text-sm font-normal leading-6 text-muted-foreground">
                            Open to see submission timestamps and the latest
                            reviewer note.
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-4">
                        {(submittedAt || reviewedAt) && (
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {submittedAt ? (
                              <div className="flex items-start gap-2">
                                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>Submitted: {submittedAt}</span>
                              </div>
                            ) : null}

                            {reviewedAt ? (
                              <div className="flex items-start gap-2">
                                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>Reviewed: {reviewedAt}</span>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {reviewerFeedback ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
                            <p className="font-medium">Reviewer feedback</p>
                            <p className="mt-1 leading-6">{reviewerFeedback}</p>
                          </div>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
