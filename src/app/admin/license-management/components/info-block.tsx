import { ExternalLink } from "lucide-react";

import { formatDateTime } from "../license-management.utils";

export function InfoBlock({
  label,
  value,
  isLink = false,
  isDate = false,
}: {
  label: string;
  value?: string | null;
  isLink?: boolean;
  isDate?: boolean;
}) {
  const safe = value?.trim?.() ? value : "";

  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">
        {!safe ? (
          <span className="text-gray-400">--</span>
        ) : isDate ? (
          formatDateTime(safe)
        ) : isLink ? (
          <a
            href={safe}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            {safe}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          safe
        )}
      </div>
    </div>
  );
}
