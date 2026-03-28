import { Badge } from "@/components/ui/badge";
import type { ModerationResolutionStatus } from "@/lib/typesLogs";

interface ResolutionBadgeProps {
  status: ModerationResolutionStatus;
}

const CONFIG: Record<
  ModerationResolutionStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  APPROVED: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CHANGES_REQUESTED: {
    label: "Changes Requested",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function ResolutionBadge({ status }: ResolutionBadgeProps) {
  const config = CONFIG[status] || CONFIG.OPEN;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
