import { type LicenseDetail, type DecisionSummary } from "./license-management.types";

export function getAssetCandidates(
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

export function formatDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getDecisionSummary(
  item: LicenseDetail,
  latestRejectReason?: string | null,
): DecisionSummary {
  const proofCount = item.licenseFiles?.length || 0;
  const proofCopy =
    proofCount > 0
      ? `${proofCount} proof file${proofCount === 1 ? "" : "s"} attached.`
      : "No proof files attached yet.";

  if (item.licenseStatus === "rejected") {
    return {
      toneClassName: "border-red-200 bg-red-50 text-red-800",
      title: "Author needs to fix the submission",
      description: latestRejectReason
        ? `Latest reject note: ${latestRejectReason}`
        : `This story was rejected previously. Re-check whether the author addressed the missing or unclear proof. ${proofCopy}`,
    };
  }

  if (item.licenseStatus === "pending") {
    return {
      toneClassName: "border-amber-200 bg-amber-50 text-amber-900",
      title: "Ready for moderation",
      description: `Review the current proof set for this ${item.originType.toLowerCase()} story and decide whether the rights basis is sufficient. ${proofCopy}`,
    };
  }

  if (item.licenseStatus === "approved") {
    return {
      toneClassName: item.isPublish
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-blue-200 bg-blue-50 text-blue-900",
      title: item.isPublish
        ? "Approved and already published"
        : "Approved, but not published yet",
      description: item.isPublish
        ? "The review is complete and the story is currently live."
        : "The review is complete. Publishing is still a separate action so you can hold the story until everything else is ready.",
    };
  }

  return {
    toneClassName: "border-slate-200 bg-slate-50 text-slate-800",
    title: "No submission reviewed yet",
    description:
      "This story has not completed a review cycle yet. Check whether the rights metadata and proof set are sufficient before taking any action.",
  };
}
