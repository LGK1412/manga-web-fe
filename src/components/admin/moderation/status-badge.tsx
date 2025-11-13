import { Badge } from "@/components/ui/badge"
import type { AIStatus } from "@/lib/typesLogs"

interface StatusBadgeProps {
  status: AIStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    AI_PENDING: {
      variant: "outline" as const,
      label: "Pending",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    AI_WARN: {
      variant: "outline" as const,
      label: "Warning",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    AI_BLOCK: { variant: "outline" as const, label: "Blocked", className: "bg-red-50 text-red-700 border-red-200" },
    AI_PASSED: {
      variant: "outline" as const,
      label: "Passed",
      className: "bg-green-50 text-green-700 border-green-200",
    },
  }

  const c = config[status]
  return <Badge className={c.className}>{c.label}</Badge>
}
