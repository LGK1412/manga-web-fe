"use client";

import { useEffect, useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { QueueFilters } from "@/components/admin/moderation/queue-filters";
import { ModerationQueuePagination } from "@/components/admin/moderation/queue-pagination";
import { QueueTable } from "@/components/admin/moderation/queue-table";
import type {
  AIStatus,
  ModerationResolutionStatus,
  QueueItem,
} from "@/lib/typesLogs";
import AdminLayout from "@/app/admin/adminLayout/page";
import { fetchQueue } from "@/lib/moderation";

const DEFAULT_PAGE_SIZE = 10;

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export default function ModerationQueuePage() {
  const [filters, setFilters] = useState<{
    search: string;
    status: AIStatus | null;
    resolutionStatus: ModerationResolutionStatus | null;
    riskRange: [number, number];
  }>({
    search: "",
    status: null,
    resolutionStatus: null,
    riskRange: [0, 100],
  });

  const [data, setData] = useState<QueueItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const rows = await fetchQueue({
          status: filters.status,
          limit: 500,
        });
        setData(rows);
      } catch (e: any) {
        setErr(e?.message || "Load queue failed");
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.status]);

  const filteredItems = useMemo(() => {
    const s = filters.search.trim().toLowerCase();

    return data.filter((item) => {
      const title = item.title?.toLowerCase?.() || "";
      const mangaTitle = item.mangaTitle?.toLowerCase?.() || "";
      const author = item.author?.toLowerCase?.() || "";
      const chapterId = item.chapterId?.toLowerCase?.() || "";

      const matchesSearch =
        !s ||
        title.includes(s) ||
        mangaTitle.includes(s) ||
        author.includes(s) ||
        chapterId.includes(s);

      const matchesRisk =
        item.risk_score >= filters.riskRange[0] &&
        item.risk_score <= filters.riskRange[1];

      const matchesResolution =
        !filters.resolutionStatus ||
        item.resolution_status === filters.resolutionStatus;

      return matchesSearch && matchesRisk && matchesResolution;
    });
  }, [data, filters]);

  const sortedItems = useMemo(() => {
    const activeSort = sorting[0];
    if (!activeSort) return filteredItems;

    const sorted = [...filteredItems];

    sorted.sort((left, right) => {
      let comparison = 0;

      switch (activeSort.id) {
        case "title":
          comparison = compareText(left.title, right.title);
          break;
        case "mangaTitle":
          comparison = compareText(left.mangaTitle, right.mangaTitle);
          break;
        case "author":
          comparison = compareText(left.author, right.author);
          break;
        case "risk_score":
          comparison = left.risk_score - right.risk_score;
          break;
        case "updatedAt":
          comparison =
            new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
          break;
        default:
          comparison = 0;
      }

      return activeSort.desc ? comparison * -1 : comparison;
    });

    return sorted;
  }, [filteredItems, sorting]);

  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedItems]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.search,
    filters.status,
    filters.resolutionStatus,
    filters.riskRange,
    pageSize,
    sorting,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span>Moderation</span>
          <span>/</span>
          <span className="text-foreground">Queue</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Moderation Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading queue..."
                : totalItems > 0
                ? `${totalItems} chapters match the current queue filters`
                : "No chapters match the current queue filters"}
            </p>
            {err && (
              <p className="text-sm text-red-600 mt-2">
                {err}
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-muted/40 px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Queue order
            </p>
            <p className="text-sm font-medium">Pending review first</p>
            <p className="text-xs text-muted-foreground">
              Default order follows the moderation queue. Click sortable columns to override it on
              this page.
            </p>
          </div>
        </div>

        <QueueFilters
          onFiltersChange={(nextFilters) => {
            setFilters(nextFilters);
            setPage(1);
          }}
        />

        <QueueTable
          items={paginatedItems}
          loading={loading}
          sorting={sorting}
          onSortingChange={setSorting}
        />

        {!loading && totalItems > 0 ? (
          <ModerationQueuePagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            visibleCount={paginatedItems.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </div>
    </AdminLayout>
  );
}
