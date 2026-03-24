"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPinned,
  WandSparkles,
  ArrowRight,
} from "lucide-react";
import type { ProcessedFinding } from "@/lib/moderation-findings";

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

  const blockCount = actionableFindings.filter((item) => item.verdict === "block").length;
  const warnCount = actionableFindings.filter((item) => item.verdict === "warn").length;

  return (
    <Card className="overflow-hidden lg:sticky lg:top-6">
      <div className="border-b bg-background/95 px-5 py-4">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-lg font-semibold">Policy Findings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a finding to sync highlight in the content viewer. Each card shows what was
              flagged, why it matters, and what the moderator should do next.
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
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <WandSparkles className="h-3.5 w-3.5" />
                            How to fix
                          </div>

                          <div className="mt-3 space-y-2">
                            {finding.fixActions.map((action, index) => {
                              const toneClass =
                                action.tone === "required"
                                  ? "border-red-200 bg-red-50/70"
                                  : action.tone === "rewrite"
                                  ? "border-amber-200 bg-amber-50/70"
                                  : "border-blue-200 bg-blue-50/70";

                              return (
                                <div
                                  key={`${finding.highlightId}-action-${index}`}
                                  className={`rounded-xl border p-3 ${toneClass}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                                    <div>
                                      <p className="text-sm font-medium">{action.label}</p>
                                      <p className="mt-1 text-sm text-foreground/85">
                                        {action.detail}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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