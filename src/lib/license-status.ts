import type { LicenseStatus } from "@/lib/story-rights";

export type NormalizedLicenseStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected";

export function normalizeLicenseStatus(
  value?: LicenseStatus | string | null,
): NormalizedLicenseStatus {
  if (!value) return "none";

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "none";
}

export function hasApprovedLicenseStatus(
  value?: LicenseStatus | string | null,
) {
  return normalizeLicenseStatus(value) === "approved";
}
