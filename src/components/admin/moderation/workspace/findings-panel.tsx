"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildAuthorRevisionDraft,
  type ProcessedFinding,
} from "@/lib/moderation-findings";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Mail,
} from "lucide-react";

type FindingsPanelProps = {
  findings: ProcessedFinding[];
  activeFindingId?: string | null;
  onSelectFinding: (findingId: string) => void;
};

export function FindingsPanel({
  findings,
  activeFindingId,
  onSelectFinding,
}: FindingsPanelProps) {
  const actionableFindings = useMemo(
    () => findings.filter((finding) => finding.verdict !== "pass"),
    [findings]
  );
  const passedFindings = useMemo(
    () => findings.filter((finding) => finding.verdict === "pass"),
    [findings]
  );
  const authorDraft = useMemo(
    () => buildAuthorRevisionDraft(findings, activeFindingId),
    [findings, activeFindingId]
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyAuthorDraft = async () => {
    if (!authorDraft || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(authorDraft.body);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="overflow-hidden xl:sticky xl:top-6">
      <div className="border-b bg-gradient-to-b from-background via-background to-muted/20 px-5 py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Policy Findings</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the findings below, then click one to sync its highlight in the chapter
                viewer.
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto bg-muted/10 p-4">
        {authorDraft && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-sky-900">
                  <Mail className="h-4 w-4" />
                  Suggested Author Note
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-sky-200 bg-white/80 text-sky-900 hover:bg-white"
                onClick={copyAuthorDraft}
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy note"}
              </Button>
            </div>

            <div className="mt-3 rounded-xl border border-sky-100 bg-white/80 p-3">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">
                {authorDraft.body}
              </pre>
            </div>
          </div>
        )}

        {actionableFindings.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h4 className="mt-3 text-base font-semibold text-emerald-950">
              No actionable policy issues
            </h4>
            <p className="mt-1 text-sm leading-6 text-emerald-900/75">
              The AI output did not surface any warning or block findings for this chapter. You
              can still inspect the content manually before publishing.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionableFindings.map((finding, index) => (
              <FindingCard
                key={finding.highlightId}
                finding={finding}
                index={index + 1}
                active={finding.highlightId === activeFindingId}
                onSelect={() => onSelectFinding(finding.highlightId)}
              />
            ))}
          </div>
        )}

        {passedFindings.length > 0 && (
          <details className="group rounded-2xl border bg-background/90 p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-sm font-semibold">Passed Findings</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lower-risk checks that passed the current AI review.
                </p>
              </div>

              <Badge variant="secondary">{passedFindings.length}</Badge>
            </summary>

            <div className="mt-4 space-y-3 border-t pt-4">
              {passedFindings.map((finding, index) => (
                <button
                  key={finding.highlightId}
                  type="button"
                  onClick={() => onSelectFinding(finding.highlightId)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    finding.highlightId === activeFindingId
                      ? "border-emerald-300 bg-emerald-50/80 shadow-sm"
                      : "border-border bg-muted/10 hover:border-emerald-200 hover:bg-emerald-50/40"
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          Passed
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Finding {index + 1}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {finding.displayTitle}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {finding.parsedReason}
                      </p>
                    </div>

                    <span className="rounded-full border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
                      {matchLabelOf(finding.matchStrategy)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    </Card>
  );
}

function FindingCard({
  finding,
  index,
  active,
  onSelect,
}: {
  finding: ProcessedFinding;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const verdictMeta = verdictMetaOf(finding.verdict);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="w-full text-left"
    >
      <div
        className={cn(
          "rounded-2xl border border-l-4 bg-background p-4 shadow-sm transition-all",
          verdictMeta.borderClass,
          active
            ? cn("shadow-md ring-2", verdictMeta.activeRingClass)
            : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                verdictMeta.iconContainerClass
              )}
            >
              <verdictMeta.icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Finding {index}
                </span>
                <Badge className={verdictMeta.badgeClass}>{verdictMeta.label}</Badge>
              </div>

              <h4 className="mt-2 text-sm font-semibold leading-6 text-foreground sm:text-base">
                {finding.displayTitle}
              </h4>

            </div>
          </div>

          {finding.evidenceText && (
            <div className={cn("rounded-xl border p-3", verdictMeta.evidenceClass)}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                Flagged Text
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                {finding.evidenceText}
              </p>
            </div>
          )}

          <div className="grid gap-3 xl:grid-cols-2">
            <DetailPanel title="Why It Was Flagged">
              <p className="text-sm leading-6 text-slate-700">{finding.parsedReason}</p>
            </DetailPanel>

            <DetailPanel
              title="Moderator Recommendation"
              tone={finding.moderatorGuidance.tone}
              source={
                finding.moderatorGuidance.source === "ai"
                  ? "AI guidance"
                  : "Fallback rule"
              }
            >
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-700">
                  {finding.moderatorGuidance.summary}
                </p>
                <Checklist
                  items={finding.moderatorGuidance.reviewCheckpoints}
                  emptyLabel="No extra checkpoints were generated for this finding."
                  dotClassName={verdictMeta.dotClass}
                />
              </div>
            </DetailPanel>
          </div>

          <div className="flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Click this card to sync the viewer highlight with this finding.</span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
              {active ? "Selected now" : "Open in viewer"}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailPanel({
  title,
  source,
  tone,
  className,
  children,
}: {
  title: string;
  source?: string;
  tone?: ProcessedFinding["moderatorGuidance"]["tone"];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-muted/20 p-3", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </p>
        {source && (
          <Badge variant="outline" className="bg-background/80 text-[11px]">
            {source}
          </Badge>
        )}
        {tone && (
          <Badge className={toneBadgeClassOf(tone)}>
            {toneLabelOf(tone)}
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}

function Checklist({
  items,
  emptyLabel,
  dotClassName,
}: {
  items: string[];
  emptyLabel: string;
  dotClassName: string;
}) {
  if (!items.length) {
    return <p className="text-sm leading-6 text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-6">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dotClassName)} />
          <span className="text-slate-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function toneBadgeClassOf(tone: ProcessedFinding["moderatorGuidance"]["tone"]) {
  switch (tone) {
    case "required":
      return "border-red-200 bg-red-50 text-red-700 hover:bg-red-50";
    case "rewrite":
      return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50";
  }
}

function toneLabelOf(tone: ProcessedFinding["moderatorGuidance"]["tone"]) {
  switch (tone) {
    case "required":
      return "Required";
    case "rewrite":
      return "Needs rewrite";
    default:
      return "Next step";
  }
}

function verdictMetaOf(verdict: ProcessedFinding["verdict"]) {
  switch (verdict) {
    case "block":
      return {
        label: "Block",
        icon: AlertCircle,
        badgeClass:
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
        borderClass: "border-l-red-500 border-red-200/80",
        activeRingClass: "ring-red-200",
        iconContainerClass: "border-red-200 bg-red-50 text-red-600",
        evidenceClass: "border-red-200/80 bg-red-50/70 text-red-950",
        dotClass: "bg-red-500",
      };
    case "warn":
      return {
        label: "Warn",
        icon: AlertTriangle,
        badgeClass:
          "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
        borderClass: "border-l-amber-500 border-amber-200/80",
        activeRingClass: "ring-amber-200",
        iconContainerClass: "border-amber-200 bg-amber-50 text-amber-600",
        evidenceClass: "border-amber-200/80 bg-amber-50/70 text-amber-950",
        dotClass: "bg-amber-500",
      };
    default:
      return {
        label: "Pass",
        icon: CheckCircle2,
        badgeClass:
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
        borderClass: "border-l-emerald-500 border-emerald-200/80",
        activeRingClass: "ring-emerald-200",
        iconContainerClass: "border-emerald-200 bg-emerald-50 text-emerald-600",
        evidenceClass: "border-emerald-200/80 bg-emerald-50/70 text-emerald-950",
        dotClass: "bg-emerald-500",
      };
  }
}
