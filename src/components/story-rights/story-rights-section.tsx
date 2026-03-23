"use client";

import { AlertTriangle, FileText, Globe2, LockKeyhole, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BASIS_VALUES,
  buildRightsPayload,
  cleanOptionalText,
  evaluateClientPublishReadiness,
  getDefaultRights,
  MONETIZATION_OPTIONS,
  MONETIZATION_VALUES,
  needsDeclaration,
  needsLicenseReference,
  needsSourceReference,
  normalizeOptionalUrl,
  ORIGIN_OPTIONS,
  ORIGIN_VALUES,
  RIGHTS_BASIS_OPTIONS,
  type RightsBasis,
  type StoryMonetizationType,
  type StoryOriginType,
  type StoryRights,
} from "@/lib/story-rights";

type Props = {
  value?: Partial<StoryRights>;
  onChange: (next: StoryRights) => void;
  disabled?: boolean;
  publishError?: string | null;
};

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function SelectPill({
  active,
  label,
  hint,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/70 bg-background hover:bg-muted/30",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <div className="font-medium">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </button>
  );
}

export function StoryRightsSection({
  value,
  onChange,
  disabled = false,
  publishError,
}: Props) {
  const rights: StoryRights = {
    ...getDefaultRights(),
    ...(value || {}),
  };

  const strictReview =
    rights.originType === "translated" ||
    rights.originType === "adapted" ||
    rights.originType === "repost" ||
    rights.basis === "owner_authorization" ||
    rights.basis === "publisher_contract";

  const showSource = needsSourceReference(rights);
  const showLicense = needsLicenseReference(rights);
  const showDeclaration = needsDeclaration(rights);

  const update = <K extends keyof StoryRights>(key: K, nextValue: StoryRights[K]) => {
    onChange({
      ...rights,
      [key]: nextValue,
    });
  };

  const normalizeUrlField = (
    key: "sourceUrl" | "licenseUrl",
    rawValue: string,
  ) => {
    update(key, normalizeOptionalUrl(rawValue) || "");
  };

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
          <div>
            <CardTitle>Story Rights Setup</CardTitle>
            <CardDescription className="mt-1">
              Declare ownership basis, source references, and monetization intent before
              uploading proof documents on the dedicated Story Rights page.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Story origin</Label>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ORIGIN_OPTIONS.map((option) => (
              <SelectPill
                key={option.value}
                active={rights.originType === option.value}
                label={option.label}
                hint={option.hint}
                disabled={disabled}
                onClick={() => update("originType", option.value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Monetization</Label>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {MONETIZATION_OPTIONS.map((option) => (
              <SelectPill
                key={option.value}
                active={rights.monetizationType === option.value}
                label={option.label}
                hint={option.hint}
                disabled={disabled}
                onClick={() => update("monetizationType", option.value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Rights basis</Label>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {RIGHTS_BASIS_OPTIONS.map((option) => (
              <SelectPill
                key={option.value}
                active={rights.basis === option.value}
                label={option.label}
                hint={option.hint}
                disabled={disabled}
                onClick={() => update("basis", option.value)}
              />
            ))}
          </div>
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
              <FieldHint>Use the original title, source page, or publication name.</FieldHint>
            </div>

            <div className="space-y-2">
              <Label>Source URL</Label>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={rights.sourceUrl || ""}
                  onChange={(e) => update("sourceUrl", e.target.value)}
                  onBlur={(e) => normalizeUrlField("sourceUrl", e.target.value)}
                  placeholder="https://example.com/source"
                  disabled={disabled}
                  className="h-11 rounded-xl pl-9"
                />
              </div>
              <FieldHint>
                If you paste example.com, the field will be normalized to https://example.com.
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
              <FieldHint>Enter the license or permission name, if applicable.</FieldHint>
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
                Required for open-license cases or when you need to reference a license page.
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
                onCheckedChange={(checked) => update("declarationAccepted", !!checked)}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="rights-declaration"
                  className="cursor-pointer text-sm font-medium"
                >
                  I confirm that I own this story or have the legal right to publish it.
                </Label>
                <p className="text-sm text-muted-foreground">
                  This is required for original stories published under self declaration.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Proof documents are uploaded on the Story Rights page</p>
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