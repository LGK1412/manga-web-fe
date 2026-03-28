"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPinned,
  WandSparkles,
  ArrowRight,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import {
  buildAuthorRevisionDraft,
  type ProcessedFinding,
} from "@/lib/moderation-findings";

export function FindingsPanel({
  findings,
  activeFindingId,
  onSelectFinding,
}: {
  findings: ProcessedFinding[];
  activeFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
}) {
  const actionableFindings = findings.filter((finding) => finding.verdict !== "pass");
  const passedFindings = findings.filter((finding) => finding.verdict === "pass");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const blockCount = actionableFindings.filter((item) => item.verdict === "block").length;
  const warnCount = actionableFindings.filter((item) => item.verdict === "warn").length;
  const activeActionableFinding =
    actionableFindings.find((finding) => finding.highlightId === activeFindingId) ||
    actionableFindings[0] ||
    null;

  const authorDraft = useMemo(
    () => buildAuthorRevisionDraft(findings, activeFindingId),
    [findings, activeFindingId]
  );

  useEffect(() => {
    setCopyState("idle");
  }, [authorDraft?.body]);

  const handleCopyAuthorDraft = async () => {
    if (!authorDraft) return;

    try {
      await navigator.clipboard.writeText(authorDraft.body);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <Card className="overflow-hidden lg:sticky lg:top-6">
      <div className="border-b bg-background/95 px-5 py-4">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-lg font-semibold">Policy Findings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a finding to sync highlight in the content viewer. Each card shows what was
              flagged, why it matters, the moderator next step, and the author-facing revision
              guidance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {actionableFindings.length} actionable finding
              {actionableFindings.length !== 1 ? "s" : ""}
            </Badge>

            {blockCount > 0 && (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                {blockCount} block
              </Badge>
            )}

            {warnCount > 0 && (
              <Badge
                variant="outline"
                className="border-yellow-200 bg-yellow-50 text-yellow-700"
              >
                {warnCount} warn
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
        {findings.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center text-center">
            <div>
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
              <p className="text-sm font-medium">No policy issues detected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The AI check did not find any flagged violations for this chapter.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {authorDraft && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                      <Mail className="h-3.5 w-3.5" />
                      Suggested Author Note
                    </div>
                    <p className="mt-2 text-sm text-blue-950">
                      Use this as a base when sending revision guidance to the author.
                      {activeActionableFinding
                        ? ` Current focus: ${activeActionableFinding.displayTitle}.`
                        : ""}
                    </p>
                    {activeActionableFinding && (
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className={
                            activeActionableFinding.authorGuidance.source === "ai"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }
                        >
                          {activeActionableFinding.authorGuidance.source === "ai"
                            ? "AI note basis"
                            : "Fallback note basis"}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-blue-200 bg-white/80 text-blue-700 hover:bg-white"
                    onClick={handleCopyAuthorDraft}
                  >
                    {copyState === "copied" ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copyState === "copied"
                      ? "Copied"
                      : copyState === "error"
                      ? "Copy failed"
                      : "Copy note"}
                  </Button>
                </div>

                <div className="mt-3 rounded-xl border border-blue-200/80 bg-white/90 p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {authorDraft.body}
                  </p>
                </div>

                <p className="mt-2 text-xs text-blue-700/80">
                  This draft prioritizes the selected finding first and summarizes up to{" "}
                  {authorDraft.includedFindingCount} actionable findings.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {actionableFindings.map((finding) => {
                const isActive = activeFindingId === finding.highlightId;
                const verdictBadgeClass =
                  finding.verdict === "block"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-yellow-200 bg-yellow-50 text-yellow-700";

                const cardClass = isActive
                  ? finding.verdict === "block"
                    ? "border-red-300 bg-red-50/70 ring-2 ring-red-200"
                    : "border-yellow-300 bg-yellow-50/70 ring-2 ring-yellow-200"
                  : "border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/30";

                return (
                  <button
                    key={finding.highlightId}
                    type="button"
                    onClick={() => onSelectFinding(finding.highlightId)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${cardClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {finding.verdict === "block" ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">{finding.displayTitle}</p>
                                <Badge variant="secondary" className="max-w-full truncate">
                                  {finding.primaryAction}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Click to jump to the related content in the chapter viewer.
                              </p>
                            </div>

                            <Badge variant="outline" className={verdictBadgeClass}>
                              {finding.verdict.toUpperCase()}
                            </Badge>
                          </div>

                          {finding.evidenceText && (
                            <div className="rounded-xl border bg-background/85 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Flagged text
                              </p>
                              <p
                                className={`mt-2 rounded-lg px-3 py-2 text-sm leading-relaxed ${
                                  finding.verdict === "block"
                                    ? "bg-red-100/80 text-red-950"
                                    : "bg-yellow-100/80 text-yellow-950"
                                }`}
                              >
                                “{finding.evidenceText}”
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border bg-muted/25 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Why it was flagged
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                            {finding.parsedReason}
                          </p>
                        </div>

                        <div className="rounded-xl border bg-muted/25 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Moderator Recommendation
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  finding.moderatorGuidance.source === "ai"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-700"
                                }
                              >
                                {finding.moderatorGuidance.source === "ai"
                                  ? "AI advice"
                                  : "Fallback guidance"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  finding.moderatorGuidance.tone === "required"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : finding.moderatorGuidance.tone === "rewrite"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-blue-200 bg-blue-50 text-blue-700"
                                }
                              >
                                {finding.moderatorGuidance.actionLabel}
                              </Badge>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                            {finding.moderatorGuidance.summary}
                          </p>

                          <div className="mt-3 space-y-2">
                            {finding.moderatorGuidance.reviewCheckpoints.map(
                              (checkpoint, index) => (
                                <div
                                  key={`${finding.highlightId}-moderator-check-${index}`}
                                  className="rounded-xl border border-blue-200 bg-blue-50/60 p-3"
                                >
                                  <div className="flex items-start gap-2">
                                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                                    <p className="text-sm text-foreground/85">{checkpoint}</p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border bg-muted/25 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <WandSparkles className="h-3.5 w-3.5" />
                              Author Revision Direction
                            </div>

                            <Badge
                              variant="outline"
                              className={
                                finding.authorGuidance.source === "ai"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }
                            >
                              {finding.authorGuidance.source === "ai"
                                ? "AI advice"
                                : "Fallback guidance"}
                            </Badge>
                          </div>

                          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                            {finding.authorGuidance.objective}
                          </p>

                          {finding.authorGuidance.revisionSteps.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {finding.authorGuidance.revisionSteps.map((step, index) => (
                                <div
                                  key={`${finding.highlightId}-author-step-${index}`}
                                  className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"
                                >
                                  <div className="flex items-start gap-2">
                                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                                    <p className="text-sm text-foreground/85">{step}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPinned className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {finding.locationLabel}
                            {finding.matchStrategy === "span"
                              ? " · precise highlight"
                              : finding.matchStrategy === "fragment"
                              ? " · multi-fragment match"
                              : finding.matchStrategy === "excerpt"
                              ? " · evidence-based match"
                              : " · manual review fallback"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {passedFindings.length > 0 && (
              <details className="rounded-2xl border bg-muted/15 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium">
                  Passed checks ({passedFindings.length})
                </summary>

                <div className="mt-4 space-y-3">
                  {passedFindings.map((finding) => (
                    <div
                      key={finding.highlightId}
                      className="rounded-xl border border-green-200 bg-green-50/60 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{finding.displayTitle}</p>
                            <Badge
                              variant="outline"
                              className="border-green-200 bg-green-50 text-green-700"
                            >
                              PASS
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {finding.parsedReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
