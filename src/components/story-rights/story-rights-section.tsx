"use client";

import {
  AlertTriangle,
  FileText,
  Globe2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getDefaultRights,
  isStrictReviewCase,
  MONETIZATION_OPTIONS,
  needsDeclaration,
  needsLicenseReference,
  needsSourceReference,
  normalizeOptionalUrl,
  ORIGIN_OPTIONS,
  RIGHTS_BASIS_OPTIONS,
  RIGHTS_STATUS_META,
  type StoryRights,
} from "@/lib/story-rights";

type Props = {
  value: StoryRights;
  onChange: (next: StoryRights) => void;
  publishError?: string | null;
  disabled?: boolean;
  hideServerStatus?: boolean;
};

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function StoryRightsSection({
  value,
  onChange,
  publishError,
  disabled = false,
  hideServerStatus = false,
}: Props) {
  const rights = { ...getDefaultRights(), ...value };

  const update = <K extends keyof StoryRights>(
    key: K,
    nextValue: StoryRights[K],
  ) => {
    onChange({
      ...rights,
      [key]: nextValue,
    });
  };

  const normalizeUrlField = (
    key: "sourceUrl" | "licenseUrl",
    rawValue: string,
  ) => {
    update(key, (normalizeOptionalUrl(rawValue) ?? "") as StoryRights[typeof key]);
  };

  const strictReview = isStrictReviewCase(rights);
  const showDeclaration = needsDeclaration(rights);
  const showSource = needsSourceReference(rights);
  const showLicense = needsLicenseReference(rights);
  const serverStatus =
    RIGHTS_STATUS_META[rights.reviewStatus] ?? RIGHTS_STATUS_META.not_required;

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5" />
          Story Rights
        </CardTitle>
        <CardDescription>
          Tell the platform why you are allowed to publish this story.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {!hideServerStatus ? (
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current rights status</p>
                <p className="text-sm text-muted-foreground">
                  This status is synced with backend review and publish policy.
                </p>
              </div>

              <Badge className={`border ${serverStatus.className}`}>
                {serverStatus.label}
              </Badge>
            </div>
          </div>
        ) : null}

        {strictReview ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Manual review will likely be required</p>
                <p>
                  Translated, adapted, reposted, or contract-based stories usually
                  need proof files and moderator approval before publishing.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Origin type</Label>
            <Select
              value={rights.originType}
              onValueChange={(v) => update("originType", v as StoryRights["originType"])}
              disabled={disabled}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select origin type" />
              </SelectTrigger>
              <SelectContent>
                {ORIGIN_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldHint>
              {ORIGIN_OPTIONS.find((x) => x.value === rights.originType)?.hint ||
                "Choose the closest match."}
            </FieldHint>
          </div>

          <div className="space-y-2">
            <Label>Monetization</Label>
            <Select
              value={rights.monetizationType}
              onValueChange={(v) =>
                update("monetizationType", v as StoryRights["monetizationType"])
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select monetization" />
              </SelectTrigger>
              <SelectContent>
                {MONETIZATION_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldHint>
              {MONETIZATION_OPTIONS.find(
                (x) => x.value === rights.monetizationType,
              )?.hint || "Describe how this story will be monetized."}
            </FieldHint>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Rights basis</Label>
          <Select
            value={rights.basis}
            onValueChange={(v) => update("basis", v as StoryRights["basis"])}
            disabled={disabled}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select rights basis" />
            </SelectTrigger>
            <SelectContent>
              {RIGHTS_BASIS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <FieldHint>
            {RIGHTS_BASIS_OPTIONS.find((x) => x.value === rights.basis)?.hint ||
              "Choose how your publishing rights are justified."}
          </FieldHint>
        </div>

        {showSource ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Source title</Label>
              <Input
                value={rights.sourceTitle || ""}
                onChange={(e) => update("sourceTitle", e.target.value)}
                placeholder="Original title / source name"
                disabled={disabled}
                className="h-11 rounded-xl"
              />
              <FieldHint>
                Example: MangaDex title, original web novel page, or source archive.
              </FieldHint>
            </div>

            <div className="space-y-2">
              <Label>Source URL</Label>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={rights.sourceUrl || ""}
                  onChange={(e) => update("sourceUrl", e.target.value)}
                  onBlur={(e) => normalizeUrlField("sourceUrl", e.target.value)}
                  placeholder="https://example.com/..."
                  disabled={disabled}
                  className="h-11 rounded-xl pl-9"
                />
              </div>
              <FieldHint>
                Use a full URL. If you paste example.com, the field will be normalized
                to https://example.com.
              </FieldHint>
            </div>
          </div>
        ) : null}

        {showLicense ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>License name</Label>
              <Input
                value={rights.licenseName || ""}
                onChange={(e) => update("licenseName", e.target.value)}
                placeholder="CC BY 4.0 / contract name"
                disabled={disabled}
                className="h-11 rounded-xl"
              />
              <FieldHint>
                Enter the license or permission name, if applicable.
              </FieldHint>
            </div>

            <div className="space-y-2">
              <Label>License URL</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={rights.licenseUrl || ""}
                  onChange={(e) => update("licenseUrl", e.target.value)}
                  onBlur={(e) => normalizeUrlField("licenseUrl", e.target.value)}
                  placeholder="https://example.com/license"
                  disabled={disabled}
                  className="h-11 rounded-xl pl-9"
                />
              </div>
              <FieldHint>
                Required for open-license cases or when you need to reference a
                license page.
              </FieldHint>
            </div>
          </div>
        ) : null}

        {showDeclaration ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="rights-declaration"
                checked={rights.declarationAccepted}
                onCheckedChange={(checked) =>
                  update("declarationAccepted", !!checked)
                }
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="rights-declaration"
                  className="cursor-pointer text-sm font-medium"
                >
                  I confirm that I own this story or have the legal right to
                  publish it.
                </Label>
                <p className="text-sm text-muted-foreground">
                  This is required for original stories published under self
                  declaration.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Proof documents are uploaded on the Story Rights page
              </p>
              <p className="text-sm text-muted-foreground">
                {strictReview
                  ? "This rights setup requires proof documents and moderator approval before publishing."
                  : "For original, open-license, or public-domain cases, proof documents may be optional depending on your setup."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Internal note</Label>
          <Textarea
            value={rights.proofNote || ""}
            onChange={(e) => update("proofNote", e.target.value)}
            rows={4}
            disabled={disabled}
            placeholder="Optional note about ownership, source, or reviewer context."
            className="rounded-xl"
          />
          <FieldHint>
            Use this as reviewer context in the UI. The actual proof-note persistence
            should stay aligned with your upload-proof endpoint.
          </FieldHint>
        </div>

        {publishError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{publishError}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default StoryRightsSection;