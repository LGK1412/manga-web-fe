import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  LICENSE_STATUS_META,
  RIGHTS_STATUS_META,
} from "@/lib/story-rights";

import {
  type MangaLicenseStatus,
  type QueueItem,
} from "../license-management.types";
import { formatDateTime } from "../license-management.utils";

type ModerationQueueCardProps = {
  items: QueueItem[];
  total: number;
  queueStart: number;
  queueEnd: number;
  page: number;
  totalPages: number;
  selectedId?: string | null;
  statusFilter: MangaLicenseStatus | "all";
  searchQuery: string;
  loading: boolean;
  onStatusFilterChange: (value: MangaLicenseStatus | "all") => void;
  onSearchQueryChange: (value: string) => void;
  onSelectItem: (itemId: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  getCoverUrl: (coverImage?: string) => string | undefined;
};

export function ModerationQueueCard({
  items,
  total,
  queueStart,
  queueEnd,
  page,
  totalPages,
  selectedId,
  statusFilter,
  searchQuery,
  loading,
  onStatusFilterChange,
  onSearchQueryChange,
  onSelectItem,
  onPreviousPage,
  onNextPage,
  getCoverUrl,
}: ModerationQueueCardProps) {
  const renderFilterButton = (
    label: string,
    value: MangaLicenseStatus | "all",
  ) => {
    const active = statusFilter === value;

    return (
      <button
        key={value}
        onClick={() => onStatusFilterChange(value)}
        className={[
          "rounded-full border px-3 py-1.5 text-sm transition-colors",
          active
            ? "border-black bg-black text-white"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Moderation Queue</CardTitle>
        <CardDescription>
          Showing {queueStart}-{queueEnd} of {total} stories
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {renderFilterButton("All", "all")}
          {renderFilterButton("Pending", "pending")}
          {renderFilterButton("Approved", "approved")}
          {renderFilterButton("Rejected", "rejected")}
          {renderFilterButton("None", "none")}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by title..."
            className="pl-9"
          />
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
              No stories found.
            </div>
          ) : (
            items.map((item) => {
              const licenseMeta = LICENSE_STATUS_META[item.licenseStatus];
              const rightsMeta = RIGHTS_STATUS_META[item.rightsStatus];
              const active = selectedId === item._id;
              const submittedAt = formatDateTime(item.licenseSubmittedAt);
              const coverUrl = getCoverUrl(item.coverImage);

              return (
                <button
                  key={item._id}
                  onClick={() => onSelectItem(item._id)}
                  className={[
                    "w-full rounded-xl border p-3 text-left transition",
                    active
                      ? "border-black bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md border bg-gray-100">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="line-clamp-2 text-sm font-medium">
                        {item.title}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge className={`border ${licenseMeta.className}`}>
                          {licenseMeta.label}
                        </Badge>
                        <Badge className={`border ${rightsMeta.className}`}>
                          {rightsMeta.label}
                        </Badge>
                        {item.verifiedBadge ? (
                          <Badge className="border border-green-200 bg-green-50 text-green-700">
                            Verified
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{item.originType}</span>
                        <span>/</span>
                        <span>{item.monetizationType}</span>
                        <span>/</span>
                        <span>{item.rightsBasis}</span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {submittedAt
                          ? `Submitted ${submittedAt}`
                          : "No submission timestamp"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1 || loading}
              onClick={onPreviousPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page >= totalPages || loading}
              onClick={onNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
