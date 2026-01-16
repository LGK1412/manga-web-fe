import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AuthorRequestStatus } from "@/hooks/useAuthorRequest";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck2, Clock3, Sparkles } from "lucide-react";

interface AuthorRequestBannerProps {
  status: AuthorRequestStatus;
  message?: string;
  requestedAt?: string;
  approvedAt?: string;
  autoApproved?: boolean;
}

export function AuthorRequestBanner({
  status,
  message,
  requestedAt,
  approvedAt,
  autoApproved,
}: AuthorRequestBannerProps) {
  let variant: "default" | "destructive" | "success" | "warning" = "default";
  let title = "Request Information";
  let icon = <Sparkles className="h-4 w-4" />;

  if (status === "pending") {
    variant = "warning";
    title = "Request Pending Approval";
    icon = <Clock3 className="h-4 w-4" />;
  } else if (status === "approved") {
    variant = "success";
    title = "You are now an author";
    icon = <Sparkles className="h-4 w-4" />;
  }

  return (
    <Alert variant={variant} className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{title}</span>
        <Badge
          variant={status === "approved" ? "default" : "secondary"}
          className="ml-2"
        >
          {status === "approved"
            ? "Approved"
            : status === "pending"
            ? "Pending"
            : "Not requested"}
        </Badge>
      </div>
      <AlertDescription className="space-y-2 text-sm">
        {message && <p>{message}</p>}
        {requestedAt && (
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock3 className="h-3 w-3" />
            Sent: {new Date(requestedAt).toLocaleString()}
          </p>
        )}
        {approvedAt && (
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <CalendarCheck2 className="h-3 w-3" />
            Approved: {new Date(approvedAt).toLocaleString()}
            {autoApproved && (
              <Badge variant="outline" className="ml-2">
                Auto-approved
              </Badge>
            )}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}


