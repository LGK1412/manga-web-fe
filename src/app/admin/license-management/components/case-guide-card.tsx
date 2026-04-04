import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  DerivedLicenseContext,
  LicenseCaseGuide,
} from "../license-knowledge.types";
import { getReviewLevelMeta } from "../license-knowledge.utils";

type CaseGuideCardProps = {
  context: DerivedLicenseContext | null;
  guide: LicenseCaseGuide | null;
};

export function CaseGuideCard({
  context,
  guide,
}: CaseGuideCardProps) {
  if (!context || !guide) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Guide</CardTitle>
          <CardDescription>
            Select a story to view the checklist, red flags, and handling notes
            for the current case.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
            No case selected.
          </div>
        </CardContent>
      </Card>
    );
  }

  const reviewLevelMeta = getReviewLevelMeta(context.reviewLevel);
  const displayTitle = guide.title.replace(/^Case:\s*/i, "").trim();
  const hasIntroBlock =
    Boolean(displayTitle) ||
    Boolean(guide.summary.trim()) ||
    context.reviewLevel !== "standard";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guide</CardTitle>
        <CardDescription>
          Internal guidance for the current submission type to help reviewers
          decide faster and more consistently.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasIntroBlock ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                {displayTitle ? (
                  <p className="text-lg font-semibold text-foreground">
                    {displayTitle}
                  </p>
                ) : null}
                {guide.summary.trim() ? (
                  <p className="text-sm leading-6 text-slate-700">{guide.summary}</p>
                ) : null}
              </div>

              {context.reviewLevel !== "standard" ? (
                <Badge className={`border ${reviewLevelMeta.className}`}>
                  {reviewLevelMeta.label}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}

        {guide.checklist.length > 0 ? (
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Verification Checklist</p>
                <ul className="space-y-2 text-sm leading-6 text-gray-600">
                  {guide.checklist.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {guide.redFlags.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="space-y-2">
                <p className="font-medium text-red-900">Common Red Flags</p>
                <ul className="space-y-2 text-sm leading-6 text-red-800">
                  {guide.redFlags.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-red-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {guide.recommendedAction.trim() ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700/80">
              Recommended next action
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {guide.recommendedAction}
            </p>
          </div>
        ) : null}

        {guide.escalateWhen.length > 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-gray-50 p-4">
            <p className="font-medium text-foreground">Escalate when...</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-gray-600">
              {guide.escalateWhen.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
