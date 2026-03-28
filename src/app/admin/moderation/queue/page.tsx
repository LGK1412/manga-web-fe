"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueueFilters } from "@/components/admin/moderation/queue-filters";
import { QueueTable } from "@/components/admin/moderation/queue-table";
import type { AIStatus, QueueItem } from "@/lib/typesLogs";
import AdminLayout from "@/app/admin/adminLayout/page";
import { fetchQueue } from "@/lib/moderation";

export default function ModerationQueuePage() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<{
    search: string;
    status: AIStatus | null;
    riskRange: [number, number];
  }>({
    search: "",
    status: null,
    riskRange: [0, 100],
  });

  const [data, setData] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const rows = await fetchQueue(
          filters.status ? { status: filters.status } : undefined
        );
        setData(rows);
      } catch (e: any) {
        setErr(e?.message || "Load queue failed");
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

      const matchesStatus =
        !filters.status || item.ai_status === filters.status;

      return matchesSearch && matchesRisk && matchesStatus;
    });
  }, [data, filters]);

  useEffect(() => {
    const visibleIds = new Set(filteredItems.map((item) => item.chapterId));

    setSelectedItems((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      const same =
        next.size === prev.size && [...next].every((id) => prev.has(id));

      return same ? prev : next;
    });
  }, [filteredItems]);

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedItems.has(item.chapterId));

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);

      if (checked) {
        filteredItems.forEach((item) => next.add(item.chapterId));
      } else {
        filteredItems.forEach((item) => next.delete(item.chapterId));
      }

      return next;
    });
  };

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
              {loading ? "Loading queue..." : `${filteredItems.length} of ${data.length} items`}
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
            <p className="text-sm font-medium">Highest risk first</p>
            <p className="text-xs text-muted-foreground">
              Latest updates are prioritized inside the same risk level
            </p>
          </div>
        </div>

        <QueueFilters onFiltersChange={setFilters} />

        {selectedItems.size > 0 && (
          <Card className="p-4 border-blue-200 bg-blue-50/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-blue-700/80">
                  Selection is synced with the visible queue results.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedItems(new Set())}
              >
                Clear selection
              </Button>
            </div>
          </Card>
        )}

        <QueueTable
          items={filteredItems}
          selectedIds={selectedItems}
          allVisibleSelected={allVisibleSelected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAllVisible}
          loading={loading}
        />
      </div>
    </AdminLayout>
  );
}
