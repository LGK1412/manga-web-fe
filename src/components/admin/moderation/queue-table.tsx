"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RiskMeter } from "./risk-meter";
import { StatusBadge } from "./status-badge";
import type { QueueItem } from "@/lib/typesLogs";
import { Eye, Mail } from "lucide-react";

interface QueueTableProps {
  items: QueueItem[];
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  loading?: boolean;
}

export function QueueTable({
  items,
  selectedIds,
  allVisibleSelected,
  onToggleSelect,
  onToggleSelectAll,
  loading,
}: QueueTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="w-12">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
                disabled={loading || items.length === 0}
                aria-label="Select all visible chapters"
              />
            </TableHead>
            <TableHead>Chapter</TableHead>
            <TableHead>Manga</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Risk Score</TableHead>
            <TableHead>AI Status</TableHead>
            <TableHead>Labels</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading &&
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`loading-${index}`}>
                <TableCell>
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="ml-auto h-8 w-20 rounded bg-muted animate-pulse" />
                </TableCell>
              </TableRow>
            ))}

          {!loading &&
            items.map((item, index) => (
              <TableRow
                key={`${item.chapterId || "row"}-${index}`}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() =>
                  router.push(`/admin/moderation/workspace?chapterId=${item.chapterId}`)
                }
              >
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="align-middle"
                >
                  <Checkbox
                    checked={selectedIds.has(item.chapterId)}
                    onCheckedChange={() => onToggleSelect(item.chapterId)}
                    aria-label={`Select chapter ${item.title}`}
                  />
                </TableCell>

                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <p className="line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {item.chapterId}
                    </p>
                  </div>
                </TableCell>

                <TableCell>{item.mangaTitle}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p>{item.author}</p>
                    {item.authorEmail && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.authorEmail}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell className="min-w-[180px]">
                  <RiskMeter score={item.risk_score} />
                </TableCell>

                <TableCell>
                  <StatusBadge status={item.ai_status ?? "AI_PENDING"} />
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.labels.slice(0, 2).map((label) => (
                      <span
                        key={`${item.chapterId}-${label}`}
                        className="rounded-full bg-muted px-2 py-1 text-xs"
                      >
                        {label}
                      </span>
                    ))}
                    {item.labels.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{item.labels.length - 2}
                      </span>
                    )}
                    {item.labels.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(item.updatedAt).toLocaleString()}
                </TableCell>

                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/moderation/workspace?chapterId=${item.chapterId}`}>
                      <Button size="sm" variant="ghost" title="Open workspace">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>

                    <Link href={`/admin/notifications/send-policy?chapterId=${item.chapterId}`}>
                      <Button size="sm" variant="ghost" title="Send policy notification">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-12 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium">No chapters match the current filters</p>
                  <p className="text-sm text-muted-foreground">
                    Try widening the risk range or clearing the search and status filters.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}