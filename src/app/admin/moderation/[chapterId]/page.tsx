"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModerationRecord } from "@/lib/typesLogs";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

export function FindingsPanel({
  record,
  policyIndex,
}: {
  record: ModerationRecord;
  policyIndex?: Record<string, string>; // key: subCategory/slug/policy code → title
}) {
  const findings = record.ai_findings || [];

  const labelOf = (sectionId: string) => {
    return policyIndex?.[sectionId] || // ưu tiên title từ policy
      ({
        violence: "Violence & Gore",
        sexual: "Sexual Content",
        language: "Offensive Language",
        harassment: "Harassment & Bullying",
        misinformation: "Misinformation",
        spam: "Spam",
      } as Record<string, string>)[sectionId] ||
      sectionId;
  };

  return (
    <Card className="p-6 h-full">
      <h3 className="font-semibold mb-4">Policy Violations Found</h3>

      {findings.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No violations detected</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {findings.map((f, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4">
              <div className="flex items-start gap-3 mb-2">
                {f.verdict === "pass" && <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />}
                {f.verdict === "warn" && <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                {f.verdict === "block" && <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />}

                <div className="flex-1">
                  <p className="font-medium text-sm">{labelOf(f.sectionId)}</p>
                  <Badge
                    variant="outline"
                    className={
                      f.verdict === "pass"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : f.verdict === "warn"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }
                  >
                    {f.verdict.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{f.rationale}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
