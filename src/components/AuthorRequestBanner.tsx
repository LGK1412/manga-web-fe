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
  let title = "Thông tin yêu cầu";
  let icon = <Sparkles className="h-4 w-4" />;

  if (status === "pending") {
    variant = "warning";
    title = "Yêu cầu đang chờ phê duyệt";
    icon = <Clock3 className="h-4 w-4" />;
  } else if (status === "approved") {
    variant = "success";
    title = "Bạn đã trở thành tác giả";
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
            ? "Đã duyệt"
            : status === "pending"
            ? "Đang chờ"
            : "Chưa gửi yêu cầu"}
        </Badge>
      </div>
      <AlertDescription className="space-y-2 text-sm">
        {message && <p>{message}</p>}
        {requestedAt && (
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock3 className="h-3 w-3" />
            Đã gửi: {new Date(requestedAt).toLocaleString()}
          </p>
        )}
        {approvedAt && (
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <CalendarCheck2 className="h-3 w-3" />
            Phê duyệt: {new Date(approvedAt).toLocaleString()}
            {autoApproved && (
              <Badge variant="outline" className="ml-2">
                Tự động duyệt
              </Badge>
            )}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}


