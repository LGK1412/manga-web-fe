"use client";

import { useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildHighlightedHtml, type ProcessedFinding } from "@/lib/moderation-findings";
import { Eye, Highlighter, ScanSearch } from "lucide-react";

export function ContentViewer({
  title,
  author,
  html,
  updatedAt,
  activeFinding,
}: {
  title: string;
  author: string;
  html: string;
  updatedAt?: string;
  activeFinding?: ProcessedFinding | null;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const highlighted = useMemo(
    () => buildHighlightedHtml(html, activeFinding),
    [html, activeFinding]
  );

  useEffect(() => {
    if (!activeFinding || !highlighted.anchorId || !contentRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      const anchor = contentRef.current?.querySelector(
        `[data-finding-anchor="${highlighted.anchorId}"]`
      ) as HTMLElement | null;

      if (anchor) {
        anchor.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeFinding, highlighted.anchorId]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-background/95 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Author: {author}
              {updatedAt ? ` · ${new Date(updatedAt).toLocaleString()}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              Reader View
            </Badge>

            {activeFinding && (
              <Badge variant="outline" className="gap-1">
                <Highlighter className="h-3.5 w-3.5" />
                {highlighted.matched
                  ? highlighted.strategy === "span"
                    ? "Precise span highlight"
                    : highlighted.strategy === "fragment"
                    ? `${highlighted.matchedCount} fragments highlighted`
                    : "Evidence highlight"
                  : "Manual review needed"}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <ScanSearch className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {activeFinding ? (
              highlighted.matched ? (
                highlighted.matchedCount > 1 ? (
                  <span>
                    <strong>{highlighted.matchedCount}</strong> related fragments were highlighted
                    from <strong>{activeFinding.displayTitle}</strong>. This is a best-effort
                    evidence match, so review the surrounding lines as well.
                  </span>
                ) : (
                  <span>
                    Highlight synced from <strong>{activeFinding.displayTitle}</strong>. The viewer
                    jumps to the first matched fragment automatically.
                  </span>
                )
              ) : (
                <span>
                  The selected finding could not be matched exactly in the rendered content. Review
                  the nearby context manually before making a decision.
                </span>
              )
            ) : (
              <span>
                Click a policy finding on the right to jump to the related content and review the
                highlighted text.
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        ref={contentRef}
        className="max-h-[calc(100vh-12rem)] overflow-y-auto bg-muted/20 px-6 py-6"
      >
        <div
          className="prose prose-sm max-w-none rounded-xl bg-background p-5 leading-relaxed shadow-sm"
          dangerouslySetInnerHTML={{ __html: highlighted.html || html }}
        />
      </div>
    </Card>
  );
}