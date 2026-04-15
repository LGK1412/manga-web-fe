import type {
  AuthorRequestStatus,
  EligibilityCriteria,
} from "@/hooks/useAuthorRequest";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarCheck2, Clock3, Sparkles } from "lucide-react";

function statusDescription(
  status: AuthorRequestStatus,
  criteria: EligibilityCriteria[],
): string | null {
  const allMet = criteria.every((c) => c.met);
  if (status === "none") {
    return allMet ? "You meet all requirements to become an author" : null;
  }
  if (status === "pending") {
    return allMet
      ? "Your request is being processed. The system will automatically approve when you meet all requirements."
      : null;
  }
  return null;
}

interface AuthorRequestBannerProps {
  status: AuthorRequestStatus;
  criteria: EligibilityCriteria[];
  requestedAt?: string;
  approvedAt?: string;
  autoApproved?: boolean;
}

export function AuthorRequestBanner({
  status,
  criteria,
  requestedAt,
  approvedAt,
  autoApproved,
}: AuthorRequestBannerProps) {
  const description = statusDescription(status, criteria);

  const shell = {
    none: "border-border/80 bg-muted/30",
    pending:
      "border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-background dark:border-amber-900/50 dark:from-amber-950/25 dark:to-background",
    approved:
      "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-background dark:border-emerald-900/50 dark:from-emerald-950/25 dark:to-background",
  } as const;

  const iconShell = {
    none: "bg-background text-primary shadow-sm ring-1 ring-border/60",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
    approved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
  } as const;

  let title = "Become an author";
  let Icon = Sparkles;

  if (status === "pending") {
    title = "Request pending";
    Icon = Clock3;
  } else if (status === "approved") {
    title = "You are an author";
    Icon = Sparkles;
  }

  const badgeLabel =
    status === "approved"
      ? "Approved"
      : status === "pending"
        ? "Pending"
        : "Not sent";

  const badgeVariant = status === "approved" ? "default" : "secondary";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        shell[status === "approved" ? "approved" : status === "pending" ? "pending" : "none"],
      )}
    >
      <div className="flex gap-3 sm:gap-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconShell[
              status === "approved"
                ? "approved"
                : status === "pending"
                  ? "pending"
                  : "none"
            ],
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <Badge variant={badgeVariant} className="font-medium">
              {badgeLabel}
            </Badge>
          </div>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          {(requestedAt || approvedAt) && (
            <dl className="mt-3 grid gap-2 border-t border-border/50 pt-3 text-xs sm:grid-cols-2 sm:gap-x-6">
              {requestedAt ? (
                <div className="flex items-start gap-2">
                  <dt className="flex shrink-0 items-center gap-1.5 font-medium text-foreground">
                    <Clock3 className="h-3.5 w-3.5 opacity-70" />
                    Sent
                  </dt>
                  <dd className="text-muted-foreground">
                    <time dateTime={requestedAt}>
                      {new Date(requestedAt).toLocaleString()}
                    </time>
                  </dd>
                </div>
              ) : null}
              {approvedAt ? (
                <div className="flex flex-wrap items-start gap-2 sm:col-span-2">
                  <dt className="flex shrink-0 items-center gap-1.5 font-medium text-foreground">
                    <CalendarCheck2 className="h-3.5 w-3.5 opacity-70" />
                    Approved
                  </dt>
                  <dd className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <time dateTime={approvedAt}>
                      {new Date(approvedAt).toLocaleString()}
                    </time>
                    {autoApproved ? (
                      <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wide">
                        Auto
                      </Badge>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
