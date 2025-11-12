import { CheckCircle2, XCircle } from "lucide-react";
import type { EligibilityCriteria } from "@/hooks/useAuthorRequest";
import { cn } from "@/lib/utils";

interface AuthorEligibilityChecklistProps {
  criteria: EligibilityCriteria[];
}

export function AuthorEligibilityChecklist({
  criteria,
}: AuthorEligibilityChecklistProps) {
  if (!criteria?.length) return null;

  return (
    <div className="space-y-3">
      {criteria.map((item) => {
        const isMet = Boolean(item.met);
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2",
              isMet
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10"
                : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10"
            )}
          >
            {isMet ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 text-amber-500 dark:text-amber-400" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {item.actual} / {item.required}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}






